export interface ExpenseInput {
  id: string;
  payerId: string;
  amountCents: number;
}

export interface SplitInput {
  expenseId: string;
  userId: string;
  shareCents: number;
}

export interface SettlementInput {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

/**
 * net(u) = paidForExpenses(u) - owedShare(u) + settlementsMade(u) - settlementsReceived(u)
 * Invariant: sum of all nets is always exactly 0.
 */
export function computeNetBalances(
  expenses: ExpenseInput[],
  splits: SplitInput[],
  settlements: SettlementInput[]
): Map<string, number> {
  const net = new Map<string, number>();
  const add = (userId: string, delta: number) => {
    net.set(userId, (net.get(userId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    add(expense.payerId, expense.amountCents);
  }
  for (const split of splits) {
    add(split.userId, -split.shareCents);
  }
  for (const settlement of settlements) {
    add(settlement.fromUserId, settlement.amountCents);
    add(settlement.toUserId, -settlement.amountCents);
  }

  return net;
}

export interface PairwiseDebt {
  from: string; // owes
  to: string; // is owed
  amountCents: number;
}

/**
 * Directed per-pair ledger: for every split row not belonging to the payer,
 * that member owes the payer their share; settlements reduce the specific
 * from->to debt they were made against. Pairs are then netted against each
 * other (not against transitive chains through other members - that kind of
 * cross-chain minimization is a possible future Tier 3 feature, out of scope
 * here) and only non-zero results are returned.
 */
export function computePairwiseDebts(
  expenses: ExpenseInput[],
  splits: SplitInput[],
  settlements: SettlementInput[]
): PairwiseDebt[] {
  const ledger = new Map<string, number>();
  const addDebt = (from: string, to: string, amountCents: number) => {
    if (from === to) return;
    const key = `${from}|${to}`;
    ledger.set(key, (ledger.get(key) ?? 0) + amountCents);
  };

  const payerByExpenseId = new Map(expenses.map((e) => [e.id, e.payerId]));

  for (const split of splits) {
    const payerId = payerByExpenseId.get(split.expenseId);
    if (!payerId || split.userId === payerId) continue;
    addDebt(split.userId, payerId, split.shareCents);
  }

  for (const settlement of settlements) {
    addDebt(settlement.fromUserId, settlement.toUserId, -settlement.amountCents);
  }

  const seenPairs = new Set<string>();
  const result: PairwiseDebt[] = [];

  for (const key of ledger.keys()) {
    const [a, b] = key.split("|");
    const pairKey = [a, b].sort().join("|");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const aOwesB = ledger.get(`${a}|${b}`) ?? 0;
    const bOwesA = ledger.get(`${b}|${a}`) ?? 0;
    const net = aOwesB - bOwesA;

    if (net > 0) {
      result.push({ from: a, to: b, amountCents: net });
    } else if (net < 0) {
      result.push({ from: b, to: a, amountCents: -net });
    }
  }

  return result;
}
