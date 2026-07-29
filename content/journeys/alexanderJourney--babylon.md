---
_ignore: true
_reason: >
  Orphaned artefact from an early migration-script bug: the "babylon"
  id is legitimately reused by two different alexanderJourney stops
  (Alexander passes through Babylon on the way out and again, dying
  there, on the return march), so filing by `id` alone collided and
  one write clobbered the other. Fixed by filing journeys by `key`
  instead (see alexanderJourney--alexander-babylon-entry.md and
  alexanderJourney--alexander-babylon-return.md, which hold the real,
  distinct content). This file is inert and excluded by the compiler
  (see the `_ignore` check in scripts/compile-content.mjs) — kept
  rather than deleted only because this filesystem mount doesn't
  permit deleting or renaming files.
---
