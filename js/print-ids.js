// print-ids.js
// Handles merging missing secret codes, fetching users by type, and generating barcodes.

let selectedIds = new Set();
let currentFilteredList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Security Check
    const user = window.Permissions?.getCurrentUser();
    if (!user || user.role_id !== 1) {
        if (window.Toast) Toast.show('هذه الصفحة متاحة لمدير النظام فقط.', 'error');
        else alert('هذه الصفحة متاحة لمدير النظام فقط.');
        window.location.href = 'dashboard.html';
        return;
    }
    // 1. Populate branches
    const branches = Storage.get('branches') || [];
    const bFilter = document.getElementById('branch-filter');
    if (bFilter) {
        branches.forEach(b => {
             const opt = document.createElement('option');
             opt.value = b.id;
             opt.textContent = b.name;
             bFilter.appendChild(opt);
        });
        
        const activeBranchId = window.Permissions?.getActiveBranchId();
        if (activeBranchId) {
            bFilter.value = activeBranchId;
            bFilter.disabled = true; // Lock the view to their own branch
        }
    }

    // 2. Automagically bind the Missing Secret Codes to old offline objects! (Migration)
    await ensureSecureCodesExist();

    // 3. Recalibrate the sequential student counter to match current data
    if (window.Utils && Utils.recalibrateStudentCounter) {
        Utils.recalibrateStudentCounter();
    }

    // 4. Render the IDs on screen
    window.loadUsersForPrint(true); // Initial load resets selection
});

async function ensureSecureCodesExist() {
    try {
        let maxWait = 20;
        while (window.IDBEngine && !window.IDBEngine.isReady && maxWait > 0) {
            await new Promise(r => setTimeout(r, 100));
            maxWait--;
        }

        let requiresSave = false;
        let students = Storage.get('students') || [];
        students.forEach(s => {
            const fixed = Utils.generateFixedCode('STD', s.id);
            if (s.code !== fixed) { s.code = fixed; requiresSave = true; }
        });
        if (requiresSave) { await Storage.save('students', students); requiresSave = false; }

        let trainers = Storage.get('trainers') || [];
        trainers.forEach(t => {
            // Use phone number as seed for trainers to ensure persistence
            const fixed = Utils.generateFixedCode('TRA', t.phone || t.id);
            if (t.code !== fixed) { t.code = fixed; requiresSave = true; }
        });
        if (requiresSave) { await Storage.save('trainers', trainers); requiresSave = false; }

        let users = Storage.get('users') || [];
        users.forEach(u => {
            if (u.role_id !== 1) {
                // Use username or phone as seed for employees
                const fixed = Utils.generateFixedCode('EMP', u.username || u.id);
                if (u.code !== fixed) { u.code = fixed; requiresSave = true; }
            }
        });
        if (requiresSave) { await Storage.save('users', users); }
    } catch(e) { console.error("Migration Error:", e); }
}

