import { defineConfig } from 'vitest/config';

/**
 * Two projects, one `vitest run`. `pnpm test` is what .claude/scripts/gates.sh
 * invokes and there is no CI in this repo, so putting integration behind a
 * separate script would produce a suite that gates nothing.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.integration.test.ts'],
          // Real sockets and real escalation timers: no fake timers anywhere
          // in this project, and one file at a time so ports and the shared
          // event loop are not contended.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
    ],
  },
});
