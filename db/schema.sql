-- Purview canonical schema. Postgres + ltree (docs/spec/purview-spec.md §1, §6).
--
-- The v0 server runs on an in-memory store behind the same Store interface;
-- this file is the durable target that store will be swapped for. Materialised
-- path over ltree, not recursive CTEs: altitude queries must be one indexed
-- scan because fan-out produces deep, wide trees at machine speed.

CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE principals (
  id               text PRIMARY KEY,          -- pr_<hex>
  kind             text NOT NULL CHECK (kind IN ('human', 'agent', 'service')),
  display_name     text NOT NULL,
  delegated_by     text REFERENCES principals (id),
  delegation_depth integer NOT NULL DEFAULT 0 CHECK (delegation_depth <= 8),
  capabilities     jsonb NOT NULL DEFAULT '[]',
  attention        jsonb,                     -- AttentionProfile, humans only
  created_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz                -- kill switch; cascades to delegates in service logic
);

CREATE UNIQUE INDEX principals_display_name_idx ON principals (display_name);

CREATE TABLE work_items (
  id               text PRIMARY KEY,          -- wi_<hex>
  parent_id        text REFERENCES work_items (id),
  root_id          text NOT NULL,             -- denormalised: cheap "all work under this goal"
  path             ltree NOT NULL,            -- e.g. '3f2a.9c11.04d7'
  depth            integer NOT NULL,

  intent           text NOT NULL,             -- immutable
  spec             jsonb,                     -- unused by v1 surfaces (product spec D4)
  labels           text[] NOT NULL DEFAULT '{}',

  owner_id         text REFERENCES principals (id),
  created_by_id    text NOT NULL REFERENCES principals (id),

  state            text NOT NULL CHECK (state IN
    ('proposed','ready','running','blocked','awaiting_approval','done','failed','abandoned')),
  state_reason     text,                      -- required for blocked | failed | abandoned
  rollup           jsonb NOT NULL,            -- derived, cached on write

  blast_radius     text NOT NULL DEFAULT 'none' CHECK (blast_radius IN
    ('none','reversible','costly','irreversible')),
  confidence       double precision CHECK (confidence BETWEEN 0 AND 1),
  priority         double precision NOT NULL DEFAULT 0.5 CHECK (priority BETWEEN 0 AND 1),
  budget           jsonb,                     -- inherited-and-narrowed from parent
  consumed         jsonb NOT NULL DEFAULT '{}',

  artifacts        jsonb NOT NULL DEFAULT '[]',
  provenance       jsonb NOT NULL DEFAULT '[]',

  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  closed_at        timestamptz,
  deadline         timestamptz,

  idempotency_key  text
);

-- The altitude query: WHERE path <@ :root AND depth <= :n in one indexed scan.
CREATE INDEX work_items_path_gist ON work_items USING gist (path);
CREATE INDEX work_items_root_idx ON work_items (root_id);
CREATE INDEX work_items_parent_idx ON work_items (parent_id);
CREATE INDEX work_items_owner_idx ON work_items (owner_id);
CREATE UNIQUE INDEX work_items_idempotency_idx ON work_items (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE transcript_entries (
  id             text PRIMARY KEY,            -- te_<hex>
  work_item_id   text NOT NULL REFERENCES work_items (id),
  seq            integer NOT NULL,            -- monotonic per item
  kind           text NOT NULL CHECK (kind IN
    ('note','state_change','tool_call','artifact','escalation','decision')),
  author_id      text NOT NULL REFERENCES principals (id),
  body           text NOT NULL,
  payload        jsonb,
  context_digest text,                        -- full snapshot lives in blob storage on a retention clock
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_item_id, seq)
);

CREATE TABLE escalations (
  id               text PRIMARY KEY,          -- esc_<hex>
  work_item_id     text NOT NULL REFERENCES work_items (id),
  kind             text NOT NULL CHECK (kind IN ('approval','decision','input','exception')),
  raised_by_id     text NOT NULL REFERENCES principals (id),

  question         text NOT NULL,
  options          jsonb NOT NULL DEFAULT '[]',       -- >= 1 for approval/decision, <= 5
  context_summary  text NOT NULL CHECK (char_length(context_summary) <= 280),

  severity         double precision NOT NULL CHECK (severity BETWEEN 0 AND 1),
  routed_to_id     text REFERENCES principals (id),
  routing          text NOT NULL CHECK (routing IN ('immediate','digest','queued')),

  timeout_at       timestamptz NOT NULL,
  timeout_action   text NOT NULL CHECK (timeout_action IN
    ('abort','proceed','escalate_up','fallback_owner')),

  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  resolved_by_id   text REFERENCES principals (id),
  resolution       text CHECK (resolution IN ('answered','timed_out','withdrawn')),
  chosen_option_id text,
  free_text        text
);

CREATE INDEX escalations_open_idx ON escalations (routed_to_id) WHERE resolved_at IS NULL;
CREATE INDEX escalations_item_idx ON escalations (work_item_id);
