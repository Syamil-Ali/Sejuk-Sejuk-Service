# Code-debt report audit

Source report: `codedebt-sejuk-frontend.json`, generated 14 August 2026.

## Summary

The report contains 1,216 findings with a score of 3,767. That score is not a reliable count of actionable debt because several rules do not understand this repository's generated files, TypeScript type imports, React conventions, tests, regular expressions, or streaming code.

### Predominantly non-actionable groups

- 732 `magic_number` findings: most are HTTP status codes, dates, currency fixtures, CSS dimensions, IP addresses, URL escapes, and numbers inside regular expressions. Naming all of these would reduce readability.
- 125 five-line duplicate-block findings: many occur in test fixtures, generated Supabase types, or structurally similar JSX that has different domain ownership.
- 76 inline JSX handler and 16 unstable-prop findings: inline handlers are not inherently a performance issue unless a measured memoized child or effect depends on referential identity.
- 63 missing-JSDoc findings: the project does not require JSDoc on every small local function; types and focused names are the established convention.
- 11 layer violations: the scanner treats every file under `src/lib` as a utility layer, while this project intentionally uses `lib` for domain policies, repositories, adapters, and generated database types.
- 6 dead type-import findings: all six imports are referenced by TypeScript annotations and are not dead.
- Sequential stream reads in the assistant and sequential UI actions in Playwright are required for correctness; converting them to `Promise.all` would be wrong.

### Valid findings addressed

- Removed the hardcoded assessment-account password from application source and moved configuration to the ignored environment file.
- Added explicit length limits to search, messages, announcements, order inputs, checklist titles/notes, completion notes, and reschedule reasons. Matching Zod limits now protect order and completion payloads server-side.
- Replaced serial evidence uploads with a bounded parallel batch; evidence validation already limits a batch to six files.
- Extracted assistant structured-result rendering into `features/assistant`.
- Extracted and tested assistant SSE parsing and aggregation in `lib/assistant-stream`.
- Extracted the payment dialog and payment history from the route into `features/payments`.
- Added named evidence-size and evidence-count limits.

### Valid remaining debt

- `DemoProvider` is still too large and owns unrelated order, payment, checklist, review, notification, and communication mutations. It should be split incrementally behind the unchanged context API, with reducer/action tests before each move.
- `ServiceChecklist` and the communications thread are still large interactive components. Their state machines should be extracted before further visual changes.
- The demo fallback in `lib/assistant.ts` contains substantial intent-routing complexity. It is separate from the production Agno flow but should be decomposed if demo mode remains a supported product path.
- Generated `database.types.ts`, seed data, and test fixtures are large by nature. They should be excluded from line-count and duplication gates rather than manually fragmented.

## Recommended scanner policy

Exclude generated files, `.next`, test fixtures, seed data, and `next-env.d.ts`; ignore numeric-literal checks in tests, CSS utilities, URLs, and regular expressions; recognize `import type` usage; and set complexity thresholds separately for React components, data factories, and pure functions.
