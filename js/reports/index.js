// ============================================================
// reports/index.js — All report renderers
// ============================================================

import {
    calculateMonthlySavings,
    calculateAnnualSavings,
    calculateAnnualExpensesAll,
    calculateMizuhoExpenses,
} from '../data/calculations.js';

// ── All Accounts Overview ─────────────────────────────────────
export function renderOverview(app) {
    let html = '<div class="section"><div class="section-title">🌍 All Accounts Overview</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:30px;">';

    const defaults = [
        { id: 'mizuho',   name: 'Mizuho'         },
        { id: 'yucho',    name: 'Yucho'           },
        { id: 'slsenfin', name: 'SLSenfin'        },
        { id: 'rakuten',  name: 'Rakuten'         },
        { id: 'medfun',   name: '7-11 (Med & Fun)'},
    ];

    defaults.forEach(({ id, name }) => {
        const balance = id === 'mizuho'  ? app.calculateMizuhoBalance()
                      : id === 'yucho'   ? app.calculateYuchoBalance()
                      : app.calculateStandardBalance(id);
        html += _overviewCard(name, balance);
    });

    app.customAccounts?.forEach(ca => {
        html += _overviewCard(ca.name, app.calculateStandardBalance(ca.id));
    });

    html += '</div></div>';
    document.getElementById('content').innerHTML = html;
}

function _overviewCard(name, balance) {
    return `<div style="background:#f8f9fa;padding:20px;border-radius:10px;text-align:center;">
        <h3 style="color:#667eea;margin-bottom:10px;">${name}</h3>
        <div style="font-size:24px;font-weight:bold;">¥${Number(Math.round(balance)).toLocaleString()}</div>
    </div>`;
}

