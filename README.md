# SplitUp

A lightweight shared-expense tracker: create a group, add expenses, record who paid, split each expense equally among selected members, and browse the group's expense history.

Built for the AIngineer take-home assessment. **Tier 1 (Foundation) is complete.** See [Tier reached & assumptions](#tier-reached--assumptions) for scope details and what's intentionally left out.

## Tech stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **ORM:** Prisma 7, with committed migrations
- **Database:** MySQL (via a local Laragon install) — see [Data model](#data-model) for why
- **Styling:** Tailwind CSS v4
- **Validation:** Zod (server-side request parsing)
- **Tests:** Vitest

## Setup & run

Prerequisites: Node.js 22+, a reachable MySQL (or MariaDB) server.

```bash
npm install

# Point at your database
cp .env.example .env
# edit .env if your MySQL user/password/host/db name differ

# Apply the committed migrations and generate the Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed demo data (4 users, 2 groups, a few expenses)
npx prisma db seed

npm run dev
# open http://localhost:3000
```

For active schema development instead of a clean checkout, use `npx prisma migrate dev` — it creates/applies migrations and prompts before resetting.

### Running tests

```bash
npm test
```

22 Vitest cases covering the split calculation, money parsing, and business-rule validation — all pure functions, no database required. See [Testing](#testing) for what's covered and why.

## Data model

`prisma/schema.prisma` defines five models:

- **User** — id, name, unique email.
- **Group** — id, name, optional description.
- **GroupMember** — join table between `Group` and `User` (a group has many members; a user can belong to many groups). `@@unique([groupId, userId])` prevents duplicate membership.
- **Expense** — belongs to a `Group`, has a `payer` (`User`), a `description`, an `amountCents`, a `date`, and a `category` (enum: `FOOD`, `TRANSPORT`, `ACCOMMODATION`, `UTILITIES`, `ENTERTAINMENT`, `SHOPPING`, `OTHER`, default `OTHER`).
- **ExpenseSplit** — one row per member included in an expense's split, with that member's `shareCents`. `@@unique([expenseId, userId])` prevents a member appearing twice in the same split.

Deletes cascade downward: deleting a `Group` removes its `GroupMember` and `Expense` rows; deleting an `Expense` removes its `ExpenseSplit` rows.

**Indexes:** `Expense` has `@@index([groupId, date])` (covers both "list a group's expenses" and "...ordered by date" via leftmost-prefix matching) and `@@index([payerId])`. The two `@@unique` constraints above double as their own indexes.

### Money

Amounts are stored as **integer cents** (`amountCents Int`, `shareCents Int`) — never floats. Floating-point dollars break exact-sum guarantees (`0.1 + 0.2 !== 0.3` territory), and this app's core correctness requirement is that split shares reconcile *exactly* to the expense total. Conversion between a dollar string (what the user types) and cents is done with string/regex parsing in `lib/money.ts`, not `parseFloat(x) * 100`, for the same reason.

### Why MySQL, not SQLite

The assessment allows PostgreSQL, MySQL, or SQL Server, with SQLite as a local-dev fallback. This machine already runs MySQL via Laragon, so MySQL was the natural, zero-extra-setup choice — no SQLite substitution was needed.

One consequence worth flagging: this Prisma version's `prisma-client` generator requires an explicit **driver adapter** rather than the older built-in query engine — `@prisma/adapter-mariadb` (see `lib/prisma.ts`). This is a recent Prisma change, not a product decision, but it's the reason those packages are in `package.json`.

### Equal splitting, done correctly

Tier 1 only requires equal splits, but an equal split of an amount that doesn't divide evenly (e.g. $10.00 across 3 people) is common, not an edge case — and Tier 1's own validation rule ("split amounts must add up to the total") only holds if the split math is exact. `lib/split.ts`'s `splitEqually` computes `base = floor(total / n)` and hands the leftover cents out one at a time, so shares always sum exactly to the total (`334 + 333 + 333 = 1000`, not `333 × 3 = 999`). This is asserted directly in `tests/lib/split.test.ts`.

## Tier reached & assumptions

**Tier 1, complete**, plus a few Tier 2/3-adjacent touches (composite indexes, a seed script) picked up along the way since they were cheap.

Assumptions made where the spec was silent:

- **No authentication in Tier 1** (explicitly optional — Tier 2). Instead, every form picks the payer and group members directly from a seeded list of demo users via checkboxes/dropdowns — there is no "logged in user" concept anywhere. User creation/editing itself is not part of the required CRUD (only Groups and Expenses are), so users only exist via the seed script.
- **Category is a fixed enum** (`FOOD`/`TRANSPORT`/.../`OTHER`) rather than free text, for cleaner typing and easier filtering later, defaulting to `OTHER`.
- **Edits are full-replace (`PUT`), not `PATCH`** — simpler, and Tier 1's forms always submit the complete expense/group state anyway.
- **A group member can't be removed if they already have expenses recorded in that group** (as payer or split participant) — returns `409 Conflict` rather than silently orphaning data. This is the one non-trivial business rule that isn't unit-tested (it's DB-aware; see below).
- **A group must have at least one member** to be created.

Left out on purpose (Tier 2/3, not required to pass):

- Authentication, server-side filtering/sorting/pagination, balances/"who owes whom", settle-up, unequal splits, deployment. None were started, to keep Tier 1 solid rather than sprawling.
- **Database-backed integration tests.** Testing is scoped to pure functions (split calculation, money parsing, validation rules) — see [Testing](#testing). The API routes and the group-member-removal rule above are exercised manually (and were smoke-tested end-to-end against a real database during development) but have no automated test coverage. A next step here would be a test database with Prisma's `$transaction`-based rollback-per-test pattern.

## Testing

`npm test` runs three files, chosen to be "the kind of test that would catch an AI-introduced bug" rather than a wall of trivial ones:

- **`tests/lib/split.test.ts`** — even splits divide correctly; **`splitEqually(1000, [a,b,c])` produces `[334, 333, 333]`, summing exactly to 1000** (the deliberate uneven-division case); a table-driven loop asserts the sum-invariant holds across several total/member-count combinations.
- **`tests/lib/validation/expense-rules.test.ts`** — rejects non-positive amounts; rejects a payer who isn't a group member; **rejects a splits array that's off by one cent from the total** (the exact scenario the assessment names: "a split that doesn't sum to the total"); rejects a split member outside the group.
- **`tests/lib/money.test.ts`** — dollar-string-to-cents parsing is correct and rejects malformed/negative input.

## Working with AI (Section 6)

**Where AI was used:** This project was built with Claude Code end-to-end — schema design, API routes, validation, UI, seed script, and tests were all AI-generated, directed through an explicit plan (data model → migrations → pure `lib/` logic + tests → DB-aware modules → API routes → seed → UI → manual end-to-end smoke test → this README) that I reviewed and approved before implementation began. I made the product calls the spec leaves open (money-as-cents, no-auth explicit-picker UX, category as an enum, the member-removal conflict rule) rather than letting those decisions get made implicitly.

**One place AI could easily have been wrong:** The most natural first-draft implementation of "split N ways" is `shareCents = Math.round(totalCents / n)` applied to every member. For an amount that divides evenly this looks fine, but for `$10.00` across 3 people it produces `333 + 333 + 333 = 999` — one cent short of the total. That's precisely the bug class the assessment calls out ("a split that doesn't sum to the total"), so `lib/split.ts` was written from the start with explicit remainder distribution (`base = floor(total/n)`, then hand out the leftover cents one at a time) instead, and `tests/lib/split.test.ts` asserts the $10/3-way case by name plus a sum-invariant across several other total/count pairs — so if this were ever "simplified" back to naive rounding, the test fails immediately rather than silently shipping a split that doesn't reconcile.

**How the tests guard it:** `assertSplitSumsToTotal` in `lib/validation/expense-rules.ts` is run as defense-in-depth on every create/update, independent of `splitEqually` itself — its test (`tests/lib/validation/expense-rules.test.ts`) directly feeds it a splits array that's off by one cent and asserts it's rejected. So there are two independent layers that would both have to fail for a non-reconciling split to reach the database: the split calculation itself, and the validation that checks its output.
