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

Run the audit with (or run `npm test`, which includes it):

```sh
node scripts/validate-content.mjs
```

The validator is deliberately strict about the common floor and deliberately
silent about maximum length. Major entries should exceed the baseline whenever
the evidence supports a richer account.

## The full standard (in-depth entries)

An entry opts in with `standard: full` in its frontmatter. `npm test` then requires:

- at least 8 claims, 5 sources and 5 `## ` sections in the body;
- a `cite` on every claim whose confidence is `established` or `strong`;
- `identification` entries with a question and at least two positions.

Other entries are unaffected; the test run prints how many claims carry a citation so
progress can be tracked. We do not back-fill citations from memory. A claim gets a `cite`
only when the passage has been read.

### Per-claim citations

```yaml
claims:
  - text: Both Linear A and Linear B tablets were excavated at Knossos.
    evidence: epigraphic
    confidence: established
    cite:
      - { src: evans1921, loc: "vol. 4, p. 1" }   # src must be in the entry's `sources`
```

`loc` is optional but should be given whenever the location is known (page, section, line,
inscription or accession number).

### Optional depth fields (places and other entries)

| Field | Shape | Purpose |
|---|---|---|
| `occupied` | `{ text }` | Occupation span as scholars give it |
| `fieldwork` | `[{ who, years }]` | Missions and directors |
| `heldIn` | `[string]` | Where the main finds are held |
| `excavationStatus` | string | e.g. "Ongoing" |
| `identification` | `[{ question, positions: [{ view, by, cite }] }]` | Rival identifications, stated side by side |
| `chronologyNotes` | `[{ text, cite }]` | Where scholars date things differently |
| `visiting` | string | Practical note for visitors |

### Headed sections in the body

Start a line with `## Heading` inside the `body` field to create a named section with its
own anchor and table-of-contents entry. Text before the first heading is the overview.

### Source records

New optional fields on `content/sources/*.md`: `doi` (e.g. `10.1017/...`), `access`
(`open`, `paywalled` or `print`), and `undated: true` for web pages with no stated date.
Every modern source needs a numeric `year` or `undated: true`.
