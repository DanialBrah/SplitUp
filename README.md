# SplitUp

A lightweight shared-expense tracker: sign in, create a group, add expenses (split equally, by exact amount, or by percentage), record who paid, see per-member balances and "who owes whom," settle up, and browse a group's spending by category.

Built for the AIngineer take-home assessment. **Tier 1 (Foundation) and Tier 2 (Strong) are both complete** — all four Tier 2 extension options were built (balance summary, settle-up, unequal splits, category breakdown), not just the required one. See [Tier reached & assumptions](#tier-reached--assumptions) for scope details and what's intentionally left out.

## Tech stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **ORM:** Prisma 7, with committed migrations
- **Database:** MySQL (via a local Laragon install) — see [Data model](#data-model) for why
- **Styling:** Tailwind CSS v4
- **Auth:** Auth.js v5 (`next-auth`) — Credentials provider, JWT sessions
- **Validation:** Zod (server-side request parsing)
- **Tests:** Vitest

## Setup & run

Prerequisites: Node.js 22+, a reachable MySQL (or MariaDB) server.

```bash
npm install

# Point at your database and set an auth secret
cp .env.example .env
# edit DATABASE_URL if your MySQL user/password/host/db name differ
# generate a real AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste the output into .env as AUTH_SECRET

# Apply the committed migrations and generate the Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed demo data (4 users, 2 groups, several expenses across all three split
# types, and a settlement)
npx prisma db seed

npm run dev
# open http://localhost:3000 — you'll be redirected to /login
```

**Demo login:** all four seeded users share the password `password123` — `alice@example.com`, `bob@example.com`, `carol@example.com`, or `dave@example.com`.

For active schema development instead of a clean checkout, use `npx prisma migrate dev` — it creates/applies migrations and prompts before resetting.

### Running tests

```bash
npm test
```

45 Vitest cases covering split calculation (equal/exact/percentage), money and percentage parsing, business-rule validation, query parsing, and balance/settle-up math — all pure functions, no database required. See [Testing](#testing) for what's covered and why.

## Data model

`prisma/schema.prisma` defines seven models:

- **User** — id, name, unique email, `passwordHash` (bcrypt).
- **Group** — id, name, optional description.
- **GroupMember** — join table between `Group` and `User`. `@@unique([groupId, userId])` prevents duplicate membership.
- **Expense** — belongs to a `Group`, has a `payer` (`User`), a `description`, an `amountCents`, a `date`, a `category` enum, and a `splitType` enum (`EQUAL`/`EXACT`/`PERCENTAGE`, default `EQUAL`).
- **ExpenseSplit** — one row per member included in an expense's split, with that member's `shareCents` and, for percentage splits only, the original `percentage` (`Decimal(5,2)`, nullable — kept purely so an edited percentage expense can re-populate its form with the numbers the user actually typed; `shareCents` is always the authoritative value everything else reads). `@@unique([expenseId, userId])` prevents a member appearing twice in one split.
- **Settlement** — a direct cash payment between two group members (`fromUserId`, `toUserId`, `amountCents`, `date`, optional `note`) that offsets their outstanding balance.

Deletes cascade downward: deleting a `Group` removes its `GroupMember`/`Expense`/`Settlement` rows; deleting an `Expense` removes its `ExpenseSplit` rows.

**Indexes:** `Expense` has `@@index([groupId, date])` (covers both "list a group's expenses" and "...ordered by date" via leftmost-prefix matching) and `@@index([payerId])`. `Settlement` has `@@index([groupId])`. The `@@unique` constraints above double as their own indexes.

### Money

Amounts are stored as **integer cents** (`amountCents Int`, `shareCents Int`) — never floats. Floating-point dollars break exact-sum guarantees (`0.1 + 0.2 !== 0.3` territory), and this app's core correctness requirement is that split shares reconcile *exactly* to the expense total. Conversion between a dollar string (what the user types) and cents is done with string/regex parsing in `lib/money.ts`, not `parseFloat(x) * 100`, for the same reason — and percentage inputs get the identical treatment (`lib/split.ts`'s `parsePercentageToBasisPoints`, parsing e.g. `"33.34"` to `3334` basis points as a string, never `33.34 * 100`, which is `3334.0000000000005` in real JS).

### Why MySQL, not SQLite

The assessment allows PostgreSQL, MySQL, or SQL Server, with SQLite as a local-dev fallback. This machine already runs MySQL via Laragon, so MySQL was the natural, zero-extra-setup choice — no SQLite substitution was needed.

Two framework-version gotchas worth flagging, both verified against the actually-installed packages rather than assumed:

- This Prisma version's `prisma-client` generator requires an explicit **driver adapter** rather than the older built-in query engine — `@prisma/adapter-mariadb` (see `lib/prisma.ts`).
- Next.js 16 renamed `middleware.ts` to **`proxy.ts`** (same mechanism, new name, now forced onto the Node.js runtime rather than Edge — which conveniently sidesteps the classic "Prisma doesn't run on the Edge runtime" failure mode). Auth route-gating lives in `proxy.ts`, not `middleware.ts`.

### Equal splitting, done correctly

Tier 1 only requires equal splits, but an equal split of an amount that doesn't divide evenly (e.g. $10.00 across 3 people) is common, not an edge case — and Tier 1's own validation rule ("split amounts must add up to the total") only holds if the split math is exact. `lib/split.ts`'s `splitEqually` computes `base = floor(total / n)` and hands the leftover cents out one at a time, so shares always sum exactly to the total (`334 + 333 + 333 = 1000`, not `333 × 3 = 999`).

### Unequal splitting, done correctly

Tier 2's percentage splits reuse the same principle via the **largest-remainder method**: compute each share as `floor(total × percentage)`, then hand the leftover cents to the entries with the largest fractional remainder first. `splitByPercentages(1000, [33.33%, 33.33%, 33.34%])` produces `[333, 333, 334]` — not `[333, 333, 333]`, which would be a cent short. Exact-amount splits are a thin pass-through (the entries already carry their cent amounts); the same `assertSplitSumsToTotal` check validates all three modes identically, as defense-in-depth independent of whichever split function computed the numbers.

## Authentication

Auth.js v5 (`next-auth`) with a **Credentials provider** (email + the shared demo password, checked against a bcrypt hash) and **JWT sessions** — no database session tables needed, since Credentials auth doesn't support Auth.js's database session strategy anyway. `proxy.ts` redirects unauthenticated visitors to `/login`; every API route and every Server Component page *also* independently calls `requireUser()`/`requireGroupMember(groupId)` (see `lib/session.ts`) rather than relying on the proxy alone — Next's own docs call this out explicitly, since Server Components/Actions can be reached directly and a proxy matcher change could silently stop covering a route.

Auth identifies and **authorizes** the session — it deliberately does **not** restrict who can be recorded as an expense's payer. Any group member can still be picked from a dropdown, matching how a real shared-expense app works (you can log an expense that someone else paid for). What auth changes: `/groups` only lists the groups you belong to, creating a group auto-adds you as a member, and every group-scoped API call checks membership first.

One concrete bug this caught during development: once `User.passwordHash` existed as a column, the existing `include: { user: true }` calls in `lib/users.ts`/`lib/groups.ts`/`lib/expenses.ts` would have started shipping the hash to the browser in API responses and RSC payloads. Fixed by switching those to explicit `select`s that list only `id`/`name`/`email` — verified afterward by grepping live API responses and page HTML for the string `passwordHash` and confirming zero hits.

## Server-side querying

`GET /api/groups/[groupId]/expenses` accepts `category`, `payerId`, `dateFrom`/`dateTo`, `sortBy` (`date`/`amount`), `sortDir`, `page`, and `pageSize` — all parsed and validated by `lib/validation/expense-query.ts`, applied via Prisma `where`/`orderBy`/`skip`/`take` (plus a `count`) in `lib/expenses.ts`. Nothing is fetched-then-filtered client-side.

## Settle-up & balances

A `Settlement` records a direct payment between two members. `lib/balances.ts` computes, from plain expense/split/settlement arrays (no Prisma import — fixture-testable): each member's **net balance** (`paid − owed share + settlements made − settlements received`, which always sums to zero across the group) and a **pairwise "who owes whom" ledger** (per-pair net debt, deliberately *not* minimized across chains — e.g. if A owes B and B owes C, this doesn't cancel B out of the loop; that kind of cross-chain debt minimization is a plausible Tier 3 feature, not attempted here). The `/groups/[id]/balances` page shows both, plus a settle-up form and settlement history.

## Category insights

`/groups/[id]/insights` shows a horizontal bar chart of spending by category (`lib/analytics.ts`, via Prisma's `groupBy`). Deliberately a single flat color (no charting library, no per-category rainbow) — magnitude comparison is a sequential/one-hue color job, not a categorical one, since bar *length* already encodes the value and each bar is already directly labeled with its category name, amount, and percentage as text (coloring each bar differently would just re-encode information the chart already shows). A group with only one category in use falls back to a plain sentence instead of rendering a literal one-bar "chart."

## Tier reached & assumptions

**Tier 1 and Tier 2, both complete.** All four Tier 2 extension options were implemented rather than just the required one (spec: "pick one"), since that's what was asked of this build.

Assumptions made where the spec was silent:

- **Auth identifies/authorizes; it doesn't restrict "who paid."** See [Authentication](#authentication) above.
- **Category is a fixed enum** (`FOOD`/`TRANSPORT`/.../`OTHER`) rather than free text, defaulting to `OTHER`.
- **Edits are full-replace (`PUT`), not `PATCH`** — simpler, and every form always submits the complete expense/group state anyway.
- **A group member can't be removed if they already have expenses recorded in that group** (as payer or split participant) — `409 Conflict` rather than silently orphaning data.
- **A group must have at least one member** to be created; creating a group auto-adds the creator.
- **Settlements aren't validated against the outstanding balance** — you can record a settlement larger than what's actually owed (it just flips the pairwise sign). A real product would probably warn on this; kept simple here.
- **"Who owes whom" is pairwise-net, not minimized.** Deliberately not the harder Tier 3 debt-simplification problem.
- **No user registration/password reset** — only the four seeded demo accounts exist, matching the spec's "seeded users with a session is plenty."
- **User CRUD isn't part of the required scope** (only Groups and Expenses are) — users only exist via the seed script.

Left out on purpose (Tier 3, not required to pass):

- Debt-minimizing settlement, role-based permissions, optimistic UI with rollback, a working deployment, a demo video.
- **Database-backed integration tests.** Testing is scoped to pure functions (split/percentage calculation, money parsing, validation rules, query parsing, balance math) — see [Testing](#testing). The API routes, auth gating, and the group-member-removal rule are exercised manually (and were smoke-tested end-to-end against a real database, including live login/session-cookie flows via curl, during development) but have no automated test coverage. A next step here would be a test database with Prisma's `$transaction`-based rollback-per-test pattern.

## Testing

`npm test` runs across `tests/lib/`, mirroring the `lib/` structure, chosen to be "the kind of test that would catch an AI-introduced bug" rather than a wall of trivial ones:

- **`split.test.ts`** — equal splits sum exactly to the total including the deliberate uneven-division case (`[334, 333, 333]`); exact-amount pass-through; percentage splits via the largest-remainder method, including the non-round `33.33/33.33/33.34%` case; a table-driven sum-invariant across several total/count combinations.
- **`validation/expense-rules.test.ts`** — rejects non-positive amounts, a payer outside the group, a splits array off by one cent from the total (the exact scenario the assessment names), a split member outside the group, and percentages that don't sum to 100.
- **`validation/expense-query.test.ts`** — query-param parsing: defaults, empty-string stripping, numeric coercion, array-value handling (Next's `searchParams` shape), rejection of invalid values.
- **`money.test.ts`** — dollar-string-to-cents parsing, rejects malformed/negative input.
- **`balances.test.ts`** — net-balance and pairwise-debt math against a hand-verified worked example (a $20 expense split between two non-payer members, one of whom later settles up), the zero-sum conservation invariant, and a cross-check that the two computations reconcile with each other.

## Working with AI (Section 6)

**Where AI was used:** This project was built with Claude Code end-to-end across both tiers — schema design, API routes, validation, UI, seed script, and tests were all AI-generated, directed through explicit written plans (reviewed and approved before implementation began each time) that named exact files, function signatures, and a phased build order verified incrementally rather than all at once. Product decisions the spec leaves open — money-as-cents, the auth/payer-picker split described above, category as an enum, the member-removal conflict rule, treating "pick one Tier 2 extension" as "build all four" per explicit direction — were made deliberately, not left to fall out of whatever the model generated first.

**One time AI was wrong:** The most natural first-draft implementation of "split N ways" is `shareCents = Math.round(totalCents / n)` applied to every member. For an amount that divides evenly this looks fine, but for `$10.00` across 3 people it produces `333 + 333 + 333 = 999` — one cent short of the total, exactly the bug class the assessment calls out. `lib/split.ts` was written from the start with explicit remainder distribution instead, and the same discipline was carried into the Tier 2 percentage-split math (`splitByPercentages`), which has the same failure mode in a subtler form: multiplying a percentage by a JS float (`33.34 * 100 === 3334.0000000000005`) reintroduces exactly the class of error `dollarsToCents` was written to avoid. Caught by holding every new numeric parser to the same "string-based, never float-multiplied" bar as the original money code, not by discovering it after the fact.

A second, more consequential example surfaced while planning Tier 2's auth: adding `User.passwordHash` would have made every existing `include: { user: true }` call (in `lib/users.ts`, `lib/groups.ts`, `lib/expenses.ts`) start shipping the password hash to the browser — a real, exploitable leak, not a style nit. It was caught during the planning pass (before any code touched the schema) specifically because a planning subagent was asked to trace every place `User` rows get serialized into an API response or a client component prop, rather than only checking that the new auth *feature* worked.

**How the tests guard it:** `assertSplitSumsToTotal` in `lib/validation/expense-rules.ts` runs as defense-in-depth on every create/update, independent of whichever split function computed the numbers — its test directly feeds it a splits array off by one cent and asserts rejection. `tests/lib/split.test.ts` separately asserts the exact `33.33/33.33/33.34%` → `[333, 333, 334]` case by name, so a regression back to float-based percentage math (or naive equal-split rounding) fails immediately rather than shipping a split that doesn't reconcile. The password-hash leak has no dedicated automated test (it's a data-shape property, not a pure function) — it's guarded by the `select`-only pattern itself plus the manual response-grepping described above; a good next step would be a small integration test asserting `passwordHash` never appears in a serialized `User`-bearing API response.
