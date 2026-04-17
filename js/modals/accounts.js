// ============================================================
// modals/accounts.js — Custom account management
// ============================================================

export function openAccountsModal(app) {
    renderCustomAccounts(app);
    document.getElementById('accountsModal').style.display = 'block';
}

export function closeAccountsModal() {
    document.getElementById('accountsModal').style.display = 'none';
}

export function renderCustomAccounts(app) {
    const container = document.getElementById('customAccountsList');

    if (!app.customAccounts?.length) {
        container.innerHTML = `
            <h4 style="color:#667eea;margin-bottom:10px;">Custom Accounts:</h4>
            <p style="color:#999;font-size:14px;">No custom accounts yet. Add one above!</p>`;
        return;
    }

    let html = '<h4 style="color:#667eea;margin-bottom:10px;">Custom Accounts:</h4>';
    app.customAccounts.forEach((acc, index) => {
        html += `
        <div class="category-item">
            <div class="category-header">
                <div class="category-name">🏦 ${acc.name}</div>
                <button class="btn btn-delete btn-small" onclick="app.deleteCustomAccount(${index})">🗑️ Delete</button>
            </div>
            <div style="font-size:12px;color:#666;margin-top:5px;">
                ID: ${acc.id} • Standard account with income/expense tracking
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

export function addCustomAccount(app) {
    const nameEl = document.getElementById('newAccountName');
    const idEl   = document.getElementById('newAccountId');

    const name = nameEl.value.trim();
    const id   = idEl.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!name) { app.msg('⚠️ Please enter an account name', true); return; }
    if (!id)   { app.msg('⚠️ Please enter an account ID (lowercase only)', true); return; }

    const reserved = ['mizuho', 'yucho', 'slsenfin', 'rakuten', 'medfun', 'overview'];
    if (reserved.includes(id)) {
        app.msg('⚠️ This ID is reserved. Choose a different one.', true);
        return;
    }
    if (app.customAccounts.find(a => a.id === id)) {
        app.msg('⚠️ An account with this ID already exists', true);
        return;
    }

    app.customAccounts.push({ id, name });

    // Init in all existing months
    for (const monthKey in app.data) {
        if (!app.data[monthKey][id]) {
            app.data[monthKey][id] = { balance: 0, income: [], expenses: [], transfers: [] };
        }
    }

    nameEl.value = '';
    idEl.value   = '';

    renderCustomAccounts(app);
    app.updateAccountSelector();
    app.msg('✅ Custom account added: ' + name);
    app.saveData();
}

export function deleteCustomAccount(app, index) {
    const account = app.customAccounts[index];

    let hasTransactions = false;
    for (const monthKey in app.data) {
        const acc = app.data[monthKey][account.id];
        if (!acc) continue;
        if (acc.income?.length || acc.expenses?.length || acc.transfers?.length || acc.balance) {
            hasTransactions = true;
            break;
        }
    }

    _showDeleteAccountModal(app, index, account, hasTransactions);
}

function _showDeleteAccountModal(app, index, account, hasTransactions) {
    let modal = document.getElementById('deleteAccountModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteAccountModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <span class="close" onclick="app.closeDeleteAccountModal()">&times;</span>
                <div class="modal-header">⚠️ Delete Custom Account</div>
                <p id="deleteAccountMsg" style="margin:20px 0;white-space:pre-line;"></p>
                <button class="btn btn-delete" onclick="app.confirmDeleteAccount(true)">✓ Yes, Delete</button>
                <button class="btn" onclick="app.confirmDeleteAccount(false)">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    let msg = `Are you sure you want to delete "${account.name}"?`;
    if (hasTransactions) {
        msg += '\n\n⚠️ WARNING: This account has transaction history. All data will be removed from every month.';
    }

    document.getElementById('deleteAccountMsg').textContent = msg;
    app._deletingAccountIndex = index;
    app._deletingAccount = account;
    modal.style.display = 'block';
}

export function closeDeleteAccountModal(app) {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.style.display = 'none';
    app._deletingAccountIndex = null;
    app._deletingAccount      = null;
}

export function confirmDeleteAccount(app, confirmed) {
    if (confirmed && app._deletingAccountIndex !== null && app._deletingAccount) {
        const account = app._deletingAccount;

        app.customAccounts.splice(app._deletingAccountIndex, 1);

        for (const monthKey in app.data) {
            delete app.data[monthKey][account.id];
        }

        if (app.acc === account.id) app.acc = 'overview';

        renderCustomAccounts(app);
        app.updateAccountSelector();
        app.render();
        app.msg('✅ Custom account deleted: ' + account.name);
        app.saveData();
    }
    closeDeleteAccountModal(app);
}
