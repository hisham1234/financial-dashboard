// ============================================================
// accounts/mizuho.js — Mizuho account view + CRUD
// ============================================================

// ── Inline-edit helper (shared pattern) ──────────────────────
function makeEditableInput(field, currentValue) {
    let input;
    if (field === 'date') {
        input = document.createElement('input');
        input.type  = 'date';
        input.value = currentValue;
        input.style.width = '120px';
    } else if (field === 'amount') {
        input = document.createElement('input');
        input.type  = 'number';
        input.value = currentValue;
        input.style.width = '80px';
    } else {
        input = document.createElement('input');
        input.type  = 'text';
        input.value = currentValue === '-' ? '' : currentValue;
        input.style.width = '150px';
    }
    input.style.padding = '2px 4px';
    input.style.fontSize = '11px';
    return input;
}

// ── Main render ───────────────────────────────────────────────
export function renderMizuho(app) {
    const d = app.data[app.month].mizuho;
    let html = '';

    // ── Income table ──
    html += '<div class="section"><div class="section-title">💵 Income & Balance</div>';
    html += '<div class="table-container"><table><thead><tr><th>Type</th><th>Amount</th><th>Actions</th></tr></thead><tbody>';

    html += `<tr><td>Monthly Salary</td>
        <td>¥<span class="editable" onclick="app.editMizuhoSalary(${d.salary})" title="Click to edit">${app.fmt(d.salary)}</span></td>
        <td></td></tr>`;

    html += `<tr><td>Previous Balance</td>
        <td>¥<span class="editable" onclick="app.editMizuhoPrevBal(${d.prevBal})" title="Click to edit">${app.fmt(d.prevBal)}</span></td>
        <td></td></tr>`;

    d.additionalIncome?.forEach((inc, idx) => {
        html += `<tr>
            <td><span class="editable" onclick="app.editMizuhoIncomeField(this,${idx},'type','${(inc.type||'').replace(/'/g,"\\'")}')">
                ${inc.type}</span></td>
            <td>¥<span class="editable" onclick="app.editMizuhoIncomeField(this,${idx},'amount',${inc.amount})">
                ${app.fmt(inc.amount)}</span></td>
            <td><button class="btn btn-delete btn-small" onclick="app.deleteMizuhoIncomeItem(${idx})">×</button></td>
        </tr>`;
    });

    let totalIncome = d.salary + d.prevBal;
    d.additionalIncome?.forEach(inc => totalIncome += inc.amount);

    html += `<tr class="total-row"><td>Total Available</td><td>¥${app.fmt(totalIncome)}</td><td></td></tr>`;
    html += `<tr class="inline-add-row">
        <td><input type="text" id="newMizuhoIncomeType" placeholder="Income type (e.g., Bonus, Refund)" style="width:200px;"></td>
        <td><input type="number" id="newMizuhoIncomeAmt" placeholder="Amount" style="width:120px;"></td>
        <td><button class="btn btn-success btn-small" onclick="app.addMizuhoIncome()">➕ Add</button></td>
    </tr>`;

    html += '</tbody></table></div></div>';

    // ── Monthly balance banner ──
    let mizuhoIncome = d.salary;
    d.additionalIncome?.forEach(inc => mizuhoIncome += inc.amount);

    let totalFixed = 0;
    for (const cat in d.fixedExp) d.fixedExp[cat].actual?.forEach(e => totalFixed += e.amount);
    let totalExtra = 0;
    d.extras?.forEach(e => totalExtra += e.amount);

    let tout = 0, tin = 0;
    d.transfers?.forEach(t => { if (t.type === 'out') tout += t.amount; else tin += t.amount; });

    const monthlyBal = mizuhoIncome - totalFixed - totalExtra - tout + tin;

    html += `<div class="assets-banner" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);margin-bottom:20px;">
        <div class="assets-label">💰 MONTHLY BALANCE (Current Month Income Only)</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:32px;font-weight:bold;">¥${app.fmt(monthlyBal)}</div>
            <div style="font-size:14px;opacity:0.9;">
                Income: ¥${app.fmt(mizuhoIncome)} -
                Expenses: ¥${app.fmt(totalFixed + totalExtra)} -
                Net Transfers: ¥${app.fmt(tout - tin)}
            </div>
        </div>
    </div>`;

    // ── Transfer history ──
    html += _renderTransferHistory(app, d);

    // ── Fixed expenses ──
    html += _renderFixedExpenses(app, d);

    // ── Extra expenses ──
    html += _renderExtraExpenses(app, d);

    document.getElementById('content').innerHTML = html;
}

