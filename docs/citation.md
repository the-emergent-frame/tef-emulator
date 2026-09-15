# Citation and research provenance

TEF Emulator is experimental research software. Its current implementation
provides a runnable scaffold and engineering controls; it has not established
an independent physical finding. Archiving a software version records an
artifact and its provenance, not evidence that its physical model is validated.

## What to cite

- For a theoretical claim, cite the relevant TEF paper and the version used.
- For results produced using the emulator, also cite the software release used.
  Prefer its version-specific Zenodo DOI; for an unarchived development build,
  identify the repository and exact commit.
- Listing eight papers as background does not ask users to cite all eight.
  Select the papers relevant to the method or claim being discussed.

Keep the software as the root citation in `CITATION.cff`. Do not set a
`preferred-citation` to a theory paper: the present papers are theoretical
background, not publications reporting this software's results. Reconsider
citation guidance if a dedicated software or results paper is published.

## Where information lives

| Record | Responsibility |
| --- | --- |
| `CITATION.cff` | Software metadata and a version-pinned bibliography of its research background |
| TEF `research-releases` repository | Published paper titles, author metadata, versions, and DOIs used to check bibliography entries |
| `rules/<version>/README.md` | Exact paper sections or equations used by a rule; explicit separation of inherited assumptions, new hypotheses, and numerical choices |
| Experiment specification and run artifact | Question, rule version, engine commit, configuration, controls, observations, and limitations |

The eight papers are retained as the framework bibliography. Each CFF reference
has a `scope` explaining its current relationship to the software. Papers IV,
VI, and VII supply the immediate matter/space-interface and rollout context;
Paper VIII v3.12 is the canonical conceptual reference for the intrinsic relational
representation and current observer terminology. Its conditional K_perp / product
construction is not numerically implemented. Papers I, II, III, and V are broader
framework background. The current kernel
does not implement the eight papers' quantitative constructions. Its independent
channels, transfer weight, and phase increment remain candidate scaffold rules.

## Updating the records

1. When adopting a paper revision, verify its title, author, version, and DOI
   against the corresponding paper metadata in `research-releases`. Update its
   reference and affected rule documentation together. Do not automatically
   replace a pinned reference merely because a newer paper exists.
2. For a new rule, name the source paper version and relevant section/equation,
   or explicitly identify the rule as a new proposal. Preserve the references
   needed to interpret older versioned rules and experiments.
3. Before a software release, align the CFF version with `Cargo.toml`, verify
   authorship and license metadata, and set the actual release date. Keep
   unassigned DOI/date fields absent rather than inserting placeholders.
4. After Zenodo assigns a DOI, record it with its correct scope. A root `doi`
   must identify the software version named in the file; remove or replace it
   when that version changes. A concept DOI, if recorded, belongs in
   `identifiers` with an explicit all-versions description. Paper DOIs belong
   only in their reference entries.
5. Parse the CFF as YAML, check its required fields and version consistency,
   and compare changed paper entries with their archived metadata. Validate
   against the CFF schema when introducing unfamiliar fields. Metadata-only
   edits do not require simulation runs or a new software version by themselves.

Maintain one software metadata source in `CITATION.cff`. Introduce a separate
`.zenodo.json` only if a concrete Zenodo-specific requirement warrants the extra
maintenance. Keep published release records and their historical references
intact; changes on the development branch describe subsequent work.
