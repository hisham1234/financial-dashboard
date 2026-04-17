// ============================================================
// modals/transfer.js — Transfer between accounts modal
// ============================================================

// ── Open / close ─────────────────────────────────────────────
export function openTransferModal(app) {
    _populateAccounts(app);
    document.getElementById('transferModal').style.display = 'block';
}

export function closeTransferModal() {
    document.getElementById('transferModal').style.display = 'none';
}

// ── Fund dropdowns when account changes ──────────────────────
export function updateTransferFromOptions(app) {
    const from   = document.getElementById('transferFrom').value;
    const select = document.getElementById('transferFromFund');
    select.innerHTML = '<option value="main">Main Balance</option>';
    if (from === 'yucho') _appendYuchoFunds(app, select);
}

export function updateTransferToOptions(app) {
    const to     = document.getElementById('transferTo').value;
    const select = document.getElementById('transferToFund');
    select.innerHTML = '<option value="main">Main Balance</option>';
    if (to === 'yucho') _appendYuchoFunds(app, select);
}

// ── Confirm / execute transfer ────────────────────────────────
export function confirmTransfer(app) {
    const from   = document.getElementById('transferFrom').value;
    const to     = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const desc   = document.getElementById('transferDesc').value || 'Transfer';

    if (!from || !to || !amount) {
        app.msg('⚠️ Please fill all required fields', true);
        return;
    }

    if (from === to) {
        const fromFundVal = document.getElementById('transferFromFund').value;
        const toFundVal   = document.getElementById('transferToFund').value;
        if (fromFundVal === toFundVal) {
            app.msg('⚠️ Cannot transfer to the same fund', true);
            return;
        }
    }

    const date      = new Date().toISOString().split('T')[0];
    const fromFund  = document.getElementById('transferFromFund').value;
    const toFund    = document.getElementById('transferToFund').value;
    const transferId = Date.now();

    const d = app.data[app.month];

    if (!d[from].transfers) d[from].transfers = [];
    if (!d[to].transfers)   d[to].transfers   = [];

    let fromFundName = 'Main';
    let toFundName   = 'Main';

    if (from === 'yucho' && fromFund !== 'main') {
        fromFundName = d.yucho.funds[parseInt(fromFund)].name;
    }
    if (to === 'yucho' && toFund !== 'main') {
        toFundName = d.yucho.funds[parseInt(toFund)].name;
    }

    d[from].transfers.push({
        id: transferId,
        linkedId: transferId + 1,
        type: 'out',
        date,
        amount,
        toAccount: to,
        toFundName,
        fundIdx: fromFund !== 'main' ? parseInt(fromFund) : null,
        desc
    });

    d[to].transfers.push({
        id: transferId + 1,
        linkedId: transferId,
        type: 'in',
        date,
        amount,
        fromAccount: from,
        fromFundName,
        fundIdx: toFund !== 'main' ? parseInt(toFund) : null,
        desc
    });

    closeTransferModal();
    app.render();
    app.msg(`✅ Transfer: ¥${app.fmt(amount)} from ${from} to ${to}`);
    app.saveData();
}