function _renderTransferHistory(app, d) {
    let html = '<div class="section"><div class="section-title">💸 Transfer History</div>';
    html += '<div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Account</th><th>Fund</th><th>Description</th><th>Actions</th></tr></thead><tbody>';

    if (!d.transfers?.length) {
        html += '<tr><td colspan="7" style="text-align:center;color:#999">No transfers yet</td></tr>';
    } else {
        d.transfers.forEach((t, idx) => {
            const isOut     = t.type === 'out';
            const other     = isOut ? t.toAccount : t.fromAccount;
            const otherName = _accountName(app, other);

            let fundName = '-';
            if (isOut && other === 'yucho') {
                if (t.toFundName) fundName = t.toFundName;
                else if (t.fundIdx != null && app.data[app.month].yucho?.funds[t.fundIdx]) {
                    fundName = app.data[app.month].yucho.funds[t.fundIdx].name;
                }
            }

            html += `<tr style="background:${isOut ? '#fff3cd' : '#d4edda'};">
                <td>${t.date}</td>
                <td>${isOut ? '🔴 Out' : '🟢 In'}</td>
                <td>¥${app.fmt(t.amount)}</td>
                <td>${otherName}</td>
                <td>${fundName}</td>
                <td>${t.desc || '-'}</td>
                <td>
                    ${isOut && other === 'yucho' && t.fundIdx == null
                        ? `<button class="btn btn-small" onclick="app.editTransferFund('mizuho',${idx})" style="margin-right:4px;">✏️</button>`
                        : ''}
                    <button class="btn btn-delete btn-small" onclick="app.deleteTransfer('mizuho',${idx})">🗑️</button>
                </td>
            </tr>`;
        });
    }

    let transfersOut = 0, transfersIn = 0;
    d.transfers?.forEach(t => { if (t.type === 'out') transfersOut += t.amount; else transfersIn += t.amount; });

    html += `<tr class="total-row">
        <td colspan="2"><strong>Totals</strong></td>
        <td><strong>Out: ¥${app.fmt(transfersOut)} | In: ¥${app.fmt(transfersIn)}</strong></td>
        <td colspan="4" style="color:#667eea;"><strong>Net: ¥${app.fmt(transfersIn - transfersOut)}</strong></td>
    </tr>`;
    html += '</tbody></table></div></div>';
    return html;
}

