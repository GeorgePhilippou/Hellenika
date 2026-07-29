# Editorial content standard

Hellenika entries should be comparable in editorial completeness without being
forced into identical lengths. A battle, a deity and a three-thousand-year
period require different structures. The shared baseline is therefore based on
what a reader can learn and verify, rather than one universal word count.

Every published entity must provide:

- a clear summary of at least 12 words;
- at least 90 words of substantive narrative;
- at least three individually evidence-tagged claims;
- at least two bibliography entries;
- at least two authored connections to other entities.

For myth and deity pages, “narrative” is the combined content of the myth,
earliest source, religious role, historical background, archaeology and later
interpretation registers. Keeping these registers separate is more important
than making them equal in length.

The numerical floor is a safeguard, not a definition of quality. Editors must
also:

- distinguish direct evidence, modern interpretation and unresolved debate;
- avoid filling genuine gaps with invented precision;
- explain why the subject matters, not only what happened;
- identify later names, reconstructions and traditions as such;
- prefer specific scholarly works over a single general reference;
- connect places to events, people, objects and political contexts where the
  dataset supports those relationships.

Run the audit with:

```sh
/Users/georgephilippou/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/validate-content.mjs
```

The validator is deliberately strict about the common floor and deliberately
silent about maximum length. Major entries should exceed the baseline whenever
the evidence supports a richer account.