// ── Delete transfer (with modal confirmation) ─────────────────
export function deleteTransfer(app, account, transferIndex) {
    const transfer = app.data[app.month][account].transfers[transferIndex];
    if (!transfer) return;

    let modal = document.getElementById('deleteTransferModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteTransferModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <span class="close" onclick="app.closeDeleteTransferModal()">&times;</span>
                <div class="modal-header">⚠️ Delete Transfer</div>
                <p id="deleteTransferMsg" style="margin:20px 0;"></p>
                <button class="btn btn-delete" onclick="app.confirmDeleteTransfer(true)">✓ Yes, Delete</button>
                <button class="btn" onclick="app.confirmDeleteTransfer(false)">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    const typeStr    = transfer.type === 'out' ? 'outgoing' : 'incoming';
    const otherAcct  = transfer.type === 'out' ? transfer.toAccount : transfer.fromAccount;
    document.getElementById('deleteTransferMsg').textContent =
        `Delete this ${typeStr} transfer of ¥${app.fmt(transfer.amount)} to/from ${otherAcct}?\n\nThe linked transfer will also be deleted.`;

    app._deletingTransfer = { account, index: transferIndex, transfer };
    modal.style.display = 'block';
}

export function closeDeleteTransferModal(app) {
    const modal = document.getElementById('deleteTransferModal');
    if (modal) modal.style.display = 'none';
    app._deletingTransfer = null;
}

export function confirmDeleteTransfer(app, confirmed) {
    if (!confirmed || !app._deletingTransfer) {
        closeDeleteTransferModal(app);
        return;
    }

    const { account, index, transfer } = app._deletingTransfer;
    app.data[app.month][account].transfers.splice(index, 1);

    if (transfer.linkedId) {
        const other = transfer.type === 'out' ? transfer.toAccount : transfer.fromAccount;
        const transfers = app.data[app.month][other]?.transfers;
        if (transfers) {
            const linkedIdx = transfers.findIndex(t => t.id === transfer.linkedId);
            if (linkedIdx !== -1) transfers.splice(linkedIdx, 1);
        }
    }

    closeDeleteTransferModal(app);
    app.render();
    app.msg(`✅ Transfer deleted (¥${app.fmt(transfer.amount)})`);
    app.saveData();
}

// ── Edit fund on a Yucho transfer ────────────────────────────
export function editTransferFund(app, account, transferIndex) {
    const transfer = app.data[app.month][account].transfers[transferIndex];
    if (!transfer || transfer.toAccount !== 'yucho') {
        app.msg('⚠️ Can only edit fund for Yucho transfers', true);
        return;
    }

    app._editingTransfer = { account, index: transferIndex };

    const select = document.getElementById('editTransferFundSelect');
    select.innerHTML = '<option value="">-- Select Fund --</option>';
    app.data[app.month].yucho.funds.forEach((fund, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = fund.name;
        if (transfer.fundIdx === idx) opt.selected = true;
        select.appendChild(opt);
    });

    document.getElementById('editTransferFundModal').style.display = 'block';
}

export function closeEditTransferFundModal(app) {
    document.getElementById('editTransferFundModal').style.display = 'none';
    app._editingTransfer = null;
}

export function saveTransferFundEdit(app) {
    if (!app._editingTransfer) return;

    const fundIdx = document.getElementById('editTransferFundSelect').value;
    if (!fundIdx) { app.msg('⚠️ Please select a fund', true); return; }

    const { account, index } = app._editingTransfer;
    const transfer  = app.data[app.month][account].transfers[index];
    const fundName  = app.data[app.month].yucho.funds[parseInt(fundIdx)].name;

    transfer.fundIdx    = parseInt(fundIdx);
    transfer.toFundName = fundName;

    if (transfer.linkedId && app.data[app.month].yucho.transfers) {
        const linked = app.data[app.month].yucho.transfers.find(t => t.id === transfer.linkedId);
        if (linked) {
            linked.fundIdx       = parseInt(fundIdx);
            linked.fromFundName  = fundName;
        }
    }

    closeEditTransferFundModal(app);
    app.render();
    app.msg('✅ Transfer fund updated to: ' + fundName);
    app.saveData();
}

// ── Helpers ───────────────────────────────────────────────────
function _appendYuchoFunds(app, select) {
    app.data[app.month].yucho.funds.forEach((f, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = f.name;
        select.appendChild(opt);
    });
}

function _populateAccounts(app) {
    const fromSel = document.getElementById('transferFrom');
    const toSel   = document.getElementById('transferTo');

    fromSel.innerHTML = '<option value="">-- Select --</option>';
    toSel.innerHTML   = '<option value="">-- Select --</option>';

    const defaults = [
        { value: 'mizuho',   label: 'Mizuho'    },
        { value: 'yucho',    label: 'Yucho'     },
        { value: 'slsenfin', label: 'SLSenfin'  },
        { value: 'rakuten',  label: 'Rakuten'   },
        { value: 'medfun',   label: 'Med & Fun' },
    ];

    defaults.forEach(({ value, label }) => {
        fromSel.appendChild(new Option(label, value));
        toSel.appendChild(new Option(label, value));
    });

    app.customAccounts?.forEach(({ id, name }) => {
        fromSel.appendChild(new Option(name, id));
        toSel.appendChild(new Option(name, id));
    });
}
