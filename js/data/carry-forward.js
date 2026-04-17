// ============================================================
// data/carry-forward.js — Month init, carry-forward, structure
// ============================================================

import {
    calculateMizuhoBalance,
    calculateStandardBalance,
} from './calculations.js';

// ── Default structure for a new month ───────────────────────
export function initializeMonth(data, monthKey, customAccounts = []) {
    if (data[monthKey]) return;

    data[monthKey] = {
        mizuho: {
            salary: 353037,
            prevBal: 726767,
            fixedExp: {
                'Food and Others':  { budget: 40000,  actual: [] },
                'To Home':          { budget: 12500,  actual: [] },
                'Transport':        { budget: 15000,  actual: [] },
                'Phone':            { budget: 5000,   actual: [] },
                'Utility':          { budget: 25000,  actual: [] },
                'Hair':             { budget: 1000,   actual: [] },
                'N.Mori':           { budget: 1000,   actual: [] },
                'Outing':           { budget: 5000,   actual: [] },
                'House rent':       { budget: 87000,  actual: [] },
                'Parking':          { budget: 20390,  actual: [] },
                'Luqman':           { budget: 10000,  actual: [] },
                'Daiso/Laundry':    { budget: 5000,   actual: [] },
                'Highways':         { budget: 0,      actual: [] },
                'Sani':             { budget: 10000,  actual: [] },
            },
            extras: [],
            additionalIncome: [],
            transfers: []
        },
        yucho: {
            funds: [
                { id: 1, name: 'Old JP Balance',  balance: 363649 },
                { id: 2, name: 'Housing',         balance: 80000  },
                { id: 3, name: 'Wedding Fund',    balance: 60000  },
                { id: 4, name: 'Wedding Wappa',   balance: 37500  },
                { id: 5, name: 'Extra Pay',       balance: 20632  },
                { id: 6, name: 'For Luqman',      balance: 80000  },
                { id: 7, name: 'Bonus',           balance: 0      },
                { id: 8, name: 'Interest',        balance: 503    },
            ],
            expenses: [],
            additions: [],
            transfers: []
        },
        slsenfin: { balance: 0, income: [], expenses: [], transfers: [] },
        rakuten:  { balance: 0, income: [], expenses: [], transfers: [] },
        medfun:   { balance: 0, income: [], expenses: [], transfers: [] },
    };

    // Init any custom accounts
    customAccounts.forEach(ca => {
        data[monthKey][ca.id] = { balance: 0, income: [], expenses: [], transfers: [] };
    });
}

// ── Ensure a month has all required keys ────────────────────
export function validateMonthStructure(data, monthKey, customAccounts = []) {
    const d = data[monthKey];
    if (!d) return;

    // Mizuho
    if (!d.mizuho) d.mizuho = {};
    if (!d.mizuho.fixedExp)          d.mizuho.fixedExp = {};
    if (!d.mizuho.extras)            d.mizuho.extras = [];
    if (!d.mizuho.transfers)         d.mizuho.transfers = [];
    if (!d.mizuho.additionalIncome)  d.mizuho.additionalIncome = [];
    if (d.mizuho.salary   === undefined) d.mizuho.salary   = 0;
    if (d.mizuho.prevBal  === undefined) d.mizuho.prevBal  = 0;

    // Yucho
    if (!d.yucho)           d.yucho = {};
    if (!d.yucho.funds)     d.yucho.funds = [];
    if (!d.yucho.expenses)  d.yucho.expenses = [];
    if (!d.yucho.additions) d.yucho.additions = [];
    if (!d.yucho.transfers) d.yucho.transfers = [];

    // Default standard accounts
    ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
        if (!d[acc]) d[acc] = {};
        if (d[acc].balance === undefined) d[acc].balance = 0;
        if (!d[acc].income)    d[acc].income    = [];
        if (!d[acc].expenses)  d[acc].expenses  = [];
        if (!d[acc].transfers) d[acc].transfers = [];
    });

    // Custom accounts
    customAccounts.forEach(ca => {
        if (!d[ca.id]) d[ca.id] = {};
        if (d[ca.id].balance === undefined) d[ca.id].balance = 0;
        if (!d[ca.id].income)    d[ca.id].income    = [];
        if (!d[ca.id].expenses)  d[ca.id].expenses  = [];
        if (!d[ca.id].transfers) d[ca.id].transfers = [];
    });
}

