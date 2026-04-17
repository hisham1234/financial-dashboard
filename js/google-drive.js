// ============================================================
// google-drive.js — All Google Drive / OAuth logic
// ============================================================

const GOOGLE_CLIENT_ID = '9090497174-volmpgatcfokales3aeggvj1su63td5u.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const ENV = window.location.hostname.includes('localhost') ? 'dev' : 'prod';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let driveFileId = null;
let lastSyncTime = null;
let autoSyncInterval = null;
let autoRefreshInterval = null;

// ── Suppress noisy Google COOP warnings ──────────────────────
const _warn = console.warn;
const _error = console.error;
const _log = console.log;
const _suppress = (arg) =>
    arg && typeof arg === 'string' &&
    (arg.includes('Cross-Origin-Opener-Policy') ||
     arg.includes('window.opener') ||
     arg.includes('gapi.loaded'));
console.warn  = (...a) => { if (!_suppress(a[0])) _warn.apply(console, a); };
console.error = (...a) => { if (!_suppress(a[0])) _error.apply(console, a); };
console.log   = (...a) => { if (!_suppress(a[0])) _log.apply(console, a); };

// ── GAPI / GIS init ──────────────────────────────────────────
export function gapiLoaded() {
    console.log('✅ gapiLoaded()');
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({ apiKey: '', discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        console.log('✅ GAPI initialized');
        updateSigninStatus();
        setTimeout(tryAutoConnect, 1000);
    } catch (err) {
        console.error('❌ GAPI init error:', err);
    }
}

export function gisLoaded() {
    try {
        console.log('✅ gisLoaded()');
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '',
        });
        gisInited = true;
        if (typeof gapi !== 'undefined' && gapi.client) updateSigninStatus();
    } catch (err) {
        console.error('❌ GIS init error:', err);
    }
}

// ── Auto-connect on page load ─────────────────────────────────
async function tryAutoConnect() {
    const savedToken = localStorage.getItem('gdrive_access_token');
    if (!savedToken || !gapiInited) return;

    try {
        gapi.client.setToken({ access_token: savedToken });
        console.log('🔄 Auto-connected with saved token');
        updateSigninStatus();

        let fileId = localStorage.getItem('gdrive_file_id');
        if (!fileId) {
            fileId = await findExistingDriveFile();
            if (fileId) {
                localStorage.setItem('gdrive_file_id', fileId);
                driveFileId = fileId;
            }
        }

        await autoLoadFromDrive();
        enableAutoSync();
        enableAutoRefresh();
    } catch (err) {
        console.log('❌ Auto-connect failed — token may be expired');
        localStorage.removeItem('gdrive_access_token');
    }
}

// ── Status UI update ──────────────────────────────────────────
export function updateSigninStatus() {
    if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.getToken) return;

    const token = gapi.client.getToken();
    const statusEl = document.getElementById('driveStatus');
    const lastSyncEl = document.getElementById('lastSyncTime');

    if (!statusEl) return;

    if (token) {
        statusEl.textContent = '🟢 Connected';
        statusEl.style.color = '#43e97b';

        if (lastSyncEl && lastSyncTime) {
            const diff = Math.floor((Date.now() - lastSyncTime) / 1000);
            lastSyncEl.textContent = diff < 60
                ? `Synced: ${diff}s ago`
                : diff < 3600
                    ? `Synced: ${Math.floor(diff / 60)}m ago`
                    : `Synced: ${new Date(lastSyncTime).toLocaleTimeString()}`;
        }
    } else {
        statusEl.textContent = '⚪ Not connected';
        statusEl.style.color = '#999';
        if (lastSyncEl) lastSyncEl.textContent = '';
    }
}

