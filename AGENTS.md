# Architecture Rules

- API layers: routes (HTTP + Zod validation) -> services (business rules) -> db (plain SQL via pg, parameterized only). No ORM, no extra layers.
- All money in bigint minor units plus currency code. IDs are bigint, sent as strings in JSON.
- Migrations are plain numbered SQL files in db/migrations that I run manually. Never run migrations or touch a database.
- Mobile-first UI.
- Work one small feature at a time, write tests for changed behavior, stop at the end of each phase.
- Do not add dependencies without telling me name, version, and reason.
