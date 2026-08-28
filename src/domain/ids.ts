import { randomBytes } from 'node:crypto';

export type IdPrefix = 'pr' | 'wi' | 'esc' | 'te';

/** Prefixed random id, e.g. `wi_3f2a9c11`. */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

/** One materialised-path segment, e.g. `3f2a`. Paths look like `3f2a.9c11.04d7`. */
export function newPathSegment(): string {
  return randomBytes(2).toString('hex');
}