// ── Connect ───────────────────────────────────────────────────
export function connectGoogleDrive() {
    if (!gapiInited || !gisInited) {
        alert(`Google Drive is still initializing.\n\nGAPI: ${gapiInited ? '✅' : '❌'}\nGIS: ${gisInited ? '✅' : '❌'}`);
        return;
    }

    tokenClient.callback = async (resp) => {
        if (resp.error) {
            console.error('❌ Auth error:', resp);
            alert(`Authentication failed: ${resp.error}\n${resp.error_description || ''}`);
            window.app?.msg('⚠️ Failed to connect to Google Drive', true);
            return;
        }

        localStorage.setItem('gdrive_access_token', resp.access_token);
        updateSigninStatus();
        window.app?.msg('✅ Connected to Google Drive');

        driveFileId = await findExistingDriveFile();
        if (driveFileId) {
            localStorage.setItem('gdrive_file_id', driveFileId);
            window.app?.msg('🔄 Loading your data from Drive...');
            await autoLoadFromDrive();
        } else {
            driveFileId = localStorage.getItem('gdrive_file_id');
            if (!driveFileId) {
                window.app?.msg('ℹ️ No backup found. Data will be saved on next change.');
            } else {
                await autoLoadFromDrive();
            }
        }

        enableAutoSync();
        enableAutoRefresh();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// ── Disconnect ────────────────────────────────────────────────
export function disconnectGoogleDrive() {
    const token = gapi.client.getToken();
    if (!token) return;

    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    localStorage.removeItem('gdrive_access_token');

    clearInterval(autoSyncInterval);
    clearInterval(autoRefreshInterval);

    updateSigninStatus();
    window.app?.msg('✅ Disconnected from Google Drive');
}

// ── Find existing backup file ─────────────────────────────────
async function findExistingDriveFile() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "name='financial-dashboard-data.json' and trashed=false",
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
            orderBy: 'modifiedTime desc'
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0].id : null;
    } catch (err) {
        console.error('Error searching for file:', err);
        return null;
    }
}

// ── Save to Drive ─────────────────────────────────────────────
export async function saveToGoogleDrive() {
    if (typeof gapi === 'undefined' || !gapi.client?.getToken) return;
    if (!gapi.client.getToken()) return;

    // Wait for app (max 5s)
    let attempts = 0;
    while (!window.app && attempts++ < 50) {
        await new Promise(r => setTimeout(r, 100));
    }
    if (!window.app) { console.error('App not ready'); return; }

    const payload = JSON.stringify({
        data: window.app.data,
        categories: window.app.categories,
        customAccounts: window.app.customAccounts || [],
        version: '15',
        lastSaved: new Date().toISOString()
    }, null, 2);

    const syncEl = document.getElementById('syncStatus');

    try {
        let fileId = localStorage.getItem('gdrive_file_id');

        if (!fileId) {
            fileId = await findExistingDriveFile();
            if (fileId) {
                localStorage.setItem('gdrive_file_id', fileId);
                driveFileId = fileId;
            }
        }

        if (fileId) {
            await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: payload
            });
        } else {
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify({
                name: 'financial-dashboard-data.json',
                mimeType: 'application/json'
            })], { type: 'application/json' }));
            form.append('file', new Blob([payload], { type: 'application/json' }));

            const res = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + gapi.client.getToken().access_token },
                    body: form
                }
            );
            const result = await res.json();
            localStorage.setItem('gdrive_file_id', result.id);
            driveFileId = result.id;
            window.app.msg('✅ Created backup in Google Drive');
        }

        lastSyncTime = Date.now();
        updateSigninStatus();
        if (syncEl) {
            syncEl.textContent = 'Synced ' + new Date().toLocaleTimeString();
            syncEl.style.color = '';
        }
    } catch (err) {
        console.error('Drive save error:', err);
        window.app?.msg('⚠️ Failed to sync to Google Drive', true);
        if (syncEl) {
            syncEl.textContent = '⚠️ Sync failed!';
            syncEl.style.color = '#e74c3c';
        }
    }
}

// ── Load from Drive (manual) ──────────────────────────────────
export async function loadFromGoogleDrive() {
    if (!gapi.client.getToken()) {
        window.app?.msg('⚠️ Please connect to Google Drive first', true);
        return;
    }

    const fileId = localStorage.getItem('gdrive_file_id');
    if (!fileId) {
        window.app?.msg('⚠️ No backup found. Save first to create one.', true);
        return;
    }

    window.app?.msg('🔄 Loading from Drive...');
    await _applyDriveData(fileId);
}

// ── Refresh from Drive ────────────────────────────────────────
export async function refreshFromDrive() {
    if (!window.app) { alert('⚠️ App not ready.'); return; }
    window.app.msg('🔄 Checking for updates...');
    await loadFromGoogleDrive();
}