window.loadUsersForPrint = function(resetSelection = false) {
    const type = document.getElementById('user-type').value;
    const branchId = document.getElementById('branch-filter').value;
    const searchInput = (document.getElementById('name-search')?.value || '').toLowerCase();
    
    const displayGrid = document.getElementById('screen-preview-grid');
    if (!displayGrid) return;
    
    displayGrid.innerHTML = '';
    if (resetSelection) selectedIds.clear();

    let list = [];
    if (type === 'student') {
        list = (Storage.get('students') || []).map(i => ({...i, _category: 'student', _roleName: 'طالب'}));
        if (branchId !== 'all') list = list.filter(l => String(l.branch) === String(branchId) || String(l.branch_id) === String(branchId));
    } else if (type === 'trainer') {
        list = (Storage.get('trainers') || []).map(i => ({...i, _category: 'trainer', _roleName: 'محاضر / مدرب'}));
        if (branchId !== 'all') list = list.filter(l => l.is_global || (l.branch_ids && l.branch_ids.includes(Number(branchId))) || String(l.branch_id) === String(branchId));
    } else if (type === 'employee') {
        list = (Storage.get('users') || []).filter(u => u.role_id !== 1).map(i => ({...i, _category: 'employee', _roleName: 'موظف'}));
        if (branchId !== 'all') list = list.filter(l => String(l.branch) === String(branchId));
    } else if (type === 'all_types') {
        // Blended List
        const students = (Storage.get('students') || []).map(i => ({...i, _category: 'student', _roleName: 'طالب'}));
        const trainers = (Storage.get('trainers') || []).map(i => ({...i, _category: 'trainer', _roleName: 'محاضر / مدرب'}));
        const employees = (Storage.get('users') || []).filter(u => u.role_id !== 1).map(i => ({...i, _category: 'employee', _roleName: 'موظف'}));
        
        list = [...students, ...trainers, ...employees];
        if (branchId !== 'all') {
            list = list.filter(l => {
                const b = String(l.branch || l.branch_id || '');
                if (l._category === 'trainer') return l.is_global || (l.branch_ids && l.branch_ids.includes(Number(branchId))) || b === String(branchId);
                return b === String(branchId);
            });
        }
    }

    // Filter by name (Arabic normalization support)
    if (searchInput && window.Formatter) {
        const term = Formatter.normalizeArabic(searchInput);
        list = list.filter(i => Formatter.normalizeArabic(i.name || '').includes(term));
    } else if (searchInput) {
        list = list.filter(i => (i.name || '').toLowerCase().includes(searchInput));
    }

    // Sort students by sequential serial number ascending (S-1001 before S-1002)
    if (type === 'student' || type === 'all_types') {
        list.sort((a, b) => {
            const getNum = (item) => {
                const m = String(item.serial_id || item.code || '').match(/(\d+)$/);
                return m ? parseInt(m[1]) : 999999;
            };
            return getNum(a) - getNum(b);
        });
    }

    currentFilteredList = list;

    if (list.length === 0) {
        displayGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted); font-weight: 700; font-size: 1.2rem;">لا توجد بيانات (كروت) مسجلة بهذه الفلاتر لطباعتها.</div>';
        updatePrintArea();
        updateSelectionStats();
        return;
    }

    // If it was a reset load, select all by default
    if (resetSelection) {
        list.forEach(item => {
            const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
            selectedIds.add(uniqueId);
        });
        const allCheck = document.getElementById('select-all');
        if (allCheck) allCheck.checked = true;
    }

    const config = Storage.get('app_config') || {};
    const orgName = config.appName || 'EduMaster Academy';

    list.forEach(item => {
        const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
        const isSelected = selectedIds.has(uniqueId);
        const publicId = item.serial_id || item.code || 'ERR-MISSING';
        const shortName = (item.name || 'بدون اسم').split(' ').slice(0, 3).join(' ');
        const roleName = item._roleName || (type === 'student' ? 'طالب' : type === 'trainer' ? 'محاضر / مدرب' : 'موظف');
        
        // v8.0: Customizable ID Card Info (Replaces Barcode)
        const infoType = config.idCardInfoType || 'group';
        const customText = config.idCardCustomText || '';
        const customFontSize = config.idCardFontSize || '1.1rem';
        let displayInfo = '';
        
        if (infoType === 'group') {
            displayInfo = item.study_group || item.group || (item._category === 'student' ? 'غير محدد' : '---');
        } else if (infoType === 'center') {
            displayInfo = config.appName || 'EduMaster Pro';
        } else {
            displayInfo = customText;
        }

        const displayIdHtml = `<div class="id-card-public-id">ID: ${publicId}</div>`;

        const sCard = document.createElement('div');
        sCard.className = `id-card-modern ${isSelected ? '' : 'disabled-card'}`;
        sCard.setAttribute('data-id', uniqueId);
        if (!isSelected) sCard.style.opacity = '0.5';
        
        sCard.innerHTML = `
            <div style="position: absolute; top: 10px; left: 10px; z-index: 10;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelection('${uniqueId}', this)" style="width: 22px; height: 22px; cursor: pointer; accent-color: var(--saas-primary);">
            </div>
            <div class="id-card-header">
                <span class="id-card-role">${roleName}</span>
                <span class="id-card-org-name">${orgName}</span>
            </div>
            <div class="id-card-body">
                <div class="id-card-main-info">
                    <div class="id-card-name">${shortName}</div>
                    <div class="id-card-photo-wrapper">
                        ${item.photo ? `<img src="${item.photo}" class="id-card-photo" alt="Photo">` : `<img src="../education.png" class="id-card-photo" style="width:70%; opacity:0.6; object-fit:contain;" alt="No Photo">`}
                    </div>
                </div>
                <div class="id-card-barcode-section">
                    <div style="font-weight: 900; color: #1e293b; font-size: ${customFontSize}; text-align: center;">${displayInfo}</div>
                    ${displayIdHtml}
                </div>
            </div>
            <div class="id-card-footer">
                نظام الإدارة الذكي - ${orgName}
            </div>
        `;
        displayGrid.appendChild(sCard);
    });

    updatePrintArea();
    updateSelectionStats();
};

