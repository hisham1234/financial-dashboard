// ============================================================
// main.js — App bootstrap & orchestrator
// All modules are imported here; only `app` is on window.
// ============================================================

// ── Data layer ────────────────────────────────────────────────
import { initializeMonth, validateMonthStructure, performCarryForward, updateDependentMonths }
    from './data/carry-forward.js';
import {
    calculateMizuhoBalance,
    calculateYuchoBalance,
    calculateStandardBalance,
    calculateMonthlySavings,
    calculateAnnualSavings,
    calculateAnnualExpensesAll,
    calculateTotalExpensesAllAccounts,
    calculateMizuhoExpenses,
} from './data/calculations.js';

// ── Google Drive ──────────────────────────────────────────────
import {
    gapiLoaded, gisLoaded,
    connectGoogleDrive, disconnectGoogleDrive,
    saveToGoogleDrive, loadFromGoogleDrive,
    refreshFromDrive, showDriveStatus,
} from './google-drive.js';

// ── Account renderers ─────────────────────────────────────────
import { renderMizuho,
    addMizuhoIncome, deleteMizuhoIncomeItem,
    addExtraExpense, deleteExtraExpenseItem,
    quickAddFixed, cancelQuickAdd, saveQuickFixed,
    deleteFixedExpenseItem, addNewFixedCategory,
    editExpenseField, editExtraField,
    editMizuhoSalary, editMizuhoPrevBal, editMizuhoIncomeField,
    editBudget, deleteFixedCategory,
    closeDeleteCategoryModal, confirmDeleteCategory,
} from './accounts/mizuho.js';

import { renderYucho,
    addYuchoDeposit, deleteYuchoDepositItem, editYuchoDepositField,
    addYuchoExpense, deleteYuchoExpenseItem, editYuchoExpenseField,
    addNewFund, deleteFund, closeDeleteFundModal, confirmDeleteFund,
    editFundName, closeEditFundNameModal, saveEditFundName,
    editFundBalance, closeFundBalanceEditModal, saveFundBalanceEdit,
} from './accounts/yucho.js';

import { renderStandardAccount,
    addStandardIncome, addStandardExpense,
    deleteStandardIncomeItem, deleteStandardExpenseItem,
    editStandardIncomeField, editStandardExpenseField,
    editStandardAccountBalance,
    closeStandardBalanceEditModal, saveStandardBalanceEdit,
} from './accounts/standard.js';

// ── Modals ────────────────────────────────────────────────────
import { openTransferModal, closeTransferModal,
    updateTransferFromOptions, updateTransferToOptions,
    confirmTransfer, deleteTransfer,
    closeDeleteTransferModal, confirmDeleteTransfer,
    editTransferFund, closeEditTransferFundModal, saveTransferFundEdit,
} from './modals/transfer.js';

import { openCategoriesModal, closeCategoriesModal,
    renderCategories, filterCategories,
    addCategory, deleteCategory,
    addSubcategory, closeAddSubcategoryModal, saveSubcategory,
} from './modals/categories.js';

import { openAccountsModal, closeAccountsModal,
    addCustomAccount, deleteCustomAccount,
    closeDeleteAccountModal, confirmDeleteAccount,
} from './modals/accounts.js';

// ── Reports ───────────────────────────────────────────────────
import { renderOverview,
    renderMonthlySavings, renderAnnualSavings,
    renderTotalExpenseOverview, renderAnnualExpenseOverview,
    renderExpenseAnalysis, filterSubcategoryExpenses,
} from './reports/index.js';

