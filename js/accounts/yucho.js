// ============================================================
// accounts/yucho.js — Yucho investment funds view + CRUD
// ============================================================

export function renderYucho(app) {
    const d = app.data[app.month].yucho;
    let html = '';

    // ── Funds table ──
    html += '<div class="section"><div class="section-title">📊 Yucho Investment Funds</div>';
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#666;cursor:pointer;">
            <input type="checkbox" ${app.hideZeroYuchoFunds ? 'checked' : ''} onchange="app.toggleHideZeroYuchoFunds(this.checked)">
            Hide funds with zero balance
        </label>
    </div>`;
    html += '<div class="table-container"><table><thead><tr><th>Fund</th><th>Initial</th><th>Additions</th><th>Expenses</th><th>Transfers</th><th>Current</th><th>Actions</th></tr></thead><tbody>';

    let grandTotal = 0;
    let visibleCount = 0;
    d.funds.forEach((f, i) => {
        let add = 0, exp = 0, tOut = 0, tIn = 0;
        d.additions?.forEach(a => { if (a.fundIdx === i) add += a.amount; });
        d.expenses?.forEach(e => { if (e.fundIdx === i) exp += e.amount; });
        d.transfers?.forEach(t => {
            if (t.fundIdx === i) {
                if (t.type === 'out') tOut += t.amount; else tIn += t.amount;
            }
        });
        const net     = tIn - tOut;
        const current = f.balance + add - exp + net;

        if (app.hideZeroYuchoFunds && current === 0) return;

        visibleCount++;
        grandTotal += current;

        html += `<tr>
            <td><strong>
                <span class="editable" onclick="app.editFundName(${i},'${f.name.replace(/'/g,"\\'")}')" title="Click to edit">${f.name}</span>
            </strong></td>
            <td>¥<span class="editable" onclick="app.editFundBalance(${i},${f.balance})" title="Click to edit">${app.fmt(f.balance)}</span></td>
            <td>¥${app.fmt(add)}</td>
            <td>¥${app.fmt(exp)}</td>
            <td style="color:${net >= 0 ? '#43e97b' : '#f5576c'}">¥${app.fmt(net)}</td>
            <td style="font-weight:bold;">¥${app.fmt(current)}</td>
            <td><button class="btn btn-delete btn-small" onclick="app.deleteFund(${i})">🗑️</button></td>
        </tr>`;
    });

    if (!visibleCount) {
        html += '<tr><td colspan="7" style="text-align:center;color:#999;">No funds to display</td></tr>';
    }

    html += `<tr class="total-row"><td colspan="5">Total Balance</td><td>¥${app.fmt(grandTotal)}</td><td></td></tr>`;
    html += `<tr class="inline-add-row">
        <td><input type="text" id="newFundName" placeholder="New fund name" style="width:150px;"></td>
        <td><input type="number" id="newFundBalance" placeholder="Initial balance" style="width:120px;"></td>
        <td colspan="4" style="color:#999;font-size:11px;">Create a new investment fund</td>
        <td><button class="btn btn-success btn-small" onclick="app.addNewFund()">➕ Add Fund</button></td>
    </tr>`;
    html += '</tbody></table></div></div>';

    // ── Direct Deposits ──
    html += '<div class="section"><div class="section-title">💰 Direct Deposits to Funds</div>';
    html += '<div class="table-container"><table><thead><tr><th>Date</th><th>Fund</th><th>Amount</th><th>Source</th><th>Actions</th></tr></thead><tbody>';

    if (!d.additions?.length) {
        html += '<tr><td colspan="5" style="text-align:center;color:#999">No deposits yet</td></tr>';
    } else {
        d.additions.forEach((a, idx) => {
            html += `<tr style="background:#d4edda;">
                <td><span class="editable" onclick="app.editYuchoDepositField(this,${idx},'date','${a.date}')">${a.date}</span></td>
                <td>${a.fundName}</td>
                <td>¥<span class="editable" onclick="app.editYuchoDepositField(this,${idx},'amount',${a.amount})">${app.fmt(a.amount)}</span></td>
                <td>
                    <span class="editable" onclick="app.editYuchoDepositField(this,${idx},'source','${(a.source||'').replace(/'/g,"\\'")}')">${a.source||'-'}</span>
                    <button class="btn btn-delete btn-small" onclick="app.deleteYuchoDepositItem(${idx})">×</button>
                </td>
                <td></td>
            </tr>`;
        });
    }

    const totalDeposits = d.additions?.reduce((s, a) => s + a.amount, 0) || 0;
    html += `<tr class="total-row">
        <td colspan="2"><strong>Total Deposits</strong></td>
        <td><strong>¥${app.fmt(totalDeposits)}</strong></td>
        <td colspan="2"></td>
    </tr>`;

    html += `<tr class="inline-add-row">
        <td><input type="date" id="yuchoDepDate" value="${new Date().toISOString().split('T')[0]}"></td>
        <td><select id="yuchoDepFund">${d.funds.map((f,i) => `<option value="${i}">${f.name}</option>`).join('')}</select></td>
        <td><input type="number" id="yuchoDepAmt" placeholder="Amount" style="width:100px;"></td>
        <td style="display:flex;gap:10px;">
            <input type="text" id="yuchoDepSource" placeholder="Source (e.g., Salary, Transfer)" style="flex:1;">
            <button class="btn btn-success btn-small" onclick="app.addYuchoDeposit()">➕ Add</button>
        </td>
        <td></td>
    </tr>`;
    html += '</tbody></table></div></div>';

    // ── Fund Expenses ──
    html += '<div class="section"><div class="section-title">📝 Fund Expenses</div>';
    html += '<div class="table-container"><table><thead><tr><th>Date</th><th>Fund</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead><tbody>';

    if (!d.expenses?.length) {
        html += '<tr><td colspan="5" style="text-align:center;color:#999">No expenses yet</td></tr>';
    } else {
        d.expenses.forEach((e, idx) => {
            html += `<tr>
                <td><span class="editable" onclick="app.editYuchoExpenseField(this,${idx},'date','${e.date}')">${e.date}</span></td>
                <td>${e.fundName}</td>
                <td>¥<span class="editable" onclick="app.editYuchoExpenseField(this,${idx},'amount',${e.amount})">${app.fmt(e.amount)}</span></td>
                <td>
                    <span class="editable" onclick="app.editYuchoExpenseField(this,${idx},'desc','${(e.desc||'').replace(/'/g,"\\'")}')">${e.desc||'-'}</span>
                    <button class="btn btn-delete btn-small" onclick="app.deleteYuchoExpenseItem(${idx})">×</button>
                </td>
                <td></td>
            </tr>`;
        });
    }

    const totalFundExpenses = d.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
    html += `<tr class="total-row">
        <td colspan="2"><strong>Total Expenses</strong></td>
        <td><strong>¥${app.fmt(totalFundExpenses)}</strong></td>
        <td colspan="2"></td>
    </tr>`;

    html += `<tr class="inline-add-row">
        <td><input type="date" id="yuchoExpDate" value="${new Date().toISOString().split('T')[0]}"></td>
        <td><select id="yuchoExpFund">${d.funds.map((f,i) => `<option value="${i}">${f.name}</option>`).join('')}</select></td>
        <td><input type="number" id="yuchoExpAmt" placeholder="Amount" style="width:100px;"></td>
        <td style="display:flex;gap:10px;">
            <input type="text" id="yuchoExpDesc" placeholder="Description" style="flex:1;">
            <button class="btn btn-success btn-small" onclick="app.addYuchoExpense()">➕ Add</button>
        </td>
        <td></td>
    </tr>`;
    html += '</tbody></table></div></div>';

    // ── Transfer History ──
    html += '<div class="section"><div class="section-title">💸 Transfer History</div>';
    html += '<div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Fund</th><th>Amount</th><th>Account</th><th>Description</th><th>Actions</th></tr></thead><tbody>';

    if (!d.transfers?.length) {
        html += '<tr><td colspan="7" style="text-align:center;color:#999">No transfers yet</td></tr>';
    } else {
        d.transfers.forEach((t, idx) => {
            const isOut        = t.type === 'out';
            const isInternal   = t.toAccount === 'yucho' && t.fromAccount === 'yucho';
            const otherName    = isInternal ? '🔄 Internal Transfer' : _accountName(app, isOut ? t.toAccount : t.fromAccount);
            const fundDisplay  = _fundDisplay(d, t, isInternal, isOut);

            html += `<tr style="background:${isOut ? '#fff3cd' : '#d4edda'};">
                <td>${t.date}</td>
                <td>${isOut ? '🔴 Out' : '🟢 In'}</td>
                <td>${fundDisplay}</td>
                <td>¥${app.fmt(t.amount)}</td>
                <td>${otherName}</td>
                <td>${t.desc || '-'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-delete btn-small" onclick="app.deleteTransfer('yucho',${idx})">🗑️</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table></div></div>';

    document.getElementById('content').innerHTML = html;
}