window.toggleSelection = function(id, checkbox) {
    const idStr = String(id);
    if (checkbox.checked) {
        selectedIds.add(idStr);
    } else {
        selectedIds.delete(idStr);
    }
    
    // Visual update of preview card
    const card = document.querySelector(`.id-card-modern[data-id="${id}"]`);
    if (card) card.style.opacity = checkbox.checked ? '1' : '0.5';
    
    updatePrintArea();
    updateSelectionStats();
};

window.toggleAllSelections = function(checkbox) {
    const isChecked = checkbox.checked;
    currentFilteredList.forEach(item => {
        const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
        if (isChecked) selectedIds.add(uniqueId);
        else selectedIds.delete(uniqueId);
    });
    
    // Re-render preview to apply visual state (simpler than manual DOM manipulation for all)
    window.loadUsersForPrint(false);
};

function updateSelectionStats() {
    const total = currentFilteredList.length;
    const selectedCount = currentFilteredList.filter(item => {
        const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
        return selectedIds.has(uniqueId);
    }).length;
    const statLabel = document.getElementById('selected-count');
    if (statLabel) statLabel.textContent = `مختار: ${selectedCount} من ${total}`;
    
    const allCheck = document.getElementById('select-all');
    if (allCheck) {
        allCheck.checked = (total > 0 && selectedCount === total);
        allCheck.indeterminate = (selectedCount > 0 && selectedCount < total);
    }
}

function updatePrintArea() {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    printArea.innerHTML = '';

    const type = document.getElementById('user-type').value;
    const config = Storage.get('app_config') || {};
    const orgName = config.appName || 'EduMaster Academy';
    
    const selectedList = currentFilteredList.filter(item => {
        const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
        return selectedIds.has(uniqueId);
    });

    selectedList.forEach(item => {
        const publicId = item.serial_id || item.code || 'ERR-MISSING';
        const shortName = (item.name || 'بدون اسم').split(' ').slice(0, 3).join(' ');
        const roleName = item._roleName || (type === 'student' ? 'طالب' : type === 'trainer' ? 'محاضر / مدرب' : 'موظف');
        
        // v8.0: Customizable ID Card Info (Replaces Barcode)
        const infoType = config.idCardInfoType || 'group';
        const customText = config.idCardCustomText || '';
        let displayInfo = '';
        
        if (infoType === 'group') {
            displayInfo = item.study_group || item.group || (item._category === 'student' ? 'غير محدد' : '---');
        } else if (infoType === 'center') {
            displayInfo = config.appName || 'EduMaster Pro';
        } else {
            displayInfo = customText;
        }

        const printIdHtml = `<div class="print-public-id">ID: ${publicId}</div>`;

        const pCard = document.createElement('div');
        pCard.className = 'id-card-print';
        pCard.innerHTML = `
            <div class="print-header">
                <span class="print-role">${roleName}</span>
                <span class="print-org">${orgName}</span>
            </div>
            <div class="print-body">
                <div class="print-main-info">
                    <div class="print-name">${shortName}</div>
                    <div class="print-photo-wrapper">
                        ${item.photo ? `<img src="${item.photo}" class="print-photo" alt="Photo">` : `<img src="../education.png" class="print-photo" style="width:70%; opacity:0.3; object-fit:contain;" alt="No Photo">`}
                    </div>
                </div>
                <div class="print-barcode-section">
                    <div style="font-weight: 900; color: #000; font-size: ${customFontSize}; text-align: center;">${displayInfo}</div>
                    ${printIdHtml}
                </div>
            </div>
            <div class="print-footer">
                نظام الإدارة الذكي - ${orgName}
            </div>
        `;
        printArea.appendChild(pCard);
    });
}

window.triggerPrint = function() {
    const selectedCount = currentFilteredList.filter(item => {
        const uniqueId = item._category ? `${item._category}_${item.id}` : String(item.id);
        return selectedIds.has(uniqueId);
    }).length;
    
    if (selectedCount === 0) {
        if (window.Toast) Toast.show('يرجى اختيار كارت واحد على الأقل للطباعة', 'error');
        else alert('يرجى اختيار كارت واحد على الأقل للطباعة');
        return;
    }
    window.print();
};
