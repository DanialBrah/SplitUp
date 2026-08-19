# SplitUp

A lightweight shared-expense tracker: sign in, create a group, add expenses (split equally, by exact amount, or by percentage), record who paid, see per-member balances and "who owes whom" (with a one-click debt-simplification suggestion), settle up, and browse a group's spending by category.

Built for the AIngineer take-home assessment. **Tier 1 (Foundation), Tier 2 (Strong), and Tier 3 (Standout) are all complete** — every extension option offered at each tier was built rather than just the required one (Tier 2: balance summary, settle-up, unequal splits, category breakdown; Tier 3: debt-minimizing settlement, role-based permissions, optimistic UI with rollback). The only things intentionally left out are a deployed instance and a demo video. See [Tier reached & assumptions](#tier-reached--assumptions) for full scope details and what's intentionally left out.

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

**Demo login:** all four seeded users share the password `password123` — `alice@example.com`, `bob@example.com`, `carol@example.com`, or `dave@example.com`. Alice is seeded as the admin of both groups; the rest are regular members (see [Role-based permissions](#role-based-permissions)).

For active schema development instead of a clean checkout, use `npx prisma migrate dev` — it creates/applies migrations and prompts before resetting.

### Running tests

```bash
npm test
```

58 Vitest cases covering split calculation (equal/exact/percentage), money and percentage parsing, business-rule validation, query parsing, balance/settle-up math (including debt simplification), and the last-admin-guard predicate — all pure functions, no database required. See [Testing](#testing) for what's covered and why.

## Data model

`prisma/schema.prisma` defines seven models:

- **User** — id, name, unique email, `passwordHash` (bcrypt).
- **Group** — id, name, optional description.
- **GroupMember** — join table between `Group` and `User`, carrying a `role` (`ADMIN`/`MEMBER`, see [Role-based permissions](#role-based-permissions)). `@@unique([groupId, userId])` prevents duplicate membership.
- **Expense** — belongs to a `Group`, has a `payer` (`User`), a `description`, an `amountCents`, a `date`, a `category` enum, and a `splitType` enum (`EQUAL`/`EXACT`/`PERCENTAGE`, default `EQUAL`).
- **ExpenseSplit** — one row per member included in an expense's split, with that member's `shareCents` and, for percentage splits only, the original `percentage` (`Decimal(5,2)`, nullable — kept purely so an edited percentage expense can re-populate its form with the numbers the user actually typed; `shareCents` is always the authoritative value everything else reads). `@@unique([expenseId, userId])` prevents a member appearing twice in one split.
- **Settlement** — a direct cash payment between two group members (`fromUserId`, `toUserId`, `amountCents`, `date`, optional `note`) that offsets their outstanding balance.

Deletes cascade downward: deleting a `Group` removes its `GroupMember`/`Expense`/`Settlement` rows; deleting an `Expense` removes its `ExpenseSplit` rows.

**Indexes:** `Expense` has `@@index([groupId, date])` (covers both "list a group's expenses" and "...ordered by date" via leftmost-prefix matching), plus `@@index([groupId, category])` and `@@index([groupId, payerId])` for the category/payer filters `GET /api/groups/[groupId]/expenses` supports, plus a lone `@@index([payerId])` — kept alongside the composite one because MySQL requires an index with the foreign-key column as its *leftmost* member to support `Expense`'s FK to `User.id` via `payerId`, and `(groupId, payerId)` doesn't qualify since `payerId` isn't leftmost there (confirmed the hard way: MySQL rejected dropping it as "needed in a foreign key constraint"). `Settlement` has `@@index([groupId])`. `GroupMember` and `ExpenseSplit` each add `@@index([userId])` alongside their `@@unique` constraints (which double as their own indexes), covering "which groups is this user in" / "which expenses does this user have a share in."

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

Auth.js v5 (`next-auth`) with a **Credentials provider** (email + the shared demo password, checked against a bcrypt hash) and **JWT sessions** — no database session tables needed, since Credentials auth doesn't support Auth.js's database session strategy anyway. `proxy.ts` redirects unauthenticated visitors to `/login`; every API route and every Server Component page *also* independently calls `requireUser()`/`requireGroupMember(groupId)`/`requireGroupAdmin(groupId)` (see `lib/session.ts`) rather than relying on the proxy alone — Next's own docs call this out explicitly, since Server Components/Actions can be reached directly and a proxy matcher change could silently stop covering a route.

Auth identifies and **authorizes** the session — it deliberately does **not** restrict who can be recorded as an expense's payer. Any group member can still be picked from a dropdown, matching how a real shared-expense app works (you can log an expense that someone else paid for). What auth changes: `/groups` only lists the groups you belong to, creating a group auto-adds you as a member (as its admin — see [Role-based permissions](#role-based-permissions)), and every group-scoped API call checks membership first.

One concrete bug this caught during development: once `User.passwordHash` existed as a column, the existing `include: { user: true }` calls in `lib/users.ts`/`lib/groups.ts`/`lib/expenses.ts` would have started shipping the hash to the browser in API responses and RSC payloads. Fixed by switching those to explicit `select`s that list only `id`/`name`/`email` — verified afterward by grepping live API responses and page HTML for the string `passwordHash` and confirming zero hits.

## Role-based permissions

Every `GroupMember` row carries a `role`: `ADMIN` or `MEMBER`. Renaming or deleting a group, editing its membership list, and deleting the group entirely are **admin-only** (`requireGroupAdmin` in `lib/session.ts`, enforced in `PUT`/`DELETE /api/groups/[groupId]` and in the `/groups/[id]/edit` page); day-to-day actions — adding expenses, recording settlements, viewing balances/insights — stay open to any member, since restricting those would fight how a shared-expense group actually gets used (anyone should be able to log a purchase or a payment).

A non-admin hitting an admin-only route gets a `403` with the message "Only a group admin can do this"; a non-member gets "You are not a member of this group." For the API these surface as JSON error bodies. For the `/edit` page specifically, this is caught **inline** rather than left to bubble up to Next's generic `error.tsx` boundary — that boundary is hardcoded to a generic "Something went wrong" message with no path for a specific `error.message` to reach the user, so a thrown 403 there would render as an unhelpful crash screen instead of the plain "Not allowed" message the page shows instead.

`createGroup` sets the creating user's membership row to `ADMIN` and every other initial member to `MEMBER`. There's no `Group.creatorId` column — group creation has always been pure runtime logic, never persisted — so the migration that added `role` couldn't reconstruct "who created each existing group." The honest backfill for local/dev data was to promote every pre-existing membership to `ADMIN`, so no group created before this feature existed gets locked out; every group created after it gets exactly one real admin from `createGroup`.

Three places independently guard against a group ending up with zero admins — `updateGroup` (editing the member list can implicitly demote-by-removal), `updateMemberRole` (explicitly demoting someone), and `removeMember` (removing someone outright) — all `409 Conflict`, "A group must always have at least one admin." Rather than duplicate that filter-and-count logic three times, all three call the same pure predicate, `wouldLeaveNoAdmins` in `lib/group-roles.ts` (no Prisma import, unit-tested directly — see [Testing](#testing)), each supplying whatever member list and affected-user-IDs shape it already has on hand.

### Managing membership

`/groups/[id]/members` lists every member with an Admin/Member badge. For admins it also shows, per row, **"Promote to admin" / "Demote to member"** (`PATCH /api/groups/[groupId]/members/[userId]`, `components/MemberRoleButton.tsx`) and **"Remove"** (`DELETE` on the same route, with a confirm dialog, `components/RemoveMemberButton.tsx`), plus an **"Add member"** search-and-add control below the list (`POST /api/groups/[groupId]/members`, `components/AddMemberForm.tsx`) scoped to users not already in the group. All four actions are admin-gated via `requireGroupAdmin` at the API layer, independent of the buttons only being rendered for admins client-side. Removing a member reuses the same "can't remove someone with expenses on record" guard `updateGroup` already had; adding a member rejects a duplicate add with `409` rather than a raw unique-constraint error.

## Settle-up & balances

A `Settlement` records a direct payment between two members. `lib/balances.ts` computes, from plain expense/split/settlement arrays (no Prisma import — fixture-testable): each member's **net balance** (`paid − owed share + settlements made − settlements received`, which always sums to zero across the group) and a **pairwise "who owes whom" ledger** (per-pair net debt, not minimized across chains — e.g. a direct A→B and B→C debt are shown as-is rather than cancelled through B). The `/groups/[id]/balances` page shows both, plus a settle-up form and settlement history.

### Debt-minimizing settlement

Also on that page: a "Simplify debts" section suggesting the fewest-transaction way to zero out the whole group, computed by `simplifyDebts` in `lib/balances.ts` using a greedy **"largest debtor pays largest creditor"** heuristic — repeatedly match whoever owes the most against whoever is owed the most, settle the smaller of the two amounts, and repeat until every balance is zero. Each suggestion is a real, clickable "Mark as settled" button (`components/SettleSuggestionButton.tsx`) that records an actual `Settlement` through the same API route the manual settle-up form uses.

This is provably *correct* — hand-verified and test-covered to always terminate in at most `n − 1` transactions for `n` people with a nonzero balance, and to always zero every balance out exactly — but it is **not provably optimal**. True minimum-transaction debt simplification is the NP-hard Optimal Account Balancing problem; a 5-person fixture in `tests/lib/balances.test.ts` (`A:+300, B:-300, C:+200, D:+200, E:-400`) documents a concrete case where the greedy heuristic produces 4 transactions against a true optimum of 3. This is the standard practical trade-off real settle-up apps ship (fast, simple, always-correct, occasionally one transaction more than strictly necessary), not a bug being chased.

## Optimistic UI

The group detail page's "+ Quick add expense" control (`components/QuickAddExpense.tsx`) adds an expense **optimistically**: submitting immediately shows the new row at the top of the list (dimmed, labeled "Saving…") before the server has responded, then either resolves into the real row or rolls back with an inline error if the save fails — no full-page reload either way. This is built with React 19's `useOptimistic` inside `startTransition(async () => { addOptimistic(tempRow); const result = await createExpenseQuickAdd(...); ... })`; the optimistic row is added synchronously at the top of that callback specifically so it renders before the `await` suspends, not after.

The underlying `createExpenseQuickAdd` Server Action (`app/groups/[groupId]/actions.ts`) returns a structured `{ ok: true } | { ok: false, error: string }` rather than throwing — Next redacts a thrown Server Action error's message in production builds, so a thrown validation error would reach the browser as an unhelpful generic string instead of e.g. "Payer must be a member of this group."

Two scoping decisions worth calling out:

- **Quick-add only supports equal splits.** It's a deliberately narrow addition alongside the existing full expense form at `/groups/[id]/expenses/new` (which still handles all three split types, create and edit) rather than a rebuild of that form's split-editor logic wrapped in optimistic plumbing — the point of this feature is the optimistic-update mechanics, not re-solving already-solved split math. Both entry points are visible and labeled ("Need an uneven split? Use the full form →") so quick-add doesn't read as a hidden duplicate of the real form.
- **Expenses passed into the client component are flattened to plain objects first.** Prisma's `Decimal` type (used by `ExpenseSplit.percentage`) can't cross the Server→Client prop boundary — passing the raw Prisma-shaped expense list straight into `<QuickAddExpense>` throws at render time the moment a percentage-split expense is present (the seeded "Cleaning service" expense, concretely, surfaced this during development). `app/groups/[groupId]/page.tsx` maps each expense to a flat `DisplayExpense` (id/description/amountCents/date string/category/payerId/payerName) before handing it down.

## Category insights

`/groups/[id]/insights` shows a horizontal bar chart of spending by category (`lib/analytics.ts`, via Prisma's `groupBy`). Deliberately a single flat color (no charting library, no per-category rainbow) — magnitude comparison is a sequential/one-hue color job, not a categorical one, since bar *length* already encodes the value and each bar is already directly labeled with its category name, amount, and percentage as text (coloring each bar differently would just re-encode information the chart already shows). A group with only one category in use falls back to a plain sentence instead of rendering a literal one-bar "chart."

## Tier reached & assumptions

**Tier 1, Tier 2, and Tier 3 are all complete.** Every extension option offered at each tier was built rather than just the required minimum: Tier 2's spec said "pick one" and all four were built (balance summary, settle-up, unequal splits, category breakdown); Tier 3 offered a similar choice and all three were built (debt-minimizing settlement, role-based permissions, optimistic UI with rollback). The only things not attempted are a deployed instance and a demo video (explicitly out of scope for this pass) and automated database-integration tests (see [Testing](#testing)).

Assumptions made where the spec was silent:

- **Auth identifies/authorizes; it doesn't restrict "who paid."** See [Authentication](#authentication) above.
- **Category is a fixed enum** (`FOOD`/`TRANSPORT`/.../`OTHER`) rather than free text, defaulting to `OTHER`.
- **Edits are full-replace (`PUT`), not `PATCH`** — simpler, and every form always submits the complete expense/group state anyway.
- **A group member can't be removed if they already have expenses recorded in that group** (as payer or split participant) — `409 Conflict` rather than silently orphaning data.
- **A group must have at least one member** to be created; creating a group auto-adds the creator as its sole initial admin.
- **A group must always have at least one admin.** `updateGroup`, `updateMemberRole`, and `removeMember` all refuse any change that would leave zero admins standing. See [Role-based permissions](#role-based-permissions).
- **Pre-existing groups (created before roles existed) had every member backfilled to `ADMIN`**, since no creator was ever recorded to promote instead. See [Role-based permissions](#role-based-permissions).
- **Settlements aren't validated against the outstanding balance** — you can record a settlement larger than what's actually owed (it just flips the pairwise sign). A real product would probably warn on this; kept simple here. This applies equally to manual settle-up and to clicking a debt-simplification suggestion.
- **"Who owes whom" is pairwise-net; debt simplification is greedy, not globally optimal.** The pairwise ledger deliberately doesn't cancel debt across chains on its own. The separate "Simplify debts" suggestions do collapse the whole group down to a near-minimal transaction set, but by a fast greedy heuristic rather than a true (NP-hard) minimum — see [Debt-minimizing settlement](#debt-minimizing-settlement).
- **The optimistic quick-add only handles equal splits.** Exact-amount and percentage splits still go through the full, non-optimistic `/expenses/new` form. See [Optimistic UI](#optimistic-ui).
- **Registration exists (`/register`), password reset doesn't.** New accounts start with zero groups — join one by having an existing admin add you via the group edit page's member picker, or create your own (auto-adds you as its admin). This goes beyond the spec's "seeded users with a session is plenty," but was straightforward to add on top of the Credentials setup.
- **User CRUD isn't part of the required scope** (only Groups and Expenses are) — users only exist via the seed script and `/register`.

Left out on purpose:

- **A working deployment and a demo video.** Explicitly excluded from this pass per direction.
- **Database-backed integration tests.** Testing is scoped to pure functions (split/percentage calculation, money parsing, validation rules, query parsing, balance/debt-simplification math, and the last-admin-guard predicate) — see [Testing](#testing). The Prisma-wired functions in `lib/groups.ts` that call those pure predicates (`createGroup`, `updateGroup`, `addMember`, `removeMember`, `updateMemberRole`), the API routes, auth gating, and role enforcement are exercised manually (smoke-tested end-to-end against a real database, including live login/session-cookie flows and a full role-permission curl matrix, during development) but have no automated test coverage of their own. A next step here would be a test database with Prisma's `$transaction`-based rollback-per-test pattern.

## Testing

`npm test` runs across `tests/lib/`, mirroring the `lib/` structure, chosen to be "the kind of test that would catch an AI-introduced bug" rather than a wall of trivial ones:

- **`split.test.ts`** — equal splits sum exactly to the total including the deliberate uneven-division case (`[334, 333, 333]`); exact-amount pass-through; percentage splits via the largest-remainder method, including the non-round `33.33/33.33/33.34%` case; a table-driven sum-invariant across several total/count combinations.
- **`validation/expense-rules.test.ts`** — rejects non-positive amounts, a payer outside the group, a splits array off by one cent from the total (the exact scenario the assessment names), a split member outside the group, and percentages that don't sum to 100.
- **`validation/expense-query.test.ts`** — query-param parsing: defaults, empty-string stripping, numeric coercion, array-value handling (Next's `searchParams` shape), rejection of invalid values.
- **`money.test.ts`** — dollar-string-to-cents parsing, rejects malformed/negative input.
- **`balances.test.ts`** — net-balance and pairwise-debt math against a hand-verified worked example (a $20 expense split between two non-payer members, one of whom later settles up), the zero-sum conservation invariant, and a cross-check that the two computations reconcile with each other; a `simplifyDebts` suite covering the empty/all-zero case, a simple pair, an exact hand-traced 4-person fixture, a reconciliation property check across several fixtures (apply every suggested settlement back onto the original balances and assert everyone lands at exactly zero — the invariant that actually matters, independent of tie-break/ordering details), a bound check (`suggestions.length <= nonZeroCount - 1`), a tie-break case, and the documented 5-person non-minimal-but-correct counterexample described in [Debt-minimizing settlement](#debt-minimizing-settlement).
- **`group-roles.test.ts`** — the `wouldLeaveNoAdmins` predicate behind every last-admin guard in `lib/groups.ts` ([Role-based permissions](#role-based-permissions)): removing the sole admin, removing a non-admin, a second admin surviving untouched, removing every admin among several affected users at once, removing several non-admins while an admin survives, a no-op empty change, and the vacuous empty-member-list edge case. This is exactly the kind of guard-clause logic (off-by-one in a count, an inverted filter condition, forgetting to exclude the user being changed) an AI-assisted edit could quietly invert, so it's tested as its own unit independent of the three Prisma-wired call sites it protects.

## Working with AI (Section 6)

**Where AI was used:** This project was built with Claude Code end-to-end across all three tiers — schema design, API routes, validation, UI, seed script, and tests were all AI-generated, directed through explicit written plans (reviewed and approved before implementation began each time) that named exact files, function signatures, and a phased build order verified incrementally rather than all at once. Product decisions the spec leaves open — money-as-cents, the auth/payer-picker split described above, category as an enum, the member-removal conflict rule, treating "pick one extension" as "build all of them" at both Tier 2 and Tier 3 per explicit direction — were made deliberately, not left to fall out of whatever the model generated first.

**One time AI was wrong:** The most natural first-draft implementation of "split N ways" is `shareCents = Math.round(totalCents / n)` applied to every member. For an amount that divides evenly this looks fine, but for `$10.00` across 3 people it produces `333 + 333 + 333 = 999` — one cent short of the total, exactly the bug class the assessment calls out. `lib/split.ts` was written from the start with explicit remainder distribution instead, and the same discipline was carried into the Tier 2 percentage-split math (`splitByPercentages`), which has the same failure mode in a subtler form: multiplying a percentage by a JS float (`33.34 * 100 === 3334.0000000000005`) reintroduces exactly the class of error `dollarsToCents` was written to avoid. Caught by holding every new numeric parser to the same "string-based, never float-multiplied" bar as the original money code, not by discovering it after the fact.

A second, more consequential example surfaced while planning Tier 2's auth: adding `User.passwordHash` would have made every existing `include: { user: true }` call (in `lib/users.ts`, `lib/groups.ts`, `lib/expenses.ts`) start shipping the password hash to the browser — a real, exploitable leak, not a style nit. It was caught during the planning pass (before any code touched the schema) specifically because a planning subagent was asked to trace every place `User` rows get serialized into an API response or a client component prop, rather than only checking that the new auth *feature* worked.

A third example, from Tier 3: the first hand-written expected output for the 5-person debt-simplification counterexample was wrong — it was traced by hand without correctly accounting for the algorithm's own alphabetical tie-break rule, producing two suggestions in the wrong order. Re-tracing the algorithm step-by-step (not just re-reading the code) caught the mistake before the test was trusted, and running the test against the real implementation afterward confirmed the corrected trace matched. This is the same discipline as the other two examples: a plausible-looking result (a test that would have passed against a *different*, subtly wrong implementation) is worth re-deriving by hand rather than accepting on inspection.

**How the tests guard it:** `assertSplitSumsToTotal` in `lib/validation/expense-rules.ts` runs as defense-in-depth on every create/update, independent of whichever split function computed the numbers — its test directly feeds it a splits array off by one cent and asserts rejection. `tests/lib/split.test.ts` separately asserts the exact `33.33/33.33/33.34%` → `[333, 333, 334]` case by name, so a regression back to float-based percentage math (or naive equal-split rounding) fails immediately rather than shipping a split that doesn't reconcile. `tests/lib/balances.test.ts`'s `simplifyDebts` reconciliation check guards the debt-simplification algorithm the same way — it doesn't just check one hardcoded output, it asserts the general invariant (every suggestion set, applied back to the original balances, zeroes everyone out) across multiple fixtures, so it would catch a broken algorithm even if a specific expected-output fixture were itself miscomputed. The password-hash leak has no dedicated automated test (it's a data-shape property, not a pure function) — it's guarded by the `select`-only pattern itself plus the manual response-grepping described above; a good next step would be a small integration test asserting `passwordHash` never appears in a serialized `User`-bearing API response.
