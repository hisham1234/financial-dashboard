// ============================================================
// accounts/standard.js — Generic account view (slsenfin / rakuten / medfun / custom)
// ============================================================

export function renderStandardAccount(app, account) {
    const d       = app.data[app.month][account];
    const accName = _accountName(app, account);
    const balance = app.calculateStandardBalance(account);

    let html = `<div class="section"><div class="section-title">💼 ${accName}</div>`;
    html += `<div class="assets-banner" style="margin-bottom:20px;">
        <div class="assets-label">Current Balance</div>
        <div>¥${app.fmt(balance)}</div>
    </div>`;

    // ── Starting balance ──
    html += `<div class="section"><div class="section-title">💰 Initial Balance</div>
        <div class="table-container"><table><thead><tr><th>Type</th><th>Amount</th></tr></thead><tbody>
        <tr><td>Starting Balance</td>
            <td>¥<span class="editable" onclick="app.editStandardAccountBalance('${account}',${d.balance||0})" title="Click to edit">
                ${app.fmt(d.balance||0)}</span>
            </td>
        </tr>
        </tbody></table></div></div>`;

    // ── Income ──
    html += `<div class="section"><div class="section-title">💰 Income</div>
        <div class="table-container"><table>
        <thead><tr><th>Date</th><th>Source</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>`;

    if (!d.income?.length) {
        html += '<tr><td colspan="5" style="text-align:center;color:#999">No income</td></tr>';
    } else {
        d.income.forEach((inc, idx) => {
            html += `<tr>
                <td><span class="editable" onclick="app.editStandardIncomeField(this,'${account}',${idx},'date','${inc.date}')">${inc.date}</span></td>
                <td><span class="editable" onclick="app.editStandardIncomeField(this,'${account}',${idx},'source','${(inc.source||'').replace(/'/g,"\\'")}')">${inc.source||'-'}</span></td>
                <td>¥<span class="editable" onclick="app.editStandardIncomeField(this,'${account}',${idx},'amount',${inc.amount})">${app.fmt(inc.amount)}</span></td>
                <td><span class="editable" onclick="app.editStandardIncomeField(this,'${account}',${idx},'desc','${(inc.desc||'').replace(/'/g,"\\'")}')">${inc.desc||'-'}</span></td>
                <td><button class="btn btn-delete btn-small" onclick="app.deleteStandardIncomeItem('${account}',${idx})">×</button></td>
            </tr>`;
        });
    }

    html += `<tr class="inline-add-row">
        <td><input type="date" id="newStdIncDate" value="${new Date().toISOString().split('T')[0]}"></td>
        <td><input type="text" id="newStdIncSource" placeholder="Source" style="width:120px;"></td>
        <td><input type="number" id="newStdIncAmt" placeholder="Amount" style="width:100px;"></td>
        <td style="display:flex;gap:10px;">
            <input type="text" id="newStdIncDesc" placeholder="Description" style="flex:1;">
            <button class="btn btn-success btn-small" onclick="app.addStandardIncome('${account}')">➕ Add</button>
        </td>
        <td></td>
    </tr>`;
    html += '</tbody></table></div></div>';

    // ── Expenses ──
    html += `<div class="section"><div class="section-title">📉 Expenses</div>
        <div class="table-container"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>`;

    if (!d.expenses?.length) {
        html += '<tr><td colspan="4" style="text-align:center;color:#999">No expenses yet</td></tr>';
    } else {
        d.expenses.forEach((exp, idx) => {
            html += `<tr>
                <td><span class="editable" onclick="app.editStandardExpenseField(this,'${account}',${idx},'date','${exp.date}')">${exp.date}</span></td>
                <td>¥<span class="editable" onclick="app.editStandardExpenseField(this,'${account}',${idx},'amount',${exp.amount})">${app.fmt(exp.amount)}</span></td>
                <td>
                    <span class="editable" onclick="app.editStandardExpenseField(this,'${account}',${idx},'desc','${(exp.desc||'').replace(/'/g,"\\'")}')">${exp.desc||'-'}</span>
                </td>
                <td><button class="btn btn-delete btn-small" onclick="app.deleteStandardExpenseItem('${account}',${idx})">×</button></td>
            </tr>`;
        });
    }

    html += `<tr class="inline-add-row">
        <td><input type="date" id="newStdExpDate" value="${new Date().toISOString().split('T')[0]}"></td>
        <td><input type="number" id="newStdExpAmt" placeholder="Amount" style="width:100px;"></td>
        <td style="display:flex;gap:10px;">
            <input type="text" id="newStdExpDesc" placeholder="Description" style="flex:1;">
            <button class="btn btn-success btn-small" onclick="app.addStandardExpense('${account}')">➕ Add</button>
        </td>
        <td></td>
    </tr>`;
    html += '</tbody></table></div></div>';

    // ── Transfers ──
    html += `<div class="section"><div class="section-title">💸 Transfer History</div>
        <div class="table-container"><table>
        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Account</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>`;

    if (!d.transfers?.length) {
        html += '<tr><td colspan="6" style="text-align:center;color:#999">No transfers yet</td></tr>';
    } else {
        d.transfers.forEach((t, idx) => {
            const isOut      = t.type === 'out';
            const otherAcct  = isOut ? t.toAccount : t.fromAccount;
            const otherName  = _accountName(app, otherAcct);

            html += `<tr style="background:${isOut ? '#fff3cd' : '#d4edda'};">
                <td>${t.date}</td>
                <td>${isOut ? '🔴 Out' : '🟢 In'}</td>
                <td>¥${app.fmt(t.amount)}</td>
                <td>${otherName}</td>
                <td>${t.desc||'-'}</td>
                <td style="white-space:nowrap;">
                    ${isOut && otherAcct === 'yucho'
                        ? `<button class="btn btn-small" onclick="app.editTransferFund('${account}',${idx})" style="margin-right:4px;" title="Edit fund">✏️</button>`
                        : ''}
                    <button class="btn btn-delete btn-small" onclick="app.deleteTransfer('${account}',${idx})">🗑️</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table></div></div></div>';

    document.getElementById('content').innerHTML = html;
}

// ── CRUD ─────────────────────────────────────────────────────
export function addStandardIncome(app, account) {
    const date   = document.getElementById('newStdIncDate').value;
    const source = document.getElementById('newStdIncSource').value.trim();
    const amount = parseFloat(document.getElementById('newStdIncAmt').value);
    const desc   = document.getElementById('newStdIncDesc').value.trim();

    if (!date || !source || !amount || isNaN(amount) || amount <= 0) {
        app.msg('⚠️ Please fill all required fields with valid data', true); return;
    }

    if (!app.data[app.month][account].income) app.data[app.month][account].income = [];
    app.data[app.month][account].income.push({ id: Date.now(), date, source, amount, desc });
    app.render();
    app.msg(`✅ Income added (¥${app.fmt(amount)})`);
    app.saveData();
}

export function addStandardExpense(app, account) {
    const date   = document.getElementById('newStdExpDate').value;
    const amount = parseFloat(document.getElementById('newStdExpAmt').value);
    const desc   = document.getElementById('newStdExpDesc').value.trim();

    if (!date || !amount || isNaN(amount) || amount <= 0) {
        app.msg('⚠️ Please fill all required fields with valid data', true); return;
    }

    if (!app.data[app.month][account].expenses) app.data[app.month][account].expenses = [];
    app.data[app.month][account].expenses.push({ id: Date.now(), date, amount, desc });
    app.render();
    app.msg(`✅ Expense added (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteStandardIncomeItem(app, account, index) {
    const amount = app.data[app.month][account].income[index].amount;
    app.data[app.month][account].income.splice(index, 1);
    app.render();
    app.msg(`✅ Income deleted (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteStandardExpenseItem(app, account, index) {
    const amount = app.data[app.month][account].expenses[index].amount;
    app.data[app.month][account].expenses.splice(index, 1);
    app.render();
    app.msg(`✅ Expense deleted (¥${app.fmt(amount)})`);
    app.saveData();
}

// ── Inline edit ───────────────────────────────────────────────
export function editStandardIncomeField(app, element, account, index, field, currentValue) {
    _inlineEdit(app, element, field, currentValue,
        v => { app.data[app.month][account].income[index][field] = v; });
}

export function editStandardExpenseField(app, element, account, index, field, currentValue) {
    _inlineEdit(app, element, field, currentValue,
        v => { app.data[app.month][account].expenses[index][field] = v; });
}

export function editStandardAccountBalance(app, account, current) {
    let modal = document.getElementById('standardBalanceEditModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'standardBalanceEditModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="app.closeStandardBalanceEditModal()">&times;</span>
                <div class="modal-header">💰 Edit Initial Balance</div>
                <div class="form-group">
                    <label id="standardBalanceLabel"></label>
                    <input type="number" id="standardBalanceEditValue" style="width:100%;padding:10px;font-size:16px;">
                </div>
                <button class="btn btn-success" onclick="app.saveStandardBalanceEdit()" style="margin-top:15px;">✅ Save</button>
                <button class="btn" onclick="app.closeStandardBalanceEditModal()">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('standardBalanceLabel').textContent = 'Initial balance for ' + _accountName(app, account) + ':';
    document.getElementById('standardBalanceEditValue').value = current;
    app._editingStandardAccount = account;
    modal.style.display = 'block';
    setTimeout(() => { const i = document.getElementById('standardBalanceEditValue'); i.focus(); i.select(); }, 100);
}

export function closeStandardBalanceEditModal(app) {
    const modal = document.getElementById('standardBalanceEditModal');
    if (modal) modal.style.display = 'none';
}

export function saveStandardBalanceEdit(app) {
    const value = parseFloat(document.getElementById('standardBalanceEditValue').value);
    if (!isNaN(value) && app._editingStandardAccount) {
        app.data[app.month][app._editingStandardAccount].balance = value;
        app.render();
        app.msg(`✅ Initial balance updated: ¥${app.fmt(value)}`);
        app.saveData();
        closeStandardBalanceEditModal(app);
    } else {
        app.msg('⚠️ Please enter a valid number', true);
    }
}

// ── Shared inline-edit helper ─────────────────────────────────
function _inlineEdit(app, element, field, currentValue, onSave) {
    if (app._editingCell) return;
    app._editingCell = element;

    let input;
    if (field === 'date') {
        input = Object.assign(document.createElement('input'), { type: 'date', value: currentValue });
    } else if (field === 'amount') {
        input = Object.assign(document.createElement('input'), { type: 'number', value: currentValue });
    } else {
        input = Object.assign(document.createElement('input'), { type: 'text', value: currentValue === '-' ? '' : currentValue });
    }
    Object.assign(input.style, { padding: '4px', fontSize: '14px', width: '100%' });

    const save = () => {
        const v = input.value;
        if (v) {
            onSave(field === 'amount' ? parseFloat(v) : v);
            app.saveData();
            app.render();
            app.msg('✅ Updated');
        } else {
            element.textContent = field === 'amount' ? app.fmt(currentValue) : (currentValue === '-' ? '-' : currentValue);
        }
        app._editingCell = null;
    };

    input.onblur = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select?.();
}

function _accountName(app, id) {
    const names = { mizuho: 'Mizuho', yucho: 'Yucho', slsenfin: 'SLSenfin', rakuten: 'Rakuten', medfun: '7-11 Account (Med & Fun)' };
    return names[id] || app.customAccounts?.find(a => a.id === id)?.name || id;
}