// ── Carry forward to next month ──────────────────────────────
export function performCarryForward(data, currentMonth, customAccounts = []) {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const next  = `${nextY}-${String(nextM).padStart(2, '0')}`;

    if (data[next]) return { next, alreadyExists: true };

    const cur = data[currentMonth];

    data[next] = {
        mizuho: {
            salary:  cur.mizuho.salary,
            prevBal: calculateMizuhoBalance(data, currentMonth),
            fixedExp: {},
            extras: [],
            additionalIncome: [],
            transfers: []
        },
        yucho: { funds: [], expenses: [], additions: [], transfers: [] },
        slsenfin: { balance: calculateStandardBalance(data, currentMonth, 'slsenfin'), income: [], expenses: [], transfers: [] },
        rakuten:  { balance: calculateStandardBalance(data, currentMonth, 'rakuten'),  income: [], expenses: [], transfers: [] },
        medfun:   { balance: calculateStandardBalance(data, currentMonth, 'medfun'),   income: [], expenses: [], transfers: [] },
    };

    // Copy fixed expense budgets (zero actuals)
    for (const cat in cur.mizuho.fixedExp) {
        data[next].mizuho.fixedExp[cat] = {
            budget: cur.mizuho.fixedExp[cat].budget,
            actual: []
        };
    }

    // Calculate Yucho fund closing balances
    cur.yucho.funds.forEach((fund, idx) => {
        let bal = fund.balance;
        cur.yucho.additions?.forEach(a => { if (a.fundIdx === idx) bal += a.amount; });
        cur.yucho.expenses?.forEach(e => { if (e.fundIdx === idx) bal -= e.amount; });
        cur.yucho.transfers?.forEach(t => {
            if (t.fundIdx === idx) {
                if (t.type === 'in') bal += t.amount;
                else bal -= t.amount;
            }
        });
        data[next].yucho.funds.push({ name: fund.name, balance: bal });
    });

    // Custom accounts
    customAccounts.forEach(ca => {
        data[next][ca.id] = {
            balance: calculateStandardBalance(data, currentMonth, ca.id),
            income: [], expenses: [], transfers: []
        };
    });

    return { next, alreadyExists: false };
}

// ── Cascade balances across all sorted months ────────────────
export function updateDependentMonths(data, customAccounts = []) {
    const months = Object.keys(data).sort();

    for (let i = 0; i < months.length - 1; i++) {
        const cur  = months[i];
        const next = months[i + 1];

        const curData  = data[cur];
        const nextData = data[next];
        if (!curData || !nextData) continue;

        // Mizuho prev balance
        if (nextData.mizuho) {
            nextData.mizuho.prevBal = calculateMizuhoBalance(data, cur);
        }

        // Yucho fund balances
        if (curData.yucho?.funds && nextData.yucho?.funds) {
            if (nextData.yucho.funds.length !== curData.yucho.funds.length) {
                nextData.yucho.funds = curData.yucho.funds.map(f => ({ name: f.name, balance: 0 }));
            }

            curData.yucho.funds.forEach((fund, idx) => {
                let bal = fund.balance;
                curData.yucho.additions?.forEach(a => { if (a.fundIdx === idx) bal += a.amount; });
                curData.yucho.expenses?.forEach(e => { if (e.fundIdx === idx) bal -= e.amount; });
                curData.yucho.transfers?.forEach(t => {
                    if (t.fundIdx === idx) {
                        if (t.type === 'in') bal += t.amount;
                        else bal -= t.amount;
                    }
                });
                if (nextData.yucho.funds[idx]) {
                    nextData.yucho.funds[idx].balance = bal;
                    nextData.yucho.funds[idx].name    = fund.name;
                }
            });
        }

        // Standard accounts
        ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
            if (curData[acc] && nextData[acc]) {
                nextData[acc].balance = calculateStandardBalance(data, cur, acc);
            }
        });

        // Custom accounts
        customAccounts.forEach(ca => {
            if (curData[ca.id] && nextData[ca.id]) {
                nextData[ca.id].balance = calculateStandardBalance(data, cur, ca.id);
            }
        });
    }
}
