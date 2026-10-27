# LangChain integration (placeholder)

Reserved for future AI orchestration with **LangChain.js**. Nothing here is
implemented yet: no model provider, no API keys, no outbound LLM calls, and no
LangChain dependency in `package.json`.

## Intended responsibilities

- **Orchestration** – chains/graphs that turn a student's artifact (problem spec,
  pseudocode, code revision) into feedback or a scaffolded hint.
- **Provider adapters** – a thin interface over the chosen LLM provider so the
  provider can be swapped or mocked in tests.
- **Structured outputs** – responses parsed against zod schemas, never free text
  that other code has to guess at.
- **Retries and timeouts** – bounded retries with backoff and a hard per-call
  timeout so a slow provider cannot hang a request.
- **Application-controlled pedagogical policies** – the scaffold level, what may
  be revealed, and routing between cases are decided by application code and
  rubric data, not by the model.

## Boundaries

- Services call this module through a small interface; controllers never import it.
- It reads the data it needs from services/repositories passed in by the caller
  and does not touch Prisma directly.
- Code executed in the browser (Pyodide results) is client-reported; treat it as
  unverified input when it is used as evidence.
- Until this is built, the web app's assistant is a clearly labelled mock.
