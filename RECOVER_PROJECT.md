# DANIÉLOU — PROJECT RECOVERY ENTRY POINT

## New agent or lost context?

If you have no reliable previous context for this project:

**DO NOT START CODING.**

The repository and its continuity records are the durable project
memory. Previous conversation memory is not a source of truth.

---

## 1. If the repository is already available

Start here.

Read:

`docs/CONTINUITY.md`

Then inspect only the current checkpoint/worklog and the documents it
references.

---

## 2. If the repository is NOT available

Clone it:

```bash
git clone https://github.com/alexkanga/danielou.git
cd danielou
```

You will need a GitHub token for this private repository.

Then go to section 1.

---

## 3. Environment secrets

The project requires secrets that are not in the repository.

A recovery file containing all required secrets should exist outside
the repository. If provided, source it into your environment.

Without these secrets the application cannot start and migrations
cannot run.

---

## 4. Verify the environment works

```bash
pnpm install
pnpm typecheck
pnpm test
```

If these pass, the environment is functional.

---

## 5. Determine the next action

Read `docs/CONTINUITY.md` for the current project phase, what has been
accomplished, and what is pending.

The worklog (if present) contains the semantic history of work done.

Do not assume previous conversation context. Only the repository and
its continuity documents are authoritative.

---

## Architecture

- **This file** — stable bootstrap entry point. Rarely needs updating.
- **docs/CONTINUITY.md** — evolving project state, milestones, and
  operational knowledge.
- **worklog** — chronological record of agent work sessions.
- **Git history** — durable code and document history.
- **PostgreSQL** — ground truth for database state when DB verification
  is required.