// ── Auto-load on connect ──────────────────────────────────────
export async function autoLoadFromDrive(retryCount = 0) {
    if (!gapi.client.getToken()) return;

    let fileId = localStorage.getItem('gdrive_file_id');
    if (!fileId) {
        fileId = await findExistingDriveFile();
        if (fileId) {
            localStorage.setItem('gdrive_file_id', fileId);
            driveFileId = fileId;
        } else {
            window.app?.msg('ℹ️ No Drive backup found. Data will be saved automatically.');
            return;
        }
    }

    try {
        await _applyDriveData(fileId, retryCount);
    } catch (err) {
        if (err.status === 404) {
            localStorage.removeItem('gdrive_file_id');
            window.app?.msg('ℹ️ No Drive backup found. Data will be saved automatically.');
        } else {
            console.error('Auto-load error:', err);
            window.app?.msg('⚠️ Failed to load from Drive. Click "Refresh" to try again.', true);
        }
    }
}

// ── Shared helper: fetch Drive file → apply to app ────────────
async function _applyDriveData(fileId, retryCount = 0) {
    const response = await gapi.client.drive.files.get({ fileId, alt: 'media' });
    const imported = JSON.parse(response.body);

    if (!window.app) {
        if (retryCount < 10) {
            setTimeout(() => autoLoadFromDrive(retryCount + 1), 2000);
        } else {
            alert('⚠️ App initialization timeout. Please refresh.');
        }
        return;
    }

    if (imported.data)          window.app.data          = imported.data;
    if (imported.categories)    window.app.categories    = imported.categories;
    if (imported.customAccounts) window.app.customAccounts = imported.customAccounts;

    for (const monthKey in window.app.data) {
        window.app.validateMonthStructure(monthKey);
    }

    window.app.render();

    localStorage.setItem('financial-dashboard-v15', JSON.stringify({
        data: window.app.data,
        categories: window.app.categories,
        customAccounts: window.app.customAccounts,
        version: '15',
        lastSaved: new Date().toISOString(),
        isCacheOnly: false,
        loadedFromDrive: true
    }));

    window.app.msg('✅ Loaded latest data from Drive (saved: ' + new Date(imported.lastSaved).toLocaleString() + ')');
    lastSyncTime = Date.now();
    updateSigninStatus();
}

// ── Auto-sync (backup every 5 min) ───────────────────────────
function enableAutoSync() {
    clearInterval(autoSyncInterval);
    autoSyncInterval = setInterval(() => {
        if (gapi?.client?.getToken()) saveToGoogleDrive();
    }, 5 * 60 * 1000);
}

// ── Auto-refresh (check for remote changes every 5 min) ──────
function enableAutoRefresh() {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(async () => {
        if (!gapi?.client?.getToken()) return;
        const fileId = localStorage.getItem('gdrive_file_id');
        if (!fileId) return;
        try {
            const meta = await gapi.client.drive.files.get({ fileId, fields: 'modifiedTime' });
            const driveTime = new Date(meta.result.modifiedTime).getTime();
            if (lastSyncTime && driveTime > lastSyncTime) {
                window.app?.msg('📥 Updates detected from another device');
                await autoLoadFromDrive();
            }
        } catch (err) {
            console.error('Auto-refresh check failed:', err);
        }
    }, 5 * 60 * 1000);
}

// ── Debug status ──────────────────────────────────────────────
export function showDriveStatus() {
    const cached = localStorage.getItem('financial-dashboard-v15');
    let cacheStatus = 'None', cacheType = 'Unknown';
    if (cached) {
        try {
            const p = JSON.parse(cached);
            cacheType   = p.isCacheOnly ? 'Cache-only' : 'From Drive (trusted)';
            cacheStatus = `Present (${p.isCacheOnly ? '⚠️ not synced' : '✅ synced'})`;
        } catch { cacheStatus = 'Corrupted'; }
    }

    const status = {
        'GAPI Initialized': gapiInited,
        'GIS Initialized': gisInited,
        'Connected': !!(gapi?.client?.getToken()),
        'File ID': localStorage.getItem('gdrive_file_id') || 'None',
        'Access Token': localStorage.getItem('gdrive_access_token') ? 'Present' : 'None',
        'App Ready': !!window.app,
        'Last Sync': lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never',
        'Cache Status': cacheStatus,
        'Cache Type': cacheType
    };

    alert('Drive Status:\n\n' + Object.entries(status).map(([k, v]) => `${k}: ${v}`).join('\n'));
}
