import { Trip, Transaction, ParticipantBalance } from './types';

/**
 * Calculates the net balance for each participant and the transactions needed to settle up.
 */
export function calculateBalances(trip: Trip): { 
  balances: ParticipantBalance[], 
  transactions: Transaction[] 
} {
  const { participants, expenses } = trip;
  
  // Initialize balances
  const netBalances: Record<string, number> = {};
  participants.forEach(p => {
    netBalances[p.id] = 0;
  });

  // Calculate net balance for each participant
  expenses.forEach(expense => {
    const { amount, paidBy, splitBetween } = expense;
    
    // Payer gets credit for the full amount
    netBalances[paidBy] += amount;
    
    // Each person in the split owes their share
    const share = amount / splitBetween.length;
    splitBetween.forEach(participantId => {
      netBalances[participantId] -= share;
    });
  });

  // Create balance objects for display
  const balances: ParticipantBalance[] = participants.map(p => ({
    participantId: p.id,
    name: p.name,
    netBalance: netBalances[p.id]
  }));

  // Calculate transactions (who owes whom)
  const transactions: Transaction[] = [];
  
  // Separate debtors and creditors
  let debtors = participants
    .map(p => ({ id: p.id, name: p.name, balance: netBalances[p.id] }))
    .filter(p => p.balance < -0.01)
    .sort((a, b) => a.balance - b.balance); // Most negative first

  let creditors = participants
    .map(p => ({ id: p.id, name: p.name, balance: netBalances[p.id] }))
    .filter(p => p.balance > 0.01)
    .sort((a, b) => b.balance - a.balance); // Most positive first

  // Greedy algorithm to settle debts
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    const amountToPay = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (amountToPay > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountToPay
      });
    }

    debtor.balance += amountToPay;
    creditor.balance -= amountToPay;

    if (Math.abs(debtor.balance) < 0.01) dIdx++;
    if (Math.abs(creditor.balance) < 0.01) cIdx++;
  }

  return { balances, transactions };
}
