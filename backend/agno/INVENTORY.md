# Copied Agno framework inventory

This inventory records the state of the analytics code copied from another project before Sejuk Ops adaptation.

## Disposition

| Area | Disposition | Reason |
| --- | --- | --- |
| `legacy/project_management_core/skills/aggregation.py` | Candidate to adapt | Contains reusable aggregation-grain validation without requiring unrestricted database access. |
| `legacy/project_management_core/report_document.py` and reporting/visualization helpers | Candidate to adapt | Presentation and report composition can operate on authorized typed evidence. |
| `legacy/agents/*routing.py` | Candidate to adapt | Intent-routing ideas are useful after removing dataset/project assumptions. |
| `legacy/agents/base.py` | Replace | Coupled to missing settings, observability, and usage modules from the previous application. |
| `legacy/agents/coordinator.py` and role agents | Replace or heavily adapt | Assume Data-Berge projects, datasets, artifacts, and unavailable services. |
| `legacy/adapters/local_runtime.py` | Remove after migration | Imports the former local database, object store, generated SQL engine, and chat workflow. |
| `legacy/adapters/project_management_toolkit.py` | Remove after migration | Exposes arbitrary dataset SQL and former-project artifact operations. |
| Project/dataset/artifact memory contracts | Do not expose | Do not match Sejuk's identity, order, document, or authorization model. |

## Missing application modules

The copied files reference unavailable modules under `app.settings`, `app.services` (query engine, profiling, files, connectors, data engineering, LLM usage/observability), `app.storage` (database and object store), and `app.workflows.chat_workflow`.

They also import the former package name `data_berge_core`; the copied directory was named `project_management_core`, so it was not importable as copied.

## External packages observed

- Agno and an OpenAI-compatible model adapter
- Pydantic
- pandas
- Former application storage/query/file dependencies that were not copied

## Security decision

Legacy code is quarantined under `legacy/` and is excluded from the installed Python package. In particular, `execute_dataset_sql` is not reachable from the Sejuk application. Reusable pure logic will be ported into `src/sejuk_assistant` only after it accepts typed, authorized evidence rather than project ids, dataset ids, file paths, or SQL.

