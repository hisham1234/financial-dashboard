# financial-dashboard
Personal Financial Dashboard with Google Drive Sync
financial-dashboard/
├── index.html                  ← pure HTML shell, no logic
├── css/styles.css              ← all styles extracted
└── js/
    ├── main.js                 ← orchestrator + app object
    ├── google-drive.js         ← all OAuth/sync logic
    ├── data/
    │   ├── calculations.js     ← pure math, no DOM, no side-effects
    │   └── carry-forward.js    ← month init, structure validation, cascading
    ├── accounts/
    │   ├── mizuho.js           ← Mizuho render + CRUD
    │   ├── yucho.js            ← Yucho funds render + CRUD
    │   └── standard.js         ← SLSenfin/Rakuten/medfun/custom
    ├── modals/
    │   ├── transfer.js
    │   ├── categories.js
    │   └── accounts.js
    └── reports/
        └── index.js            ← all 5 report views