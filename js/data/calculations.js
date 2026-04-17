// ============================================================
// data/calculations.js — Pure calculation functions
// All functions take (data, month, customAccounts) as needed.
// No DOM access. No side-effects.
// ============================================================

export function calculateMizuhoBalance(data, month) {
    const m = data[month]?.mizuho;
    if (!m) return 0;

    let income = (m.salary || 0) + (m.prevBal || 0);
    m.additionalIncome?.forEach(inc => income += inc.amount);

    let expenses = 0;
    for (const cat in m.fixedExp) {
        m.fixedExp[cat].actual?.forEach(e => expenses += e.amount);
    }
    m.extras?.forEach(e => expenses += e.amount);

    let transfersOut = 0, transfersIn = 0;
    m.transfers?.forEach(t => {
        if (t.type === 'out') transfersOut += t.amount;
        else transfersIn += t.amount;
    });

    return income - expenses - transfersOut + transfersIn;
}

export function calculateYuchoBalance(data, month) {
    const y = data[month]?.yucho;
    if (!y) return 0;

    let total = 0;
    y.funds.forEach((fund, i) => {
        let bal = fund.balance;
        y.additions?.forEach(a => { if (a.fundIdx === i) bal += a.amount; });
        y.expenses?.forEach(e => { if (e.fundIdx === i) bal -= e.amount; });
        y.transfers?.forEach(t => {
            if (t.fundIdx === i) {
                if (t.type === 'in') bal += t.amount;
                else bal -= t.amount;
            }
        });
        total += bal;
    });

    return total;
}

export function calculateStandardBalance(data, month, account) {
    const acc = data[month]?.[account];
    if (!acc) return 0;

    let balance = acc.balance || 0;
    acc.income?.forEach(i => balance += i.amount);
    acc.expenses?.forEach(e => balance -= e.amount);
    acc.transfers?.forEach(t => {
        if (t.type === 'in') balance += t.amount;
        else balance -= t.amount;
    });

    return balance;
}

// ── Used for carry-forward / updateDependentMonths ───────────
export function calculateMizuhoBalanceForMonth(data, monthKey) {
    return calculateMizuhoBalance(data, monthKey);
}

export function calculateStandardBalanceForMonth(data, monthKey, account) {
    return calculateStandardBalance(data, monthKey, account);
}

// ── Monthly savings (income minus mizuho expenses) ───────────
export function calculateMonthlySavings(data, month, customAccounts = []) {
    const d = data[month];
    if (!d) return 0;

    let totalIncome = 0;

    // Mizuho income
    if (d.mizuho) {
        totalIncome += d.mizuho.salary || 0;
        d.mizuho.additionalIncome?.forEach(inc => totalIncome += inc.amount);
    }

    // Yucho direct deposits (external)
    d.yucho?.additions?.forEach(a => totalIncome += a.amount);

    // Other account income
    ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
        d[acc]?.income?.forEach(inc => totalIncome += inc.amount);
    });

    customAccounts.forEach(ca => {
        d[ca.id]?.income?.forEach(inc => totalIncome += inc.amount);
    });

    // Mizuho expenses only
    let mizuhoExpenses = 0;
    if (d.mizuho) {
        for (const cat in d.mizuho.fixedExp) {
            d.mizuho.fixedExp[cat].actual?.forEach(e => mizuhoExpenses += e.amount);
        }
        d.mizuho.extras?.forEach(e => mizuhoExpenses += e.amount);
    }

    return totalIncome - mizuhoExpenses;
}

// ── Annual savings across months of the same year ────────────
export function calculateAnnualSavings(data, currentMonth, customAccounts = []) {
    const year = currentMonth.split('-')[0];
    let total = 0;

    for (const monthKey in data) {
        if (!monthKey.startsWith(year)) continue;
        total += calculateMonthlySavings(data, monthKey, customAccounts);
    }

    return total;
}

// ── Annual expenses (all accounts) ───────────────────────────
export function calculateAnnualExpensesAll(data, currentMonth, customAccounts = []) {
    const year = currentMonth.split('-')[0];
    let total = 0;

    for (const monthKey in data) {
        if (!monthKey.startsWith(year)) continue;
        const d = data[monthKey];
        if (!d) continue;

        if (d.mizuho) {
            for (const cat in d.mizuho.fixedExp) {
                d.mizuho.fixedExp[cat].actual?.forEach(e => total += e.amount);
            }
            d.mizuho.extras?.forEach(e => total += e.amount);
        }

        d.yucho?.expenses?.forEach(e => total += e.amount);

        ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
            d[acc]?.expenses?.forEach(e => total += e.amount);
        });

        customAccounts.forEach(ca => {
            d[ca.id]?.expenses?.forEach(e => total += e.amount);
        });
    }

    return total;
}

// ── Total expenses for a single month (all accounts) ─────────
export function calculateTotalExpensesAllAccounts(data, month, customAccounts = []) {
    const d = data[month];
    if (!d) return 0;

    let total = 0;

    if (d.mizuho) {
        for (const cat in d.mizuho.fixedExp) {
            d.mizuho.fixedExp[cat].actual?.forEach(e => total += e.amount);
        }
        d.mizuho.extras?.forEach(e => total += e.amount);
    }

    d.yucho?.expenses?.forEach(e => total += e.amount);

    ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
        d[acc]?.expenses?.forEach(e => total += e.amount);
    });

    customAccounts.forEach(ca => {
        d[ca.id]?.expenses?.forEach(e => total += e.amount);
    });

    return total;
}

// ── Mizuho-only expenses for a month ─────────────────────────
export function calculateMizuhoExpenses(data, month) {
    const m = data[month]?.mizuho;
    if (!m) return 0;

    let total = 0;
    for (const cat in m.fixedExp) {
        m.fixedExp[cat].actual?.forEach(e => total += e.amount);
    }
    m.extras?.forEach(e => total += e.amount);
    return total;
}