function _renderFixedExpenses(app, d) {
    let html = '<div class="section"><div class="section-title">📊 Fixed Monthly Expenses</div>';
    html += '<div class="table-container"><table><thead><tr><th>Category</th><th>Budget</th><th>Actual</th><th>Remaining</th><th>Details</th><th>Quick Add</th></tr></thead><tbody>';

    let totalBudget = 0, totalActual = 0;

    for (const cat in d.fixedExp) {
        const catData = d.fixedExp[cat];
        const budget  = catData.budget;
        let actual    = 0;
        catData.actual?.forEach(e => actual += e.amount);
        const remaining = budget - actual;
        totalBudget += budget;
        totalActual += actual;

        const catId = cat.replace(/\s/g, '-');

        // Find subcategories from master categories list
        const catInfo = app.categories.find(c => c.name === cat);

        html += `<tr>
            <td>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:500;">${cat}</span>
                    <button class="btn btn-delete btn-small" onclick="app.deleteFixedCategory('${cat}')" style="margin-left:10px;">🗑️</button>
                </div>
            </td>
            <td><span class="editable" onclick="app.editBudget('${cat}',${budget})" title="Click to edit">¥${app.fmt(budget)}</span></td>
            <td>¥${app.fmt(actual)}</td>
            <td style="color:${remaining >= 0 ? '#43e97b' : '#f5576c'}">¥${app.fmt(Math.abs(remaining))}</td>
            <td>`;

        catData.actual?.forEach((exp, idx) => {
            html += `<div style="font-size:11px;margin:2px 0;display:flex;gap:5px;align-items:center;">
                <span class="editable" onclick="app.editExpenseField(this,'${cat}',${idx},'date','${exp.date}')">${exp.date}</span>
                : ¥
                <span class="editable" onclick="app.editExpenseField(this,'${cat}',${idx},'amount',${exp.amount})">${app.fmt(exp.amount)}</span>
                ${exp.subcategory ? `<span class="subcategory-badge">${exp.subcategory}</span>` : ''}
                ${exp.desc ? ` - <span class="editable" onclick="app.editExpenseField(this,'${cat}',${idx},'desc','${(exp.desc||'').replace(/'/g,"\\'")}')">${exp.desc}</span>` : ''}
                <button class="btn btn-delete btn-small" onclick="app.deleteFixedExpenseItem('${cat}',${idx})" style="margin-left:auto;">×</button>
            </div>`;
        });

        html += `</td>
            <td><button class="quick-add-btn" onclick="app.quickAddFixed('${cat}')">+ Add</button></td>
        </tr>`;

        // Inline add row
        html += `<tr id="add-${catId}" class="inline-add-row" style="display:none;">
            <td colspan="6"><div style="display:flex;gap:10px;align-items:center;padding:10px;">
                <input type="date" id="date-${catId}" style="width:150px;" value="${new Date().toISOString().split('T')[0]}">
                <input type="number" id="amt-${catId}" placeholder="Amount" style="width:100px;">`;

        if (catInfo?.subcategories?.length > 0) {
            html += `<select id="subcat-${catId}" style="width:120px;">
                <option value="">-Subcategory-</option>
                ${catInfo.subcategories.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>`;
        }

        html += `<input type="text" id="desc-${catId}" placeholder="Description (optional)" style="width:200px;">
                <button class="btn btn-success btn-small" onclick="app.saveQuickFixed('${cat}')">Save</button>
                <button class="btn btn-small" onclick="app.cancelQuickAdd('${cat}')">Cancel</button>
            </div></td>
        </tr>`;
    }

    html += `<tr class="total-row">
        <td>Total</td>
        <td>¥${app.fmt(totalBudget)}</td>
        <td>¥${app.fmt(totalActual)}</td>
        <td style="color:${totalBudget - totalActual >= 0 ? '#43e97b' : '#f5576c'}">¥${app.fmt(Math.abs(totalBudget - totalActual))}</td>
        <td></td><td></td>
    </tr>`;

    html += `<tr class="inline-add-row">
        <td><input type="text" id="newFixedCatName" placeholder="New category name" style="width:150px;"></td>
        <td><input type="number" id="newFixedCatBudget" placeholder="Budget" style="width:100px;"></td>
        <td colspan="3" style="color:#999;font-size:11px;">Set budget for new fixed expense category</td>
        <td><button class="btn btn-success btn-small" onclick="app.addNewFixedCategory()">➕ Add Category</button></td>
    </tr>`;

    html += '</tbody></table></div></div>';
    return html;
}

function _renderExtraExpenses(app, d) {
    let html = '<div class="section"><div class="section-title">➕ Extra/Variable Expenses</div>';
    html += '<div class="table-container"><table><thead><tr><th>Date</th><th>Amount</th><th>Description</th></tr></thead><tbody>';

    if (!d.extras?.length) {
        html += '<tr><td colspan="3" style="text-align:center;color:#999">No extra expenses yet</td></tr>';
    } else {
        d.extras.forEach((e, idx) => {
            html += `<tr>
                <td><span class="editable" onclick="app.editExtraField(this,${idx},'date','${e.date}')">${e.date}</span></td>
                <td>¥<span class="editable" onclick="app.editExtraField(this,${idx},'amount',${e.amount})">${app.fmt(e.amount)}</span></td>
                <td>
                    <span class="editable" onclick="app.editExtraField(this,${idx},'desc','${(e.desc||'').replace(/'/g,"\\'")}')">${e.desc || '-'}</span>
                    <button class="btn btn-delete btn-small" onclick="app.deleteExtraExpenseItem(${idx})">×</button>
                </td>
            </tr>`;
        });
    }

    let totalExtras = 0;
    d.extras?.forEach(e => totalExtras += e.amount);

    html += `<tr class="total-row">
        <td><strong>Total Extra Expenses</strong></td>
        <td><strong>¥${app.fmt(totalExtras)}</strong></td>
        <td></td>
    </tr>
    <tr class="inline-add-row">
        <td><input type="date" id="newExtraDate" value="${new Date().toISOString().split('T')[0]}"></td>
        <td><input type="number" id="newExtraAmt" placeholder="Amount" style="width:120px;"></td>
        <td style="display:flex;gap:10px;">
            <input type="text" id="newExtraDesc" placeholder="Description" style="flex:1;">
            <button class="btn btn-success btn-small" onclick="app.addExtraExpense()">➕ Add</button>
        </td>
    </tr>`;

    html += '</tbody></table></div>';
    return html;
}

// ── CRUD actions ──────────────────────────────────────────────
export function addMizuhoIncome(app) {
    const type   = document.getElementById('newMizuhoIncomeType').value.trim();
    const amount = parseFloat(document.getElementById('newMizuhoIncomeAmt').value);

    if (!type)                         { app.msg('⚠️ Please enter an income type', true); return; }
    if (!amount || isNaN(amount) || amount <= 0) { app.msg('⚠️ Please enter a valid amount', true); return; }

    if (!app.data[app.month].mizuho.additionalIncome) {
        app.data[app.month].mizuho.additionalIncome = [];
    }
    app.data[app.month].mizuho.additionalIncome.push({ id: Date.now(), type, amount });
    app.render();
    app.msg(`✅ Income added: ${type} (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteMizuhoIncomeItem(app, index) {
    const inc = app.data[app.month].mizuho.additionalIncome[index];
    app.data[app.month].mizuho.additionalIncome.splice(index, 1);
    app.render();
    app.msg(`✅ Income deleted: ${inc.type} (¥${app.fmt(inc.amount)})`);
    app.saveData();
}

export function addExtraExpense(app) {
    const date   = document.getElementById('newExtraDate').value;
    const amount = parseFloat(document.getElementById('newExtraAmt').value);
    const desc   = document.getElementById('newExtraDesc').value.trim();

    if (!date)                          { app.msg('⚠️ Please select a date', true); return; }
    if (!amount || isNaN(amount) || amount <= 0) { app.msg('⚠️ Please enter a valid amount', true); return; }
    if (!desc)                          { app.msg('⚠️ Please enter a description', true); return; }

    if (!app.data[app.month].mizuho.extras) app.data[app.month].mizuho.extras = [];
    app.data[app.month].mizuho.extras.push({ id: Date.now(), date, amount, desc });
    app.render();
    app.msg(`✅ Extra expense added (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteExtraExpenseItem(app, index) {
    const amount = app.data[app.month].mizuho.extras[index].amount;
    app.data[app.month].mizuho.extras.splice(index, 1);
    app.render();
    app.msg(`✅ Extra expense deleted (¥${app.fmt(amount)})`);
    app.saveData();
}

export function quickAddFixed(category) {
    const rowId = 'add-' + category.replace(/\s/g, '-');
    const row   = document.getElementById(rowId);
    if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
}

export function cancelQuickAdd(category) {
    const row = document.getElementById('add-' + category.replace(/\s/g, '-'));
    if (row) row.style.display = 'none';
}

export function saveQuickFixed(app, category) {
    const catId     = category.replace(/\s/g, '-');
    const date      = document.getElementById('date-' + catId).value;
    const amount    = parseFloat(document.getElementById('amt-' + catId).value);
    const subcatEl  = document.getElementById('subcat-' + catId);
    const subcategory = subcatEl ? subcatEl.value : '';
    const desc      = document.getElementById('desc-' + catId).value;

    if (!date || !amount || isNaN(amount)) {
        app.msg('⚠️ Date and amount are required', true);
        return;
    }

    if (!app.data[app.month].mizuho.fixedExp[category].actual) {
        app.data[app.month].mizuho.fixedExp[category].actual = [];
    }
    app.data[app.month].mizuho.fixedExp[category].actual.push({
        id: Date.now(), date, amount, subcategory, desc
    });

    cancelQuickAdd(category);
    app.render();
    app.msg(`✅ Fixed expense added (¥${app.fmt(amount)})`);
    app.saveData();
}

export function deleteFixedExpenseItem(app, category, index) {
    const amount = app.data[app.month].mizuho.fixedExp[category].actual[index].amount;
    app.data[app.month].mizuho.fixedExp[category].actual.splice(index, 1);
    app.render();
    app.msg(`✅ Expense deleted (¥${app.fmt(amount)})`);
    app.saveData();
}

export function addNewFixedCategory(app) {
    const name   = document.getElementById('newFixedCatName').value.trim();
    const budget = parseFloat(document.getElementById('newFixedCatBudget').value);

    if (!name)               { app.msg('⚠️ Please enter a category name', true); return; }
    if (isNaN(budget) || budget < 0) { app.msg('⚠️ Please enter a valid budget', true); return; }
    if (app.data[app.month].mizuho.fixedExp[name]) {
        app.msg('⚠️ Category already exists', true); return;
    }

    app.data[app.month].mizuho.fixedExp[name] = { budget, actual: [] };

    if (!app.categories.find(c => c.name === name)) {
        app.categories.push({ name, accounts: ['mizuho'], type: 'expense', subcategories: [] });
    }

    app.render();
    app.msg(`✅ Fixed category added: ${name} (Budget: ¥${app.fmt(budget)})`);
    app.saveData();
}

// ── Inline edit helpers ───────────────────────────────────────
export function editExpenseField(app, element, category, index, field, currentValue) {
    if (app._editingCell) return;
    app._editingCell = element;
    const input = makeEditableInput(field, currentValue);

    const save = () => {
        const v = input.value;
        if (v) {
            app.data[app.month].mizuho.fixedExp[category].actual[index][field] =
                field === 'amount' ? parseFloat(v) : v;
            app.saveData();
            app.render();
            app.msg('✅ Expense updated');
        } else {
            element.textContent = field === 'amount' ? app.fmt(currentValue) : currentValue;
        }
        app._editingCell = null;
    };

    input.onblur    = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select?.();
}

export function editExtraField(app, element, index, field, currentValue) {
    if (app._editingCell) return;
    app._editingCell = element;
    const input = makeEditableInput(field, currentValue);
    input.style.fontSize = '14px';

    const save = () => {
        const v = input.value;
        if (field === 'amount' && v) {
            app.data[app.month].mizuho.extras[index][field] = parseFloat(v);
        } else if (field !== 'amount') {
            app.data[app.month].mizuho.extras[index][field] = v;
        } else {
            element.textContent = app.fmt(currentValue);
            app._editingCell = null;
            return;
        }
        app.saveData();
        app.render();
        app.msg('✅ Expense updated');
        app._editingCell = null;
    };

    input.onblur    = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select?.();
}

// ── Modal: edit salary ────────────────────────────────────────
export function editMizuhoSalary(app, current) {
    _showSimpleEditModal(app, 'mizuhoSalaryEditModal', '💰 Edit Monthly Salary', 'Monthly Salary:', current,
        v => { app.data[app.month].mizuho.salary = v; },
        `✅ Monthly salary updated: ¥${app.fmt(current)}`
    );
}

export function editMizuhoPrevBal(app, current) {
    _showSimpleEditModal(app, 'mizuhoPrevBalEditModal', '💰 Edit Previous Balance', 'Previous Balance:', current,
        v => { app.data[app.month].mizuho.prevBal = v; },
        `✅ Previous balance updated: ¥${app.fmt(current)}`
    );
}

export function editMizuhoIncomeField(app, element, index, field, currentValue) {
    if (app._editingCell) return;
    app._editingCell = element;
    const input = makeEditableInput(field, currentValue);
    input.style.width    = field === 'amount' ? '100px' : '200px';
    input.style.fontSize = '14px';

    const save = () => {
        const v = input.value;
        if (v) {
            app.data[app.month].mizuho.additionalIncome[index][field] =
                field === 'amount' ? parseFloat(v) : v;
            app.saveData();
            app.render();
            app.msg('✅ Income updated');
        } else {
            element.textContent = field === 'amount' ? app.fmt(currentValue) : currentValue;
        }
        app._editingCell = null;
    };

    input.onblur    = save;
    input.onkeypress = e => { if (e.key === 'Enter') save(); };
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select?.();
}

export function editBudget(app, category, current) {
    _showSimpleEditModal(app, 'budgetEditModal', '💰 Edit Budget',
        'Budget for ' + category + ':', current,
        v => { app.data[app.month].mizuho.fixedExp[category].budget = v; },
        `✅ Budget updated for ${category}: ¥${app.fmt(current)}`
    );
    app._editingBudgetCategory = category;
}

export function deleteFixedCategory(app, category) {
    let modal = document.getElementById('deleteCategoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteCategoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="app.closeDeleteCategoryModal()">&times;</span>
                <div class="modal-header">⚠️ Delete Category</div>
                <p id="deleteCategoryMsg" style="margin:20px 0;"></p>
                <button class="btn btn-delete" onclick="app.confirmDeleteCategory(true)">✓ Yes, Delete</button>
                <button class="btn" onclick="app.confirmDeleteCategory(false)">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('deleteCategoryMsg').textContent =
        `Delete "${category}"? All expense records in this category will be lost.`;
    app._deletingCategory = category;
    modal.style.display = 'block';
}

export function closeDeleteCategoryModal(app) {
    const modal = document.getElementById('deleteCategoryModal');
    if (modal) modal.style.display = 'none';
    app._deletingCategory = null;
}

export function confirmDeleteCategory(app, confirmed) {
    if (confirmed && app._deletingCategory) {
        delete app.data[app.month].mizuho.fixedExp[app._deletingCategory];
        app.render();
        app.msg('✅ Fixed category deleted: ' + app._deletingCategory);
        app.saveData();
    }
    closeDeleteCategoryModal(app);
}

// ── Generic number-edit modal ─────────────────────────────────
function _showSimpleEditModal(app, modalId, title, labelText, current, onSave, successMsg) {
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="document.getElementById('${modalId}').style.display='none'">&times;</span>
                <div class="modal-header">${title}</div>
                <div class="form-group">
                    <label id="${modalId}-label"></label>
                    <input type="number" id="${modalId}-value" style="width:100%;padding:10px;font-size:16px;">
                </div>
                <button class="btn btn-success" id="${modalId}-save" style="margin-top:15px;">✅ Save</button>
                <button class="btn" onclick="document.getElementById('${modalId}').style.display='none'">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById(`${modalId}-label`).textContent = labelText;
    const input = document.getElementById(`${modalId}-value`);
    input.value = current;

    document.getElementById(`${modalId}-save`).onclick = () => {
        const v = parseFloat(input.value);
        if (!isNaN(v) && v >= 0) {
            onSave(v);
            app.render();
            app.msg(successMsg.replace(app.fmt(current), app.fmt(v)));
            app.saveData();
            document.getElementById(modalId).style.display = 'none';
        } else {
            app.msg('⚠️ Please enter a valid positive number', true);
        }
    };

    modal.style.display = 'block';
    setTimeout(() => { input.focus(); input.select(); }, 100);
}

// ── Shared account name helper ────────────────────────────────
function _accountName(app, id) {
    const names = { mizuho: 'Mizuho', yucho: 'Yucho', slsenfin: 'SLSenfin', rakuten: 'Rakuten', medfun: '7-11 Account' };
    return names[id] || app.customAccounts?.find(a => a.id === id)?.name || id;
}