// ── CRUD ─────────────────────────────────────────────────────
export function addYuchoDeposit(app) {
    const date    = document.getElementById('yuchoDepDate').value;
    const fundIdx = parseInt(document.getElementById('yuchoDepFund').value);
    const amount  = parseFloat(document.getElementById('yuchoDepAmt').value);
    const source  = document.getElementById('yuchoDepSource').value.trim();

    if (!date)                           { app.msg('⚠️ Please select a date', true); return; }
    if (!amount || isNaN(amount) || amount <= 0) { app.msg('⚠️ Please enter a valid amount', true); return; }
    if (!source)                         { app.msg('⚠️ Please enter a source', true); return; }

    if (!app.data[app.month].yucho.additions) app.data[app.month].yucho.additions = [];
    app.data[app.month].yucho.additions.push({
        id: Date.now(), date, fundIdx,
        fundName: app.data[app.month].yucho.funds[fundIdx].name,
        amount, source
    });
    app.render();
    app.msg(`✅ Deposit added to ${app.data[app.month].yucho.funds[fundIdx].name} (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteYuchoDepositItem(app, index) {
    const dep = app.data[app.month].yucho.additions[index];
    app.data[app.month].yucho.additions.splice(index, 1);
    app.render();
    app.msg(`✅ Deposit deleted: ${dep.fundName} (¥${app.fmt(dep.amount)})`);
    app.saveData();
}

export function addYuchoExpense(app) {
    const date    = document.getElementById('yuchoExpDate').value;
    const fundIdx = parseInt(document.getElementById('yuchoExpFund').value);
    const amount  = parseFloat(document.getElementById('yuchoExpAmt').value);
    const desc    = document.getElementById('yuchoExpDesc').value.trim();

    if (!date)                           { app.msg('⚠️ Please select a date', true); return; }
    if (!amount || isNaN(amount) || amount <= 0) { app.msg('⚠️ Please enter a valid amount', true); return; }

    if (!app.data[app.month].yucho.expenses) app.data[app.month].yucho.expenses = [];
    app.data[app.month].yucho.expenses.push({
        id: Date.now(), date, fundIdx,
        fundName: app.data[app.month].yucho.funds[fundIdx].name,
        amount, desc: desc || '-'
    });
    app.render();
    app.msg(`✅ Yucho expense added (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteYuchoExpenseItem(app, index) {
    const amount = app.data[app.month].yucho.expenses[index].amount;
    app.data[app.month].yucho.expenses.splice(index, 1);
    app.render();
    app.msg(`✅ Yucho expense deleted (¥${app.fmt(amount)})`);
    app.saveData();
}

// ── Fund management ───────────────────────────────────────────
export function addNewFund(app) {
    const name    = document.getElementById('newFundName').value.trim();
    const balance = parseFloat(document.getElementById('newFundBalance').value);

    if (!name)               { app.msg('⚠️ Please enter a fund name', true); return; }
    if (isNaN(balance) || balance < 0) { app.msg('⚠️ Please enter a valid initial balance', true); return; }
    if (app.data[app.month].yucho.funds.find(f => f.name === name)) {
        app.msg('⚠️ A fund with this name already exists', true); return;
    }

    for (const monthKey in app.data) {
        if (!app.data[monthKey].yucho) {
            app.data[monthKey].yucho = { funds: [], expenses: [], additions: [], transfers: [] };
        }
        if (!app.data[monthKey].yucho.funds) app.data[monthKey].yucho.funds = [];
        app.data[monthKey].yucho.funds.push({
            id: Date.now(), name,
            balance: monthKey === app.month ? (balance || 0) : 0
        });
    }

    app.render();
    app.msg(`✅ New fund added to all months: ${name} (¥${app.fmt(balance || 0)})`);
    app.saveData();
}

export function deleteFund(app, fundIndex) {
    const fundName = app.data[app.month].yucho.funds[fundIndex].name;

    let hasTransactions = false;
    for (const monthKey in app.data) {
        const y = app.data[monthKey].yucho;
        if (!y) continue;
        if (y.expenses?.some(e => e.fundIdx === fundIndex) ||
            y.additions?.some(a => a.fundIdx === fundIndex) ||
            y.transfers?.some(t => t.fundIdx === fundIndex)) {
            hasTransactions = true;
            break;
        }
    }

    let modal = document.getElementById('deleteFundModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteFundModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <span class="close" onclick="app.closeDeleteFundModal()">&times;</span>
                <div class="modal-header">⚠️ Delete Fund</div>
                <p id="deleteFundMsg" style="margin:20px 0;white-space:pre-line;"></p>
                <button class="btn btn-delete" onclick="app.confirmDeleteFund(true)">✓ Yes, Delete</button>
                <button class="btn" onclick="app.confirmDeleteFund(false)">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    let msg = `Are you sure you want to delete "${fundName}"?\n\nThis will delete it from ALL months.`;
    if (hasTransactions) msg += '\n\n⚠️ WARNING: This fund has transaction history that will also be removed.';
    document.getElementById('deleteFundMsg').textContent = msg;
    app._deletingFundIndex = fundIndex;
    modal.style.display = 'block';
}

export function closeDeleteFundModal(app) {
    const modal = document.getElementById('deleteFundModal');
    if (modal) modal.style.display = 'none';
    app._deletingFundIndex = null;
}

export function confirmDeleteFund(app, confirmed) {
    if (confirmed && app._deletingFundIndex !== null) {
        const idx  = app._deletingFundIndex;
        const name = app.data[app.month].yucho.funds[idx].name;

        for (const monthKey in app.data) {
            const y = app.data[monthKey].yucho;
            if (!y?.funds) continue;

            y.funds.splice(idx, 1);

            const reindex = arr => arr
                ?.filter(item => item.fundIdx !== idx)
                .map(item => ({ ...item, fundIdx: item.fundIdx > idx ? item.fundIdx - 1 : item.fundIdx }));

            y.expenses  = reindex(y.expenses)  || [];
            y.additions = reindex(y.additions) || [];
            y.transfers = reindex(y.transfers) || [];
        }

        app.render();
        app.msg(`✅ Fund deleted from all months: ${name}`);
        app.saveData();
    }
    closeDeleteFundModal(app);
}

export function editFundName(app, fundIndex, currentName) {
    let modal = document.getElementById('editFundNameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editFundNameModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="app.closeEditFundNameModal()">&times;</span>
                <div class="modal-header">✏️ Edit Fund Name</div>
                <div class="form-group">
                    <label>Fund Name:</label>
                    <input type="text" id="editFundNameInput" style="width:100%;padding:10px;font-size:16px;">
                </div>
                <button class="btn btn-success" onclick="app.saveEditFundName()" style="margin-top:15px;">✅ Save</button>
                <button class="btn" onclick="app.closeEditFundNameModal()">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('editFundNameInput').value = currentName;
    app._editingFundIndex        = fundIndex;
    app._editingFundOriginalName = currentName;
    modal.style.display = 'block';
    setTimeout(() => { const i = document.getElementById('editFundNameInput'); i.focus(); i.select(); }, 100);
}

export function closeEditFundNameModal(app) {
    const modal = document.getElementById('editFundNameModal');
    if (modal) modal.style.display = 'none';
}

export function saveEditFundName(app) {
    const newName = document.getElementById('editFundNameInput').value.trim();
    if (!newName) { app.msg('⚠️ Please enter a fund name', true); return; }
    if (newName === app._editingFundOriginalName) { closeEditFundNameModal(app); return; }

    const exists = app.data[app.month].yucho.funds.find((f, i) =>
        f.name === newName && i !== app._editingFundIndex);
    if (exists) { app.msg('⚠️ A fund with this name already exists', true); return; }

    const idx = app._editingFundIndex;

    for (const monthKey in app.data) {
        const y = app.data[monthKey].yucho;
        if (!y) continue;

        if (y.funds[idx])      y.funds[idx].name = newName;
        y.expenses?.forEach(e  => { if (e.fundIdx === idx) e.fundName = newName; });
        y.additions?.forEach(a => { if (a.fundIdx === idx) a.fundName = newName; });
        y.transfers?.forEach(t => {
            if (t.fundIdx === idx) {
                if (t.type === 'in') t.fromFundName = newName;
                else                 t.toFundName   = newName;
            }
        });
    }

    app.render();
    app.msg('✅ Fund name updated in all months to: ' + newName);
    app.saveData();
    closeEditFundNameModal(app);
}

export function editFundBalance(app, fundIndex, currentBalance) {
    let modal = document.getElementById('fundBalanceEditModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fundBalanceEditModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="app.closeFundBalanceEditModal()">&times;</span>
                <div class="modal-header">💰 Edit Fund Balance</div>
                <div class="form-group">
                    <label id="fundBalanceLabel"></label>
                    <input type="number" id="fundBalanceEditValue" style="width:100%;padding:10px;font-size:16px;">
                </div>
                <button class="btn btn-success" onclick="app.saveFundBalanceEdit()" style="margin-top:15px;">✅ Save</button>
                <button class="btn" onclick="app.closeFundBalanceEditModal()">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    const fundName = app.data[app.month].yucho.funds[fundIndex].name;
    document.getElementById('fundBalanceLabel').textContent = 'Initial balance for ' + fundName + ':';
    document.getElementById('fundBalanceEditValue').value = currentBalance;
    app._editingFundIndex = fundIndex;
    modal.style.display = 'block';
    setTimeout(() => { const i = document.getElementById('fundBalanceEditValue'); i.focus(); i.select(); }, 100);
}

export function closeFundBalanceEditModal(app) {
    const modal = document.getElementById('fundBalanceEditModal');
    if (modal) modal.style.display = 'none';
}

export function saveFundBalanceEdit(app) {
    const value    = parseFloat(document.getElementById('fundBalanceEditValue').value);
    const fundName = app.data[app.month].yucho.funds[app._editingFundIndex].name;

    if (!isNaN(value) && value >= 0) {
        app.data[app.month].yucho.funds[app._editingFundIndex].balance = value;
        app.render();
        app.msg(`✅ Fund balance updated for ${fundName}: ¥${app.fmt(value)}`);
        app.saveData();
        closeFundBalanceEditModal(app);
    } else {
        app.msg('⚠️ Please enter a valid positive number', true);
    }
}

// ── Inline edit helpers ───────────────────────────────────────
function _makeInput(field, currentValue) {
    let input;
    if (field === 'date') {
        input = Object.assign(document.createElement('input'), { type: 'date', value: currentValue });
        input.style.width = '120px';
    } else if (field === 'amount') {
        input = Object.assign(document.createElement('input'), { type: 'number', value: currentValue });
        input.style.width = '80px';
    } else {
        input = Object.assign(document.createElement('input'), { type: 'text', value: currentValue === '-' ? '' : currentValue });
        input.style.width = '150px';
    }
    input.style.padding = '2px 4px';
    input.style.fontSize = '11px';
    return input;
}

export function editYuchoDepositField(app, element, index, field, currentValue) {
    if (app._editingCell) return;
    app._editingCell = element;
    const input = _makeInput(field, currentValue);

    const save = () => {
        const v = input.value;
        if (field === 'amount' && v) {
            app.data[app.month].yucho.additions[index][field] = parseFloat(v);
        } else if (field !== 'amount') {
            app.data[app.month].yucho.additions[index][field] = v || '-';
        } else { element.textContent = app.fmt(currentValue); app._editingCell = null; return; }
        app.saveData(); app.render(); app.msg('✅ Deposit updated');
        app._editingCell = null;
    };
    input.onblur = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus(); input.select?.();
}

export function editYuchoExpenseField(app, element, index, field, currentValue) {
    if (app._editingCell) return;
    app._editingCell = element;
    const input = _makeInput(field, currentValue);

    const save = () => {
        const v = input.value;
        if (field === 'amount' && v) {
            app.data[app.month].yucho.expenses[index][field] = parseFloat(v);
        } else if (field !== 'amount') {
            app.data[app.month].yucho.expenses[index][field] = v || '-';
        } else { element.textContent = app.fmt(currentValue); app._editingCell = null; return; }
        app.saveData(); app.render(); app.msg('✅ Expense updated');
        app._editingCell = null;
    };
    input.onblur = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus(); input.select?.();
}

// ── Helpers ───────────────────────────────────────────────────
function _accountName(app, id) {
    const names = { mizuho: 'Mizuho', yucho: 'Yucho', slsenfin: 'SLSenfin', rakuten: 'Rakuten', medfun: '7-11 Account' };
    return names[id] || app.customAccounts?.find(a => a.id === id)?.name || id;
}

function _fundDisplay(d, t, isInternal, isOut) {
    if (isInternal) {
        const curName  = (t.fundIdx != null && d.funds[t.fundIdx]) ? d.funds[t.fundIdx].name : '?';
        const otherName = isOut ? (t.toFundName || '?') : (t.fromFundName || '?');
        return isOut ? `${curName} → ${otherName}` : `${otherName} → ${curName}`;
    }
    if (t.fundIdx != null && d.funds[t.fundIdx]) return d.funds[t.fundIdx].name;
    return t.toFundName || t.fromFundName || '-';
}