// ============================================================
// App object
// ============================================================
const app = {
    data: {},
    categories: [],
    customAccounts: [],
    month: '2025-11',
    acc: 'mizuho',
    hideZeroYuchoFunds: false,

    // ── internal edit-lock ────────────────────────────────────
    _editingCell: null,

    // ── init ─────────────────────────────────────────────────
    init() {
        this._initCategories();
        initializeMonth(this.data, '2025-11', this.customAccounts);
        this._loadData();
        this.render();
        this.updateTotalAssets();
    },

    // ── Default categories ────────────────────────────────────
    _initCategories() {
        this.categories = [
            { name: 'Food and Others', accounts: ['mizuho'], type: 'expense',
              subcategories: ['Groceries', 'Dining Out', 'Snacks', 'Coffee', 'Others'] },
            { name: 'To Home',       accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Transport',     accounts: ['mizuho'], type: 'expense',
              subcategories: ['Train', 'Bus', 'Taxi', 'Gas', 'Parking'] },
            { name: 'Phone',         accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Utility',       accounts: ['mizuho'], type: 'expense',
              subcategories: ['Electricity', 'Water', 'Gas', 'Internet'] },
            { name: 'Hair',          accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'N.Mori',        accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Outing',        accounts: ['mizuho'], type: 'expense',
              subcategories: ['Movies', 'Events', 'Activities'] },
            { name: 'House rent',    accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Parking',       accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Luqman',        accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Daiso/Laundry', accounts: ['mizuho'], type: 'expense',
              subcategories: ['Daiso', 'Laundry', 'Cleaning'] },
            { name: 'Highways',      accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Sani',          accounts: ['mizuho'], type: 'expense', subcategories: [] },
            { name: 'Shopping',      accounts: ['mizuho','yucho','slsenfin','rakuten','medfun'], type: 'expense',
              subcategories: ['Clothes', 'Electronics', 'Home', 'Others'] },
            { name: 'Entertainment', accounts: ['mizuho','yucho','slsenfin','rakuten','medfun'], type: 'expense',
              subcategories: ['Streaming', 'Games', 'Books', 'Music'] },
            { name: 'Healthcare',    accounts: ['mizuho','yucho','slsenfin','rakuten','medfun'], type: 'expense',
              subcategories: ['Medicine', 'Doctor', 'Insurance', 'Gym'] },
            { name: 'Salary',            accounts: ['mizuho'], type: 'income', subcategories: [] },
            { name: 'Bonus',             accounts: ['mizuho'], type: 'income', subcategories: [] },
            { name: 'Investment Return', accounts: ['yucho', 'rakuten'], type: 'income', subcategories: [] },
            { name: 'Interest',          accounts: ['yucho', 'slsenfin', 'rakuten'], type: 'income', subcategories: [] },
        ];
    },

    // ── Persistence ───────────────────────────────────────────
    _loadData() {
        const saved = localStorage.getItem('financial-dashboard-v15');
        if (!saved) {
            this.msg('ℹ️ No local data. Connect to Drive to load your data.');
            return;
        }
        try {
            const parsed = JSON.parse(saved);
            if (parsed.isCacheOnly) this.msg('⚠️ Loaded cached data. Connecting to Drive...', true);
            if (parsed.data)          this.data          = parsed.data;
            if (parsed.categories)    this.categories    = parsed.categories;
            if (parsed.customAccounts) this.customAccounts = parsed.customAccounts;
            for (const m in this.data) this.validateMonthStructure(m);
            if (!parsed.isCacheOnly) this.msg('✅ Data loaded from cache');
        } catch {
            this.msg('⚠️ Failed to load data', true);
        }
    },

    saveData() {
        try {
            updateDependentMonths(this.data, this.customAccounts);

            localStorage.setItem('financial-dashboard-v15', JSON.stringify({
                data: this.data,
                categories: this.categories,
                customAccounts: this.customAccounts,
                version: '15',
                lastSaved: new Date().toISOString(),
                isCacheOnly: true,
            }));

            const syncEl = document.getElementById('syncStatus');
            if (syncEl) syncEl.textContent = 'Cached ' + new Date().toLocaleTimeString();

            if (typeof gapi !== 'undefined' && gapi.client?.getToken?.() !== null) {
                saveToGoogleDrive();
            } else if (syncEl) {
                syncEl.textContent = '⚠️ Cache only — Connect to Drive!';
                syncEl.style.color = '#f39c12';
            }
        } catch (e) {
            this.msg('⚠️ Failed to save', true);
            console.error('Save error:', e);
        }
    },

    // ── Month structure helpers ───────────────────────────────
    validateMonthStructure(monthKey) {
        validateMonthStructure(this.data, monthKey, this.customAccounts);
    },

    // ── Calculation delegates ─────────────────────────────────
    calculateMizuhoBalance()            { return calculateMizuhoBalance(this.data, this.month); },
    calculateYuchoBalance()             { return calculateYuchoBalance(this.data, this.month); },
    calculateStandardBalance(account)   { return calculateStandardBalance(this.data, this.month, account); },

    calculateMonthlySavings() {
        return calculateMonthlySavings(this.data, this.month, this.customAccounts);
    },
    calculateAnnualSavings() {
        return calculateAnnualSavings(this.data, this.month, this.customAccounts);
    },
    calculateAnnualExpensesAll() {
        return calculateAnnualExpensesAll(this.data, this.month, this.customAccounts);
    },

    // ── UI helpers ────────────────────────────────────────────
    fmt(n) { return Math.round(n).toLocaleString(); },

    msg(txt, isError = false) {
        const el = document.getElementById('alert');
        el.textContent = txt;
        el.className   = isError ? 'alert error' : 'alert';
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    },

    // ── Summary cards ─────────────────────────────────────────
    updateTotalAssets() {
        const d = this.data[this.month];
        if (!d) return;

        let total = this.calculateMizuhoBalance() + this.calculateYuchoBalance()
            + this.calculateStandardBalance('slsenfin')
            + this.calculateStandardBalance('rakuten')
            + this.calculateStandardBalance('medfun');

        this.customAccounts?.forEach(ca => { total += this.calculateStandardBalance(ca.id); });

        document.getElementById('totalAssets').textContent      = this.fmt(total);
        document.getElementById('mizuhoBalance').textContent    = this.fmt(this.calculateMizuhoBalance());
        document.getElementById('yuchoBalance').textContent     = this.fmt(this.calculateYuchoBalance());
        document.getElementById('slsenfinBalance').textContent  = this.fmt(this.calculateStandardBalance('slsenfin'));
        document.getElementById('rakutenBalance').textContent   = this.fmt(this.calculateStandardBalance('rakuten'));
        document.getElementById('medfunBalance').textContent    = this.fmt(this.calculateStandardBalance('medfun'));

        this._updateCustomAccountCards();

        // Mizuho expenses (for cards)
        let totalExpenses = 0;
        if (d.mizuho) {
            for (const cat in d.mizuho.fixedExp) {
                d.mizuho.fixedExp[cat].actual?.forEach(e => totalExpenses += e.amount);
            }
            d.mizuho.extras?.forEach(e => totalExpenses += e.amount);
        }
        document.getElementById('totalExpenses').textContent = this.fmt(totalExpenses);

        // Total expenses all accounts
        const totalExpAll = calculateTotalExpensesAllAccounts(this.data, this.month, this.customAccounts);
        document.getElementById('totalExpensesAll').textContent = this.fmt(totalExpAll);

        // Monthly savings
        const savings = this.calculateMonthlySavings();
        document.getElementById('monthlySavings').textContent = this.fmt(savings);

        // Expense ratio
        const income = (d.mizuho?.salary || 0) +
            (d.mizuho?.additionalIncome?.reduce((s, i) => s + i.amount, 0) || 0);
        const expRatio = income > 0 ? (totalExpenses / income) * 100 : 0;
        document.getElementById('expenseRatio').textContent = `(${Math.round(expRatio)}%)`;

        // Annual
        document.getElementById('annualSavings').textContent      = this.fmt(this.calculateAnnualSavings());
        document.getElementById('annualExpensesAll').textContent   = this.fmt(this.calculateAnnualExpensesAll());
    },

    _updateCustomAccountCards() {
        const container = document.getElementById('customAccountCards');
        if (!container) return;
        container.innerHTML = '';
        this.customAccounts?.forEach(acc => {
            const balance = this.calculateStandardBalance(acc.id);
            const card    = document.createElement('div');
            card.className = 'summary-card';
            card.onclick   = () => this.switchToAccount(acc.id);
            card.innerHTML = `<div class="summary-label">${acc.name}</div><div class="summary-value">¥${this.fmt(balance)}</div>`;
            container.appendChild(card);
        });
    },

    // ── Navigation ────────────────────────────────────────────
    switchAccount() {
        this.acc = document.getElementById('accountSelect').value;
        this.render();
    },

    switchToAccount(account) {
        document.getElementById('accountSelect').value = account;
        this.acc = account;
        this.render();
    },

    switchMonth() {
        this.month = document.getElementById('monthSelect').value;
        if (!this.data[this.month]) {
            initializeMonth(this.data, this.month, this.customAccounts);
        } else {
            this.validateMonthStructure(this.month);
        }
        this.updateTotalAssets();
        this.render();
    },

    setHideZeroYuchoFunds(value) {
        this.hideZeroYuchoFunds = Boolean(value);
        this.render();
    },

    // ── Render dispatcher ─────────────────────────────────────
    render() {
        // Update month select
        const sel    = document.getElementById('monthSelect');
        sel.innerHTML = '';
        Object.keys(this.data).sort().forEach(m => {
            const opt = document.createElement('option');
            opt.value     = m;
            opt.textContent = m;
            if (m === this.month) opt.selected = true;
            sel.appendChild(opt);
        });

        this.updateAccountSelector();

        const renderers = {
            'overview':              () => renderOverview(this),
            'monthly-savings':       () => renderMonthlySavings(this),
            'annual-savings':        () => renderAnnualSavings(this),
            'expense-analysis':      () => renderExpenseAnalysis(this),
            'total-expense-overview':() => renderTotalExpenseOverview(this),
            'annual-expense-overview':()=> renderAnnualExpenseOverview(this),
            'mizuho':                () => renderMizuho(this),
            'yucho':                 () => renderYucho(this),
        };

        const fn = renderers[this.acc] || (() => renderStandardAccount(this, this.acc));
        fn();
        this.updateTotalAssets();
    },

    updateAccountSelector() {
        const sel = document.getElementById('accountSelect');
        const cur = sel.value;
        sel.innerHTML = '';

        const defaults = [
            { value: 'mizuho',   label: 'Mizuho (Main Salary)' },
            { value: 'yucho',    label: 'Yucho (Investment Fund)' },
            { value: 'slsenfin', label: 'SLSenfin Account' },
            { value: 'rakuten',  label: 'Rakuten Investment' },
            { value: 'medfun',   label: '7-11 Account (Med & Fun)' },
        ];
        defaults.forEach(({ value, label }) => sel.appendChild(new Option(label, value)));
        this.customAccounts?.forEach(({ id, name }) => sel.appendChild(new Option(name, id)));

        const extras = [
            ['overview',               '📊 All Accounts Overview'],
            ['monthly-savings',        '💰 Monthly Savings Report'],
            ['annual-savings',         '📈 Annual Savings Report'],
            ['total-expense-overview', '💸 Total Expense Overview'],
            ['annual-expense-overview','📊 Annualized Total Expenses'],
            ['expense-analysis',       '📉 Expense Analysis & Insights'],
        ];
        extras.forEach(([v, l]) => sel.appendChild(new Option(l, v)));

        if (cur && Array.from(sel.options).some(o => o.value === cur)) sel.value = cur;
    },

    // ── Carry forward ─────────────────────────────────────────
    carryForward() {
        const { next, alreadyExists } = performCarryForward(this.data, this.month, this.customAccounts);
        if (alreadyExists) {
            this._showOverrideMonthModal(next);
            return;
        }
        this.month = next;
        this.render();
        this.msg('✅ Carried forward to ' + next);
        this.saveData();
    },

    _showOverrideMonthModal(nextMonth) {
        let modal = document.getElementById('overrideMonthModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'overrideMonthModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:500px;">
                    <span class="close" onclick="app.closeOverrideMonthModal()">&times;</span>
                    <div class="modal-header">⚠️ Month Already Exists</div>
                    <p id="overrideMonthMsg" style="margin:20px 0;white-space:pre-line;"></p>
                    <button class="btn btn-delete" onclick="app.confirmOverrideMonth(true)" style="background:#ff9800;">✓ Recalculate & Override</button>
                    <button class="btn" onclick="app.confirmOverrideMonth(false)">Cancel</button>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('overrideMonthMsg').textContent =
            `${nextMonth} already exists.\n\nRecalculate balances from ${this.month} and override?\n\n• Recalculates Yucho fund balances\n• Updates Mizuho previous balance\n• Keeps fixed expense budgets\n• CLEARS all transactions in ${nextMonth}`;
        this._overrideMonthTarget = nextMonth;
        modal.style.display = 'block';
    },

    closeOverrideMonthModal() {
        const modal = document.getElementById('overrideMonthModal');
        if (modal) modal.style.display = 'none';
        this._overrideMonthTarget = null;
    },

    confirmOverrideMonth(confirmed) {
        if (confirmed && this._overrideMonthTarget) {
            delete this.data[this._overrideMonthTarget];
            performCarryForward(this.data, this.month, this.customAccounts);
            this.month = this._overrideMonthTarget;
            this.render();
            this.msg('✅ Carried forward to ' + this.month);
            this.saveData();
        }
        this.closeOverrideMonthModal();
    },

    // ── Export / Import ───────────────────────────────────────
    exportData() {
        const str      = JSON.stringify({ data: this.data, categories: this.categories, customAccounts: this.customAccounts, version: '15', exportDate: new Date().toISOString() }, null, 2);
        const filename = 'financial-dashboard-backup-' + new Date().toISOString().split('T')[0] + '.json';
        try {
            const url = URL.createObjectURL(new Blob([str], { type: 'application/json' }));
            const a   = Object.assign(document.createElement('a'), { href: url, download: filename, style: 'display:none' });
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            this.msg('✅ Exported as ' + filename);
        } catch {
            this._showExportFallback(str);
        }
    },

    _showExportFallback(str) {
        let modal = document.getElementById('exportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'exportModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('exportModal').style.display='none'">&times;</span>
                    <div class="modal-header">💾 Export Data</div>
                    <p>Copy and save as a .json file:</p>
                    <textarea id="exportDataText" style="width:100%;height:300px;font-family:monospace;font-size:12px;padding:10px;"></textarea>
                    <div style="margin-top:10px;">
                        <button class="btn btn-success" onclick="app._copyExportData()">📋 Copy</button>
                        <button class="btn" onclick="document.getElementById('exportModal').style.display='none'">Close</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('exportDataText').value = str;
        modal.style.display = 'block';
    },

    _copyExportData() {
        const ta = document.getElementById('exportDataText');
        ta.select();
        try { document.execCommand('copy'); this.msg('✅ Copied to clipboard'); }
        catch { this.msg('⚠️ Please manually copy the data', true); }
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const imported = JSON.parse(e.target.result);
                this._showImportConfirmModal(imported);
            } catch { this.msg('⚠️ Invalid file format', true); }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    _showImportConfirmModal(importedData) {
        let modal = document.getElementById('importConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'importConfirmModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:500px;">
                    <span class="close" onclick="app._closeImportConfirmModal()">&times;</span>
                    <div class="modal-header">⚠️ Confirm Import</div>
                    <p style="margin:20px 0;">Import this data? Current data will be replaced.</p>
                    <button class="btn btn-success" onclick="app._confirmImport(true)">✓ Yes, Import</button>
                    <button class="btn" onclick="app._confirmImport(false)">Cancel</button>
                </div>`;
            document.body.appendChild(modal);
        }
        this._pendingImport = importedData;
        modal.style.display = 'block';
    },

    _closeImportConfirmModal() {
        const modal = document.getElementById('importConfirmModal');
        if (modal) modal.style.display = 'none';
        this._pendingImport = null;
    },

    _confirmImport(confirmed) {
        if (confirmed && this._pendingImport) {
            try {
                if (this._pendingImport.data)          this.data          = this._pendingImport.data;
                if (this._pendingImport.categories)    this.categories    = this._pendingImport.categories;
                if (this._pendingImport.customAccounts) this.customAccounts = this._pendingImport.customAccounts;
                for (const m in this.data) this.validateMonthStructure(m);
                if (!this.data[this.month]) initializeMonth(this.data, this.month, this.customAccounts);
                this.render();
                this.saveData();
                this.msg('✅ Data imported successfully');
            } catch (e) {
                this.msg('⚠️ Import failed: ' + e.message, true);
            }
        }
        this._closeImportConfirmModal();
    },

    // ── Report shortcut navigation ────────────────────────────
    showMonthlySavings()    { this.switchToAccount('monthly-savings'); },
    showAnnualSavings()     { this.switchToAccount('annual-savings'); },
    showExpenseAnalysis()   { this.switchToAccount('expense-analysis'); },
    showTotalExpenseOverview() { this.switchToAccount('total-expense-overview'); },
    showAnnualExpenseOverview() { this.switchToAccount('annual-expense-overview'); },

    filterSubcategoryExpenses() { filterSubcategoryExpenses(this); },

    // ── Delegate all module functions ─────────────────────────
    // Mizuho
    addMizuhoIncome()              { addMizuhoIncome(this); },
    deleteMizuhoIncomeItem(i)      { deleteMizuhoIncomeItem(this, i); },
    addExtraExpense()              { addExtraExpense(this); },
    deleteExtraExpenseItem(i)      { deleteExtraExpenseItem(this, i); },
    quickAddFixed(cat)             { quickAddFixed(cat); },
    cancelQuickAdd(cat)            { cancelQuickAdd(cat); },
    saveQuickFixed(cat)            { saveQuickFixed(this, cat); },
    deleteFixedExpenseItem(cat, i) { deleteFixedExpenseItem(this, cat, i); },
    addNewFixedCategory()          { addNewFixedCategory(this); },
    editExpenseField(el, cat, i, f, v)  { editExpenseField(this, el, cat, i, f, v); },
    editExtraField(el, i, f, v)    { editExtraField(this, el, i, f, v); },
    editMizuhoSalary(v)            { editMizuhoSalary(this, v); },
    editMizuhoPrevBal(v)           { editMizuhoPrevBal(this, v); },
    editMizuhoIncomeField(el, i, f, v) { editMizuhoIncomeField(this, el, i, f, v); },
    editBudget(cat, v)             { editBudget(this, cat, v); },
    deleteFixedCategory(cat)       { deleteFixedCategory(this, cat); },
    closeDeleteCategoryModal()     { closeDeleteCategoryModal(this); },
    confirmDeleteCategory(c)       { confirmDeleteCategory(this, c); },

    // Yucho
    setHideZeroYuchoFunds(v)       { this.setHideZeroYuchoFunds(v); },
    addYuchoDeposit()              { addYuchoDeposit(this); },
    deleteYuchoDepositItem(i)      { deleteYuchoDepositItem(this, i); },
    editYuchoDepositField(el,i,f,v){ editYuchoDepositField(this, el, i, f, v); },
    addYuchoExpense()              { addYuchoExpense(this); },
    deleteYuchoExpenseItem(i)      { deleteYuchoExpenseItem(this, i); },
    editYuchoExpenseField(el,i,f,v){ editYuchoExpenseField(this, el, i, f, v); },
    addNewFund()                   { addNewFund(this); },
    deleteFund(i)                  { deleteFund(this, i); },
    closeDeleteFundModal()         { closeDeleteFundModal(this); },
    confirmDeleteFund(c)           { confirmDeleteFund(this, c); },
    editFundName(i, n)             { editFundName(this, i, n); },
    closeEditFundNameModal()       { closeEditFundNameModal(this); },
    saveEditFundName()             { saveEditFundName(this); },
    editFundBalance(i, v)          { editFundBalance(this, i, v); },
    closeFundBalanceEditModal()    { closeFundBalanceEditModal(this); },
    saveFundBalanceEdit()          { saveFundBalanceEdit(this); },

    // Standard
    addStandardIncome(acc)         { addStandardIncome(this, acc); },
    addStandardExpense(acc)        { addStandardExpense(this, acc); },
    deleteStandardIncomeItem(acc,i){ deleteStandardIncomeItem(this, acc, i); },
    deleteStandardExpenseItem(acc,i){ deleteStandardExpenseItem(this, acc, i); },
    editStandardIncomeField(el,acc,i,f,v) { editStandardIncomeField(this, el, acc, i, f, v); },
    editStandardExpenseField(el,acc,i,f,v){ editStandardExpenseField(this, el, acc, i, f, v); },
    editStandardAccountBalance(acc, v) { editStandardAccountBalance(this, acc, v); },
    closeStandardBalanceEditModal(){ closeStandardBalanceEditModal(this); },
    saveStandardBalanceEdit()      { saveStandardBalanceEdit(this); },

    // Transfers
    openTransferModal()            { openTransferModal(this); },
    closeTransferModal()           { closeTransferModal(); },
    updateTransferFromOptions()    { updateTransferFromOptions(this); },
    updateTransferToOptions()      { updateTransferToOptions(this); },
    confirmTransfer()              { confirmTransfer(this); },
    deleteTransfer(acc, i)         { deleteTransfer(this, acc, i); },
    closeDeleteTransferModal()     { closeDeleteTransferModal(this); },
    confirmDeleteTransfer(c)       { confirmDeleteTransfer(this, c); },
    editTransferFund(acc, i)       { editTransferFund(this, acc, i); },
    closeEditTransferFundModal()   { closeEditTransferFundModal(this); },
    saveTransferFundEdit()         { saveTransferFundEdit(this); },

    // Categories
    openCategoriesModal()          { openCategoriesModal(this); },
    closeCategoriesModal()         { closeCategoriesModal(); },
    filterCategories()             { filterCategories(); },
    addCategory()                  { addCategory(this); },
    deleteCategory(i)              { deleteCategory(this, i); },
    addSubcategory(i)              { addSubcategory(this, i); },
    closeAddSubcategoryModal()     { closeAddSubcategoryModal(this); },
    saveSubcategory()              { saveSubcategory(this); },

    // Accounts
    openAccountsModal()            { openAccountsModal(this); },
    closeAccountsModal()           { closeAccountsModal(); },
    addCustomAccount()             { addCustomAccount(this); },
    deleteCustomAccount(i)         { deleteCustomAccount(this, i); },
    closeDeleteAccountModal()      { closeDeleteAccountModal(this); },
    confirmDeleteAccount(c)        { confirmDeleteAccount(this, c); },
};

// ── Close modals on backdrop click ───────────────────────────
window.onclick = e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};

// ── Expose Drive functions & app globally ────────────────────
window.app           = app;
window.gapiLoaded    = gapiLoaded;
window.gisLoaded     = gisLoaded;
window.connectGoogleDrive    = connectGoogleDrive;
window.disconnectGoogleDrive = disconnectGoogleDrive;
window.refreshFromDrive      = refreshFromDrive;
window.showDriveStatus       = showDriveStatus;

// ── Boot ─────────────────────────────────────────────────────
app.init();

// ── Manually init Google APIs after module is ready ──────────
if (typeof gapi !== 'undefined') gapiLoaded();
if (typeof google !== 'undefined') gisLoaded();