// ── Monthly Savings ───────────────────────────────────────────
export function renderMonthlySavings(app) {
    const d            = app.data[app.month];
    const totalSavings = calculateMonthlySavings(app.data, app.month, app.customAccounts);

    let mizuhoIncome = 0, otherIncome = 0;
    if (d.mizuho) {
        mizuhoIncome = d.mizuho.salary || 0;
        d.mizuho.additionalIncome?.forEach(i => mizuhoIncome += i.amount);
    }
    d.yucho?.additions?.forEach(a => otherIncome += a.amount);
    ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
        d[acc]?.income?.forEach(i => otherIncome += i.amount);
    });
    app.customAccounts?.forEach(ca => { d[ca.id]?.income?.forEach(i => otherIncome += i.amount); });

    const totalIncome    = mizuhoIncome + otherIncome;
    const mizuhoExpenses = calculateMizuhoExpenses(app.data, app.month);

    let expensesFromSavings = 0;
    d.yucho?.expenses?.forEach(e => expensesFromSavings += e.amount);
    ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
        d[acc]?.expenses?.forEach(e => expensesFromSavings += e.amount);
    });
    app.customAccounts?.forEach(ca => { d[ca.id]?.expenses?.forEach(e => expensesFromSavings += e.amount); });

    const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
    const fmt = n => Number(Math.round(n)).toLocaleString();

    let html = `<div class="section"><div class="section-title">💰 Monthly Savings Report - ${app.month}</div>`;

    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#43e97b 0%,#38c968 100%);">
        <div class="assets-label">Total Monthly Savings</div>
        <div>¥${fmt(totalSavings)}</div>
    </div>`;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0;">
        ${_statCard('#e8f5e9','#43e97b','Total Income',`¥${fmt(totalIncome)}`,
            otherIncome > 0 ? `Mizuho: ¥${fmt(mizuhoIncome)} + Other: ¥${fmt(otherIncome)}` : '')}
        ${_statCard('#ffebee','#f5576c','Mizuho Expenses',`¥${fmt(mizuhoExpenses)}`)}
        ${_statCard('#fff3cd','#856404','Savings Fund Expenses',`¥${fmt(expensesFromSavings)}`,
            'See "Total Expense Overview" for details')}
        ${_statCard('#e3f2fd','#667eea','Savings Rate',`${savingsRate}%`)}
    </div>`;

    // Breakdown
    html += `<div class="section"><div class="section-title">📝 How Your Savings Add Up</div>
        <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;">`;

    html += _breakdownRow('#43e97b', 'Total Income (All Sources)',
        `Mizuho: ¥${fmt(mizuhoIncome)}${otherIncome > 0 ? ` + Other: ¥${fmt(otherIncome)}` : ''}`,
        `¥${fmt(totalIncome)}`, '#43e97b');
    html += _breakdownRow('#f5576c', 'Mizuho Expenses', '', `- ¥${fmt(mizuhoExpenses)}`, '#f5576c');

    html += `<div style="height:2px;background:#ddd;margin:15px 0;"></div>`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:15px;background:#43e97b;color:white;border-radius:8px;font-size:18px;">
        <div><strong>💰 Total Monthly Savings</strong></div>
        <div style="font-size:24px;font-weight:bold;">¥${fmt(totalSavings)}</div>
    </div>`;
    html += `</div></div>`;

    // Where savings went
    html += _renderSavingsAllocations(app, d, fmt);

    // Bar chart
    const maxAmt    = Math.max(totalIncome, mizuhoExpenses);
    const incW      = maxAmt > 0 ? (totalIncome / maxAmt) * 100 : 0;
    const expW      = maxAmt > 0 ? (mizuhoExpenses / maxAmt) * 100 : 0;

    html += `<div style="margin:30px 0;">
        <h3 style="color:#333;margin-bottom:15px;">💰 Income vs Mizuho Expenses</h3>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;">
            <div style="margin-bottom:15px;">
                <div style="font-size:14px;color:#666;margin-bottom:5px;">Income: ¥${fmt(totalIncome)}</div>
                <div style="background:#43e97b;height:30px;border-radius:5px;width:${incW}%;"></div>
            </div>
            <div>
                <div style="font-size:14px;color:#666;margin-bottom:5px;">Expenses: ¥${fmt(mizuhoExpenses)}</div>
                <div style="background:#f5576c;height:30px;border-radius:5px;width:${expW}%;"></div>
            </div>
        </div>
    </div></div>`;

    document.getElementById('content').innerHTML = html;
}

function _renderSavingsAllocations(app, d, fmt) {
    const allocations = [];

    d.mizuho?.transfers?.forEach(t => {
        if (t.type !== 'out') return;
        const names = { slsenfin: 'SLSenfin', rakuten: 'Rakuten', medfun: '7-11 Account', yucho: 'Yucho', mizuho: 'Mizuho' };
        const toName = names[t.toAccount] || app.customAccounts?.find(a => a.id === t.toAccount)?.name || t.toAccount;

        let fundIdx  = null;
        let fundName = null;

        if (t.toAccount === 'yucho') {
            if (t.fundIdx != null && t.fundIdx !== 'main') {
                fundIdx  = typeof t.fundIdx === 'string' ? parseInt(t.fundIdx) : t.fundIdx;
                if (d.yucho?.funds?.[fundIdx]) fundName = d.yucho.funds[fundIdx].name;
            }
            if (t.toFundName) fundName = t.toFundName;
        }

        allocations.push({ date: t.date, account: toName, fund: fundName, fundIdx, amount: t.amount, desc: t.desc || '-' });
    });

    allocations.sort((a, b) => a.date.localeCompare(b.date));
    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

    let html = `<div class="section"><div class="section-title">💎 Where Your Savings Went (Actual Transfers)</div>
        <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;">`;

    if (allocations.length > 0) {
        html += `<h4 style="color:#667eea;margin-bottom:15px;">💸 Detailed Breakdown</h4>
            <div style="background:white;border-radius:8px;overflow:hidden;margin-bottom:15px;">`;

        allocations.forEach((s, i) => {
            html += `<div style="padding:15px;${i > 0 ? 'border-top:1px solid #f0f0f0;' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div>
                        <div style="font-weight:600;color:#333;font-size:16px;">
                            ${s.account}
                            ${s.fund && s.fund !== 'Main'
                                ? `<span style="color:#667eea;font-weight:700;"> → ${s.fund}</span>`
                                : (s.account === 'Yucho' && s.fundIdx != null
                                    ? `<span style="color:#999;font-style:italic;"> (Fund #${s.fundIdx + 1})</span>`
                                    : '')}
                        </div>
                        <div style="font-size:12px;color:#999;margin-top:3px;">${s.date} • ${s.desc}</div>
                    </div>
                    <div style="font-size:18px;font-weight:bold;color:#43e97b;">¥${fmt(s.amount)}</div>
                </div>
            </div>`;
        });

        html += `</div>
            <div style="background:white;border-radius:8px;padding:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:600;">Total Transferred to Savings</div>
                    <div style="font-size:18px;font-weight:bold;color:#43e97b;">¥${fmt(totalAllocated)}</div>
                </div>
            </div>`;
    } else {
        html += '<div style="padding:20px;background:white;border-radius:8px;text-align:center;color:#999;">No transfers to savings this month</div>';
    }

    const mizuhoIncome   = (app.data[app.month].mizuho?.salary || 0) +
        (app.data[app.month].mizuho?.additionalIncome?.reduce((s, i) => s + i.amount, 0) || 0);
    const mizuhoExpenses = calculateMizuhoExpenses(app.data, app.month);
    const remaining      = mizuhoIncome - mizuhoExpenses - totalAllocated;

    html += `<div style="margin-top:20px;">
        <h4 style="color:#667eea;margin-bottom:10px;">💵 Kept in Mizuho Account</h4>
        <div style="background:white;border-radius:8px;padding:15px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div><strong>Savings kept in Mizuho (not transferred)</strong></div>
                <div style="font-size:18px;font-weight:bold;color:#667eea;">¥${fmt(remaining)}</div>
            </div>
        </div>
    </div></div></div>`;

    return html;
}

// ── Annual Savings ────────────────────────────────────────────
export function renderAnnualSavings(app) {
    const year         = app.month.split('-')[0];
    const totalAnnual  = calculateAnnualSavings(app.data, app.month, app.customAccounts);
    const fmt = n => Number(Math.round(n)).toLocaleString();

    const monthlyData = [];
    let totalIncome = 0, totalExpenses = 0;

    for (const monthKey in app.data) {
        if (!monthKey.startsWith(year)) continue;
        const d = app.data[monthKey];
        if (!d?.mizuho) continue;

        let income = d.mizuho.salary || 0;
        d.mizuho.additionalIncome?.forEach(i => income += i.amount);
        const expenses = calculateMizuhoExpenses(app.data, monthKey);
        const savings  = income - expenses;
        totalIncome   += income;
        totalExpenses += expenses;
        monthlyData.push({ month: monthKey, income, expenses, savings });
    }

    monthlyData.sort((a, b) => a.month.localeCompare(b.month));
    const savingsRate = totalIncome > 0 ? Math.round((totalAnnual / totalIncome) * 100) : 0;

    let html = `<div class="section"><div class="section-title">📈 Annual Savings Report - ${year}</div>`;
    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#ffd700 0%,#ffa500 100%);">
        <div class="assets-label">Annual Salary Savings</div>
        <div>¥${fmt(totalAnnual)}</div>
    </div>`;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0;">
        ${_statCard('#e8f5e9','#43e97b','Total Income',`¥${fmt(totalIncome)}`)}
        ${_statCard('#ffebee','#f5576c','Total Expenses',`¥${fmt(totalExpenses)}`)}
        ${_statCard('#e3f2fd','#667eea','Average Savings Rate',`${savingsRate}%`)}
        ${_statCard('#fff3e0','#ffa500','Months Tracked',`${monthlyData.length}`)}
    </div>`;

    if (monthlyData.length > 0) {
        const maxSav = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses, Math.abs(m.savings))));

        html += `<div style="margin:30px 0;"><h3 style="color:#333;margin-bottom:15px;">Monthly Savings Trend</h3>
            <div style="background:#f5f5f5;padding:20px;border-radius:10px;">`;

        monthlyData.forEach(m => {
            const w     = maxSav > 0 ? Math.abs((m.savings / maxSav) * 100) : 0;
            const color = m.savings >= 0 ? '#43e97b' : '#f5576c';
            html += `<div style="margin-bottom:20px;">
                <div style="font-size:13px;color:#666;margin-bottom:5px;font-weight:600;">${m.month}</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="background:${color};height:25px;border-radius:5px;width:${w}%;min-width:2%;"></div>
                    <span style="font-size:13px;font-weight:600;color:${color};">¥${fmt(m.savings)}</span>
                </div>
            </div>`;
        });
        html += `</div></div>`;

        html += `<div class="section"><div class="section-title">📊 Monthly Breakdown</div>
            <div class="table-container"><table>
            <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Savings</th><th>Savings Rate</th></tr></thead>
            <tbody>`;

        monthlyData.forEach(m => {
            const rate = m.income > 0 ? Math.round((m.savings / m.income) * 100) : 0;
            html += `<tr>
                <td><strong>${m.month}</strong></td>
                <td style="color:#43e97b;">¥${fmt(m.income)}</td>
                <td style="color:#f5576c;">¥${fmt(m.expenses)}</td>
                <td style="font-weight:bold;color:${m.savings >= 0 ? '#43e97b' : '#f5576c'};">¥${fmt(m.savings)}</td>
                <td>${rate}%</td>
            </tr>`;
        });

        html += `</tbody></table></div></div>`;
    }

    html += '</div>';
    document.getElementById('content').innerHTML = html;
}

// ── Total Expense Overview (single month) ─────────────────────
export function renderTotalExpenseOverview(app) {
    const d   = app.data[app.month];
    const fmt = n => Number(Math.round(n)).toLocaleString();

    if (!d) {
        document.getElementById('content').innerHTML = '<div class="section"><p>No data available</p></div>';
        return;
    }

    const accountExpenses = _collectMonthExpenses(app, d);
    const grandTotal      = Object.values(accountExpenses).reduce((s, v) => s + v, 0);

    let html = `<div class="section"><div class="section-title">💸 Total Expense Overview - ${app.month}</div>`;
    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#f5576c 0%,#dc3b50 100%);">
        <div class="assets-label">TOTAL EXPENSES (ALL ACCOUNTS)</div>
        <div>¥${fmt(grandTotal)}</div>
    </div>`;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0;">`;
    for (const [name, amount] of Object.entries(accountExpenses)) {
        const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
        html += `<div style="background:#f8f9fa;padding:20px;border-radius:10px;text-align:center;">
            <h3 style="color:#667eea;margin-bottom:10px;">${name}</h3>
            <div style="font-size:24px;font-weight:bold;">¥${fmt(amount)}</div>
            <div style="font-size:12px;color:#999;margin-top:5px;">${pct}% of total</div>
        </div>`;
    }
    html += '</div>';

    html += `<div class="section"><div class="section-title">📊 Detailed Breakdown</div>
        <div class="table-container"><table>
        <thead><tr><th>Account</th><th>Amount</th><th>% of Total</th></tr></thead><tbody>`;

    for (const [name, amount] of Object.entries(accountExpenses)) {
        const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
        html += `<tr><td><strong>${name}</strong></td><td><strong>¥${fmt(amount)}</strong></td><td>${pct}%</td></tr>`;
    }
    html += `<tr class="total-row">
        <td><strong>GRAND TOTAL</strong></td>
        <td style="font-size:18px;"><strong>¥${fmt(grandTotal)}</strong></td>
        <td><strong>100%</strong></td>
    </tr>`;
    html += `</tbody></table></div></div></div>`;

    document.getElementById('content').innerHTML = html;
}

// ── Annual Expense Overview ───────────────────────────────────
export function renderAnnualExpenseOverview(app) {
    const year = app.month.split('-')[0];
    const fmt  = n => Number(Math.round(n)).toLocaleString();

    const accountTotals   = {};
    const monthlyBreakdown = {};

    for (const monthKey in app.data) {
        if (!monthKey.startsWith(year)) continue;
        const d = app.data[monthKey];
        if (!d) continue;

        monthlyBreakdown[monthKey] = {};

        const addTo = (name, amount) => {
            accountTotals[name]            = (accountTotals[name]            || 0) + amount;
            monthlyBreakdown[monthKey][name] = (monthlyBreakdown[monthKey][name] || 0) + amount;
        };

        if (d.mizuho) {
            for (const cat in d.mizuho.fixedExp) {
                d.mizuho.fixedExp[cat].actual?.forEach(e => addTo('Mizuho', e.amount));
            }
            d.mizuho.extras?.forEach(e => addTo('Mizuho', e.amount));
        }

        d.yucho?.expenses?.forEach(e => addTo('Yucho', e.amount));
        ['slsenfin', 'rakuten', 'medfun'].forEach(acc => {
            const label = { slsenfin: 'SLSenfin', rakuten: 'Rakuten', medfun: '7-11 Account' }[acc];
            d[acc]?.expenses?.forEach(e => addTo(label, e.amount));
        });
        app.customAccounts?.forEach(ca => {
            d[ca.id]?.expenses?.forEach(e => addTo(ca.name, e.amount));
        });
    }

    const grandTotal   = Object.values(accountTotals).reduce((s, v) => s + v, 0);
    const monthsCount  = Object.keys(monthlyBreakdown).length;

    let html = `<div class="section"><div class="section-title">📊 Annualized Total Expenses - ${year}</div>`;
    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#ff6b6b 0%,#c92a2a 100%);">
        <div class="assets-label">TOTAL ANNUAL EXPENSES (ALL ACCOUNTS)</div>
        <div>¥${fmt(grandTotal)}</div>
    </div>`;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0;">`;
    for (const [name, amount] of Object.entries(accountTotals)) {
        if (!amount) continue;
        const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
        html += `<div style="background:#f8f9fa;padding:20px;border-radius:10px;text-align:center;">
            <h3 style="color:#667eea;margin-bottom:10px;">${name}</h3>
            <div style="font-size:24px;font-weight:bold;">¥${fmt(amount)}</div>
            <div style="font-size:12px;color:#999;margin-top:5px;">${pct}% of total</div>
        </div>`;
    }
    html += '</div>';

    // Summary table
    html += `<div class="section"><div class="section-title">📋 Annual Summary by Account</div>
        <div class="table-container"><table>
        <thead><tr><th>Account</th><th>Total</th><th>% of Total</th><th>Avg / Month</th></tr></thead><tbody>`;

    for (const [name, amount] of Object.entries(accountTotals)) {
        if (!amount) continue;
        const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
        const avg = monthsCount > 0 ? amount / monthsCount : 0;
        html += `<tr><td><strong>${name}</strong></td><td>¥${fmt(amount)}</td><td>${pct}%</td><td>¥${fmt(avg)}</td></tr>`;
    }

    html += `<tr class="total-row">
        <td><strong>GRAND TOTAL</strong></td>
        <td style="font-size:18px;"><strong>¥${fmt(grandTotal)}</strong></td>
        <td>100%</td>
        <td><strong>¥${fmt(monthsCount > 0 ? grandTotal / monthsCount : 0)}</strong></td>
    </tr></tbody></table></div></div>`;

    // Monthly trend
    const sortedMonths = Object.keys(monthlyBreakdown).sort();
    if (sortedMonths.length > 0) {
        let maxMonthly = 0;
        sortedMonths.forEach(m => {
            const t = Object.values(monthlyBreakdown[m]).reduce((s, v) => s + v, 0);
            maxMonthly = Math.max(maxMonthly, t);
        });

        html += `<div class="section"><div class="section-title">📈 Monthly Expense Trend</div>
            <div style="background:#f5f5f5;padding:20px;border-radius:10px;">`;

        sortedMonths.forEach(m => {
            const total = Object.values(monthlyBreakdown[m]).reduce((s, v) => s + v, 0);
            const w     = maxMonthly > 0 ? (total / maxMonthly) * 100 : 0;
            html += `<div style="margin-bottom:20px;">
                <div style="font-size:13px;color:#666;margin-bottom:5px;font-weight:600;">${m}</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="background:#f5576c;height:25px;border-radius:5px;width:${w}%;min-width:2%;"></div>
                    <span style="font-size:13px;font-weight:600;">¥${fmt(total)}</span>
                </div>
            </div>`;
        });

        html += `</div></div>`;
    }

    html += '</div>';
    document.getElementById('content').innerHTML = html;
}

// ── Expense Analysis ──────────────────────────────────────────
export function renderExpenseAnalysis(app) {
    const d   = app.data[app.month];
    const fmt = n => Number(Math.round(n)).toLocaleString();

    if (!d?.mizuho) {
        document.getElementById('content').innerHTML = '<div class="section"><p>No data available</p></div>';
        return;
    }

    let totalExpenses = 0;
    const categoryExpenses = {};

    for (const cat in d.mizuho.fixedExp) {
        let catTotal = 0;
        d.mizuho.fixedExp[cat].actual?.forEach(e => catTotal += e.amount);
        if (catTotal > 0) {
            categoryExpenses[cat] = { actual: catTotal, budget: d.mizuho.fixedExp[cat].budget, type: 'fixed' };
            totalExpenses += catTotal;
        }
    }

    let variableTotal = 0;
    d.mizuho.extras?.forEach(e => variableTotal += e.amount);
    if (variableTotal > 0) {
        categoryExpenses['Variable/Extra'] = { actual: variableTotal, budget: 0, type: 'variable' };
        totalExpenses += variableTotal;
    }

    let income = d.mizuho.salary || 0;
    d.mizuho.additionalIncome?.forEach(i => income += i.amount);
    const expenseRatio = income > 0 ? (totalExpenses / income) * 100 : 0;

    let html = `<div class="section"><div class="section-title">📉 Expense Analysis & Insights - ${app.month}</div>`;
    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#f5576c 0%,#dc3b50 100%);">
        <div class="assets-label">TOTAL MONTHLY EXPENSES</div>
        <div>¥${fmt(totalExpenses)} <span style="font-size:16px;">(${Math.round(expenseRatio)}% of income)</span></div>
    </div>`;

    // Quick stats
    let maxCat = null, maxAmt = 0;
    for (const cat in categoryExpenses) {
        if (categoryExpenses[cat].actual > maxAmt) { maxAmt = categoryExpenses[cat].actual; maxCat = cat; }
    }

    let overBudgetCount = 0;
    for (const cat in categoryExpenses) {
        if (categoryExpenses[cat].type === 'fixed' && categoryExpenses[cat].actual > categoryExpenses[cat].budget) {
            overBudgetCount++;
        }
    }

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0;">
        ${_statCard('#ffebee','#f5576c','🔴 Highest Expense',
            `<div style="font-size:14px;font-weight:600;color:#333;">${maxCat||'N/A'}</div><div style="font-size:20px;font-weight:bold;margin-top:5px;">¥${fmt(maxAmt)}</div>`,
            '', true)}
        ${_statCard('#fff3cd','#856404','⚠️ Over Budget',
            `<div style="font-size:14px;color:#666;">Categories exceeding budget</div><div style="font-size:20px;font-weight:bold;margin-top:5px;">${overBudgetCount} categories</div>`,
            '', true)}
        ${_statCard('#e3f2fd','#667eea','💰 Expense Ratio',
            `<div style="font-size:14px;color:#666;">Of total income</div><div style="font-size:20px;font-weight:bold;margin-top:5px;">${Math.round(expenseRatio)}%</div>`,
            '', true)}
    </div>`;

    // Category bars
    html += `<div class="section"><div class="section-title">📊 Expense Breakdown by Category</div>
        <div style="background:#f8f9fa;padding:20px;border-radius:10px;">`;

    Object.entries(categoryExpenses)
        .sort((a, b) => b[1].actual - a[1].actual)
        .forEach(([cat, data]) => {
            const pct    = totalExpenses > 0 ? (data.actual / totalExpenses) * 100 : 0;
            const isOver = data.type === 'fixed' && data.actual > data.budget;

            html += `<div style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <div style="font-weight:600;color:#333;">${cat}${isOver ? ' ⚠️' : ''}</div>
                    <div style="font-weight:600;">¥${fmt(data.actual)} <span style="color:#999;font-size:12px;">(${Math.round(pct)}%)</span></div>
                </div>`;

            if (data.type === 'fixed') {
                const budgetUsage = data.budget > 0 ? (data.actual / data.budget) * 100 : 0;
                html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:3px;">
                    <div style="flex:1;background:#e0e0e0;height:25px;border-radius:5px;overflow:hidden;">
                        <div style="background:${isOver ? '#f5576c' : '#43e97b'};height:100%;width:${Math.min(budgetUsage,100)}%;"></div>
                    </div>
                    <div style="min-width:80px;text-align:right;font-size:12px;color:#666;">¥${fmt(data.budget)} budget</div>
                </div>`;
            } else {
                html += `<div style="background:#667eea;height:20px;border-radius:5px;width:${pct}%;"></div>`;
            }
            html += '</div>';
        });
    html += '</div></div>';

    // Subcategory analysis
    const subcats = {};
    for (const cat in d.mizuho.fixedExp) {
        d.mizuho.fixedExp[cat].actual?.forEach(exp => {
            if (!exp.subcategory) return;
            if (!subcats[exp.subcategory]) subcats[exp.subcategory] = { total: 0, count: 0, items: [] };
            subcats[exp.subcategory].total += exp.amount;
            subcats[exp.subcategory].count++;
            subcats[exp.subcategory].items.push({ date: exp.date, amount: exp.amount, category: cat, desc: exp.desc || '-' });
        });
    }

    if (Object.keys(subcats).length > 0) {
        window.subcategoryExpensesData = subcats;
        const sortedSubs = Object.entries(subcats).sort((a, b) => b[1].total - a[1].total);

        html += `<div class="section"><div class="section-title">🏷️ Subcategory Expense Analysis</div>
            <div style="background:#f8f9fa;padding:20px;border-radius:10px;">
                <div style="margin-bottom:20px;">
                    <label style="font-weight:600;color:#333;margin-bottom:10px;display:block;">Select Subcategory:</label>
                    <select id="subcategoryFilter" onchange="app.filterSubcategoryExpenses()"
                            style="width:100%;max-width:300px;padding:10px;font-size:14px;border-radius:5px;border:1px solid #ddd;">
                        <option value="">-- Choose a subcategory --</option>
                        ${sortedSubs.map(([k, v]) => `<option value="${k}">${k} (¥${fmt(v.total)})</option>`).join('')}
                    </select>
                </div>
                <div id="subcategoryDetails" style="display:none;"></div>
            </div>
        </div>`;
    }

    // AI insights
    html += `<div class="section"><div class="section-title">💡 Intelligent Insights & Suggestions</div>
        <div style="background:#f8f9fa;padding:20px;border-radius:10px;">`;

    _generateInsights(categoryExpenses, income, totalExpenses).forEach(insight => {
        const color = insight.type === 'warning' ? '#ff9800'
                    : insight.type === 'alert'   ? '#f5576c'
                    : insight.type === 'success'  ? '#43e97b'
                    : '#667eea';
        html += `<div style="background:white;padding:15px;margin-bottom:15px;border-radius:8px;border-left:4px solid ${color};">
            <div style="display:flex;align-items:start;gap:10px;">
                <div style="font-size:24px;">${insight.icon}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;color:#333;margin-bottom:5px;">${insight.title}</div>
                    <div style="color:#666;font-size:14px;margin-bottom:8px;">${insight.description}</div>
                    ${insight.action
                        ? `<div style="background:#e8eaf6;padding:10px;border-radius:5px;font-size:13px;"><strong>💡 Suggestion:</strong> ${insight.action}</div>`
                        : ''}
                </div>
            </div>
        </div>`;
    });
    html += '</div></div>';

    // Historical trend
    const months = Object.keys(app.data).sort();
    if (months.length > 1) {
        const curIdx      = months.indexOf(app.month);
        const recentMonths = months.slice(Math.max(0, curIdx - 2), curIdx + 1);
        let maxExp = 0;
        const mData = recentMonths.map(m => {
            const total = calculateMizuhoExpenses(app.data, m);
            maxExp = Math.max(maxExp, total);
            return { month: m, total };
        });

        html += `<div class="section"><div class="section-title">📈 Historical Trend (Last 3 Months)</div>
            <div style="background:#f5f5f5;padding:20px;border-radius:10px;">`;

        mData.forEach(({ month, total }) => {
            const w         = maxExp > 0 ? (total / maxExp) * 100 : 0;
            const isCurrent = month === app.month;
            html += `<div style="margin-bottom:15px;">
                <div style="font-size:13px;color:#666;margin-bottom:5px;font-weight:${isCurrent ? '700' : '500'};">${month}${isCurrent ? ' (Current)' : ''}</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="flex:1;background:#e0e0e0;height:30px;border-radius:5px;overflow:hidden;">
                        <div style="background:${isCurrent ? '#667eea' : '#43e97b'};height:100%;width:${w}%;display:flex;align-items:center;padding-left:10px;color:white;font-weight:600;font-size:13px;">¥${fmt(total)}</div>
                    </div>
                </div>
            </div>`;
        });

        if (mData.length >= 2) {
            const change        = mData[mData.length-1].total - mData[mData.length-2].total;
            const changePct     = mData[mData.length-2].total > 0 ? (change / mData[mData.length-2].total) * 100 : 0;
            const increased     = change > 0;
            html += `<div style="margin-top:15px;padding:15px;background:${increased ? '#ffebee' : '#e8f5e9'};border-radius:8px;">
                <strong>${increased ? '📈 Increased' : '📉 Decreased'} by ¥${fmt(Math.abs(change))}</strong>
                <span style="color:#666;"> (${change > 0 ? '+' : ''}${Math.round(changePct)}%) from last month</span>
            </div>`;
        }

        html += `</div></div>`;
    }

    html += '</div>';
    document.getElementById('content').innerHTML = html;
}

export function filterSubcategoryExpenses(app) {
    const selected   = document.getElementById('subcategoryFilter').value;
    const container  = document.getElementById('subcategoryDetails');
    const fmt        = n => Number(Math.round(n)).toLocaleString();

    if (!selected || !window.subcategoryExpensesData) { container.style.display = 'none'; return; }
    const data = window.subcategoryExpensesData[selected];
    if (!data) { container.style.display = 'none'; return; }

    const avg = data.count > 0 ? data.total / data.count : 0;
    let html = `<div style="background:white;padding:20px;border-radius:10px;margin-bottom:20px;border-left:4px solid #667eea;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
            ${_statCard('transparent','#667eea','Total Spent',`¥${fmt(data.total)}`, '', true)}
            ${_statCard('transparent','#667eea','# of Expenses',`${data.count}`, '', true)}
            ${_statCard('transparent','#667eea','Avg per Expense',`¥${fmt(avg)}`, '', true)}
        </div>
    </div>
    <div style="background:white;padding:20px;border-radius:10px;">
        <h4 style="color:#333;margin-bottom:15px;">📋 Detailed Breakdown</h4>
        <div class="table-container"><table>
        <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>`;

    data.items.sort((a, b) => a.date.localeCompare(b.date)).forEach(item => {
        html += `<tr><td>${item.date}</td><td>${item.category}</td><td>¥${fmt(item.amount)}</td><td>${item.desc}</td></tr>`;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
    container.style.display = 'block';
}

// ── Shared helpers ────────────────────────────────────────────
function _statCard(bg, textColor, label, value, sub = '', raw = false) {
    return `<div style="background:${bg};padding:20px;border-radius:10px;">
        <h4 style="color:${textColor};margin-bottom:10px;">${label}</h4>
        ${raw ? value : `<div style="font-size:24px;font-weight:bold;">${value}</div>`}
        ${sub ? `<div style="font-size:12px;color:#666;margin-top:5px;">${sub}</div>` : ''}
    </div>`;
}

function _breakdownRow(color, label, sub, value, valueColor) {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:white;border-radius:8px;margin-bottom:10px;border-left:4px solid ${color};">
        <div><strong>${label}</strong>${sub ? `<div style="font-size:11px;color:#666;font-weight:normal;margin-top:3px;">${sub}</div>` : ''}</div>
        <div style="font-size:18px;font-weight:bold;color:${valueColor};">${value}</div>
    </div>`;
}

function _collectMonthExpenses(app, d) {
    const result = {};
    const add = (name, arr) => {
        if (!arr?.length) return;
        const total = arr.reduce((s, e) => s + e.amount, 0);
        if (total > 0) result[name] = (result[name] || 0) + total;
    };

    if (d.mizuho) {
        let mTotal = 0;
        for (const cat in d.mizuho.fixedExp) d.mizuho.fixedExp[cat].actual?.forEach(e => mTotal += e.amount);
        d.mizuho.extras?.forEach(e => mTotal += e.amount);
        if (mTotal > 0) result['Mizuho'] = mTotal;
    }

    add('Yucho',       d.yucho?.expenses);
    add('SLSenfin',    d.slsenfin?.expenses);
    add('Rakuten',     d.rakuten?.expenses);
    add('7-11 Account', d.medfun?.expenses);

    app.customAccounts?.forEach(ca => add(ca.name, d[ca.id]?.expenses));

    return result;
}

function _generateInsights(categoryExpenses, income, totalExpenses) {
    const insights = [];
    const ratio    = income > 0 ? (totalExpenses / income) * 100 : 0;

    if (ratio > 80) {
        insights.push({ type: 'alert', icon: '🚨', title: 'High Expense Ratio',
            description: `Spending ${Math.round(ratio)}% of income — only ${Math.round(100 - ratio)}% left for savings.`,
            action: 'Try to bring expenses under 70%. Focus on the highest categories first.' });
    } else if (ratio > 70) {
        insights.push({ type: 'warning', icon: '⚠️', title: 'Moderate Expense Ratio',
            description: `${Math.round(ratio)}% of income spent — limited room for savings.`,
            action: 'Review variable expenses and tighten budgets for non-essentials.' });
    } else {
        insights.push({ type: 'success', icon: '✅', title: 'Healthy Expense Ratio',
            description: `Only ${Math.round(ratio)}% spent — ${Math.round(100 - ratio)}% available for savings.`,
            action: 'Keep this discipline and consider increasing Yucho fund contributions.' });
    }

    const overBudget = Object.entries(categoryExpenses)
        .filter(([, d]) => d.type === 'fixed' && d.actual > d.budget)
        .map(([cat, d]) => ({ name: cat, overspend: d.actual - d.budget, pct: ((d.actual - d.budget) / d.budget) * 100 }))
        .sort((a, b) => b.overspend - a.overspend);

    if (overBudget.length > 0) {
        const top = overBudget[0];
        insights.push({ type: 'warning', icon: '💸', title: 'Budget Overspend Detected',
            description: `${top.name} exceeded budget by ¥${Number(Math.round(top.overspend)).toLocaleString()} (${Math.round(top.pct)}% over).`,
            action: `Review ${top.name} spending. Consider daily/weekly limits or cheaper alternatives.` });
    }

    let maxCat = null, maxAmt = 0;
    for (const cat in categoryExpenses) {
        if (categoryExpenses[cat].actual > maxAmt) { maxAmt = categoryExpenses[cat].actual; maxCat = cat; }
    }
    if (maxCat) {
        const pct = (maxAmt / totalExpenses) * 100;
        if (pct > 30) {
            insights.push({ type: 'info', icon: '📊', title: 'Dominant Expense Category',
                description: `${maxCat} accounts for ${Math.round(pct)}% of total expenses.`,
                action: 'Even small reductions here will significantly impact total savings.' });
        }
    }

    const sorted = Object.entries(categoryExpenses).sort((a, b) => a[1].actual - b[1].actual);
    if (sorted.length > 0 && sorted[0][1].type === 'fixed' && sorted[0][1].actual < sorted[0][1].budget) {
        const [cat, data] = sorted[0];
        insights.push({ type: 'success', icon: '🌟', title: 'Great Budget Control!',
            description: `Well under budget for ${cat} (¥${Number(Math.round(data.actual)).toLocaleString()} of ¥${Number(Math.round(data.budget)).toLocaleString()}).`,
            action: 'Apply the same mindset to other categories!' });
    }

    return insights;
}
