// ============================================================
// modals/categories.js — Category & subcategory management
// ============================================================

export function openCategoriesModal(app) {
    renderCategories(app);
    document.getElementById('categoriesModal').style.display = 'block';
}

export function closeCategoriesModal() {
    document.getElementById('categoriesModal').style.display = 'none';
}

export function renderCategories(app) {
    let html = '';

    app.categories.forEach((cat, index) => {
        html += `
        <div class="category-item">
            <div class="category-header">
                <div class="category-name">${cat.name}
                    <span style="color:#999;font-size:12px;">(${cat.type})</span>
                </div>
                <button class="btn btn-delete btn-small" onclick="app.deleteCategory(${index})">🗑️</button>
            </div>
            <div class="account-types">
                ${cat.accounts.map(a => `<span class="account-type-badge">${a}</span>`).join('')}
            </div>
            <div class="subcategories">`;

        if (cat.subcategories?.length > 0) {
            html += '<strong style="font-size:12px;color:#666;">Subcategories:</strong> ';
            cat.subcategories.forEach(sub => {
                html += `<span class="subcategory-item">${sub}</span>`;
            });
            html += `<button class="btn btn-small" style="margin-left:10px;" onclick="app.addSubcategory(${index})">+ Add</button>`;
        } else {
            html += `<button class="btn btn-small" onclick="app.addSubcategory(${index})">+ Add Subcategory</button>`;
        }

        html += `</div></div>`;
    });

    document.getElementById('categoriesList').innerHTML = html;
}

export function filterCategories() {
    const filter = document.getElementById('categoryFilter').value.toLowerCase();
    document.querySelectorAll('.category-item').forEach(item => {
        const name = item.querySelector('.category-name').textContent.toLowerCase();
        item.style.display = name.includes(filter) ? '' : 'none';
    });
}

export function addCategory(app) {
    const name = document.getElementById('newCategoryName').value.trim();
    const type = document.getElementById('categoryType').value;

    if (!name) { app.msg('⚠️ Please enter a category name', true); return; }

    const accounts = [];
    if (document.getElementById('catForMizuho').checked)   accounts.push('mizuho');
    if (document.getElementById('catForYucho').checked)    accounts.push('yucho');
    if (document.getElementById('catForSlsenfin').checked) accounts.push('slsenfin');
    if (document.getElementById('catForRakuten').checked)  accounts.push('rakuten');
    if (document.getElementById('catForMedfun').checked)   accounts.push('medfun');

    if (accounts.length === 0) {
        app.msg('⚠️ Please select at least one account', true);
        return;
    }

    app.categories.push({ name, accounts, type, subcategories: [] });
    document.getElementById('newCategoryName').value = '';
    renderCategories(app);
    app.msg('✅ Category added: ' + name);
    app.saveData();
}

export function deleteCategory(app, index) {
    const name = app.categories[index].name;
    app.categories.splice(index, 1);
    renderCategories(app);
    app.msg('✅ Category deleted: ' + name);
    app.saveData();
}

// ── Subcategory add modal ─────────────────────────────────────
export function addSubcategory(app, catIndex) {
    let modal = document.getElementById('addSubcategoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'addSubcategoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close" onclick="app.closeAddSubcategoryModal()">&times;</span>
                <div class="modal-header">➕ Add Subcategory</div>
                <div class="form-group">
                    <label id="subcategoryCategoryLabel"></label>
                    <input type="text" id="subcategoryNameInput" placeholder="Subcategory name"
                           style="width:100%;padding:10px;font-size:16px;">
                </div>
                <button class="btn btn-success" onclick="app.saveSubcategory()" style="margin-top:15px;">✅ Add</button>
                <button class="btn" onclick="app.closeAddSubcategoryModal()">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('subcategoryCategoryLabel').textContent =
        'Add subcategory to: ' + app.categories[catIndex].name;
    document.getElementById('subcategoryNameInput').value = '';
    app._editingCategoryIndex = catIndex;
    modal.style.display = 'block';
    setTimeout(() => document.getElementById('subcategoryNameInput').focus(), 100);
}

export function closeAddSubcategoryModal(app) {
    const modal = document.getElementById('addSubcategoryModal');
    if (modal) modal.style.display = 'none';
}

export function saveSubcategory(app) {
    const name = document.getElementById('subcategoryNameInput').value.trim();
    if (!name || app._editingCategoryIndex === undefined) return;

    if (!app.categories[app._editingCategoryIndex].subcategories) {
        app.categories[app._editingCategoryIndex].subcategories = [];
    }
    app.categories[app._editingCategoryIndex].subcategories.push(name);

    renderCategories(app);
    app.msg('✅ Subcategory added: ' + name);
    app.saveData();
    closeAddSubcategoryModal(app);
}
