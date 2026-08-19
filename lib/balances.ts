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
 * from->to debt they were made against. Pairs are netted against each other
 * only (not against transitive chains through other members - e.g. A owing B
 * who owes C isn't collapsed into "A owes C"; that's what simplifyDebts below
 * does, working from net balances rather than pairwise history) and only
 * non-zero results are returned.
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

export interface SettlementSuggestion {
  from: string;
  to: string;
  amountCents: number;
}

/**
 * Greedy "largest debtor pays largest creditor" heuristic, working from net
 * balances (not the pairwise ledger, so it does collapse transitive chains -
 * e.g. A owing B who owes C settles as a single "A pays C"). Always produces
 * a VALID settlement (applying every suggestion zeroes all balances - the
 * sum of the balances array is a loop invariant, and each iteration removes
 * at least one entry, so it terminates in at most n-1 transactions for n
 * nonzero balances) but is NOT guaranteed to be the true minimum-transaction
 * solution: that's the NP-hard "Optimal Account Balancing" problem (minimum
 * transactions = n - the largest number of independently zero-summing
 * subsets), which requires exponential subset search in general. This greedy
 * approach is the standard practical trade-off real settle-up apps ship.
 */
export function simplifyDebts(netBalances: Map<string, number>): SettlementSuggestion[] {
  const balances = [...netBalances.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([userId, amount]) => ({ userId, amount }));
  const suggestions: SettlementSuggestion[] = [];

  while (balances.length > 1) {
    balances.sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));
    const creditor = balances[0];
    const debtor = balances[balances.length - 1];
    const settleAmount = Math.min(creditor.amount, -debtor.amount);

    suggestions.push({ from: debtor.userId, to: creditor.userId, amountCents: settleAmount });
    creditor.amount -= settleAmount;
    debtor.amount += settleAmount;

    for (let i = balances.length - 1; i >= 0; i--) {
      if (balances[i].amount === 0) balances.splice(i, 1);
    }
  }

  return suggestions;
}
