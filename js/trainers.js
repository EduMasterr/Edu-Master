/**
 * Trainers Management Module
 * - Handles trainer data, financial settings (salary/ratio)
 */
class TrainersManager {
    constructor() {
        this.container = document.getElementById('trainers-table-body');
        this.form = document.getElementById('trainer-form'); 
        this.searchInput = document.getElementById('search-trainers');
        this.currentTrainer = null;
        this.init();
    }

    init() {
        if (!this.container) return;
        this.recalibrateCodes(); // 🔄 توحيد الأكواد فور التشغيل
        this.render();
        this.attachEvents();
    }

    /**
     * 🔥 Migration Logic: Ensures every trainer's manual code matches their Card ID
     */
    recalibrateCodes() {
        const trainers = Storage.get('trainers') || [];
        let changed = false;

        trainers.forEach(t => {
            if (window.Utils?.generateFixedCode) {
                const numericCode = Utils.generateFixedCode('TRA', t.phone || t.id);
                // Update BOTH fields to ensure consistency across the system
                if (t.trainerCode !== numericCode || t.code !== numericCode) {
                    t.trainerCode = numericCode;
                    t.code = numericCode;
                    changed = true;
                }
            }
        });

        if (changed) {
            Storage.save('trainers', trainers);
            console.log("✅ Trainers ID Restructuring Completed Successfully.");
        }
    }

    render() {
        const allTrainers = Storage.get('trainers') || [];
        const activeBranchId = Permissions.getActiveBranchId();
        const query = (this.searchInput?.value || '').trim().toLowerCase();
        this.container.innerHTML = '';

        const branchTrainers = query ? allTrainers : allTrainers.filter(t => {
            if (!activeBranchId || activeBranchId === 'null') return true;
            const b = String(t.branch_id || t.branch || '');
            const activeB = String(activeBranchId);
            return t.is_global || b === activeB || (t.branch_ids && t.branch_ids.map(String).includes(activeB));
        });

        const filtered = branchTrainers.filter(t => {
            const nameNorm = Formatter.normalizeArabic(t.name || '');
            const queryNorm = Formatter.normalizeArabic(query);
            const codeRaw = String(t.trainerCode || t.code || '');
            
            return !query ||
                nameNorm.includes(queryNorm) ||
                codeRaw.includes(query) ||
                (t.phone && t.phone.includes(query)) ||
                (t.specialty && Formatter.normalizeArabic(t.specialty || '').includes(queryNorm));
        });

        const label = document.getElementById('branch-nav-label');
        if (label) label.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> ${filtered.length}`;

        if (filtered.length === 0) {
            this.container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px;">لا يوجد نتائج</td></tr>';
            return;
        }

        const sorted = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

        sorted.forEach(trainer => {
            const tr = document.createElement('tr');
            let paymentText = trainer.paymentMode === 'ratio' ? `نسبة (${trainer.paymentRatio || 0}%)` : 
                             (trainer.paymentMode === 'fixed_ratio' ? `${trainer.paymentValue || 0} + ${trainer.paymentRatio || 0}%` : `${trainer.paymentValue || 0} ج.م`);

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar" style="background: ${trainer.gender === 'female' ? '#fdf2f8' : '#f0f9ff'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                             ${trainer.photo ? 
                                 `<img src="${trainer.photo}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">` : 
                                 `<img src="../education.png" style="width:70%; height:70%; opacity:0.6; object-fit:contain;">`
                             }
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 800;">${trainer.name}</span>
                            <div style="display:flex; gap:10px; align-items:center; margin-top:2px;">
                                <code style="background: #1a9e9c15; color: var(--accent-teal); padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 0.8rem; border: 1px solid #1a9e9c22;">ID: ${trainer.trainerCode || trainer.code}</code>
                                <small style="color: var(--text-muted); font-weight: 600;">${trainer.phone}</small>
                            </div>
                        </div>
                    </div>
                </td>
                <td><span style="font-weight: 700;">${trainer.specialty || '-'}</span></td>
                <td><span class="badge-premium">${this.getContractLabel(trainer.contractType)}</span></td>
                <td><span style="color: var(--accent-teal); font-weight: 800;">${paymentText}</span></td>
                <td><span class="status-badge ${trainer.status === 'Active' ? 'status-confirmed' : 'status-cancelled'}">${trainer.status || 'نشط'}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="action-btn view-trainer" data-id="${trainer.id}"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn edit-trainer" data-id="${trainer.id}"><i class="fa-solid fa-edit"></i></button>
                        <button class="action-btn delete-trainer" data-id="${trainer.id}" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            this.container.appendChild(tr);
        });
    }

    getContractLabel(type) {
        const labels = { 'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', 'freelance': 'مستقل' };
        return labels[type] || type;
    }

    getBranchDisplay(trainer) {
        if (trainer.is_global || !trainer.branch_id && !trainer.branch_ids) {
            return '<i class="fa-solid fa-earth-africa"></i> جميع الفروع';
        }
        
        const branches = Storage.get('branches') || [];
        if (trainer.branch_ids && Array.isArray(trainer.branch_ids)) {
            const names = trainer.branch_ids.map(id => {
                const b = branches.find(x => x.id == id);
                return b ? b.name : null;
            }).filter(Boolean);
            return names.length > 0 ? names.join(' - ') : 'غير محدد';
        }

        const b = branches.find(x => x.id == trainer.branch_id);
        return b ? b.name : 'غير محدد';
    }

    attachEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.render());
        }

        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-trainer');
            const editBtn = e.target.closest('.edit-trainer');
            const delBtn = e.target.closest('.delete-trainer');

            if (viewBtn) this.openProfile(viewBtn.dataset.id);
            if (editBtn) this.openEdit(editBtn.dataset.id);
            if (delBtn) this.delete(delBtn.dataset.id);
        });
    }

    openProfile(id) {
        const trainers = Storage.get('trainers') || [];
        const t = trainers.find(x => x.id == id);
        if (!t) return;

        this.currentTrainer = t;

        let profileHtml = `
            <div class="modal-overlay" id="trainer-profile-modal">
                <style>
                    .p-badge { background: var(--bg-main); padding: 8px 15px; border-radius: 10px; font-weight: 800; border: 1px solid var(--border-soft); }
                    .info-header { display: flex; align-items: center; gap: 20px; padding: 30px; border-bottom: 2px solid var(--bg-main); background: #fff; }
                </style>
                <div class="modal-container" style="max-width: 800px; padding: 0; overflow: hidden; border-radius: 30px;">
                    <div class="info-header">
                        <div style="width: 100px; height: 100px; border-radius: 20px; background: var(--accent-teal-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                            ${t.photo ? 
                                `<img src="${t.photo}" style="width:100%; height:100%; object-fit:cover;">` : 
                                `<img src="../education.png" style="width:70%; height:70%; opacity:0.6; object-fit:contain;">`
                            }
                        </div>
                        <div style="flex: 1;">
                            <h2 style="margin: 0; font-weight: 900; color: var(--sidebar-bg); font-size: 1.6rem;">${t.name}</h2>
                            <div style="display: flex; gap: 15px; margin-top: 8px; align-items: center;">
                                <span class="p-badge" style="color: var(--accent-teal); border-color: var(--accent-teal-soft);"><i class="fa-solid fa-code"></i> ${t.trainerCode || t.code || 'N/A'}</span>
                                <span class="p-badge"><i class="fa-solid fa-user-tie"></i> ${t.specialty || 'تخصص غير معروف'}</span>
                                <span class="status-badge ${t.status === 'Active' ? 'status-confirmed' : 'status-cancelled'}">${t.status === 'Active' ? 'نشط' : 'متوقف'}</span>
                            </div>
                        </div>
                        <button onclick="Modal.close('trainer-profile-modal')" style="background: var(--bg-main); border: none; width: 45px; height: 45px; border-radius: 12px; cursor: pointer; font-size: 1.2rem; color: var(--text-muted);">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>

                    <div style="padding: 30px; background: #fff;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                            <div class="form-section-card" style="margin-bottom: 0;">
                                <h4 style="margin: 0 0 15px; font-weight: 900; display: flex; align-items: center; gap: 10px; color: var(--sidebar-bg);">
                                    <i class="fa-solid fa-phone" style="color: #6366f1;"></i> بيانات التواصل
                                </h4>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: 700; color: var(--text-muted);">رقم الجوال:</span>
                                        <span style="font-weight: 800;">${t.phone}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: 700; color: var(--text-muted);">البريد الإلكتروني:</span>
                                        <span style="font-weight: 800;">${t.email || '-'}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: 700; color: var(--text-muted);">نطاق العمل (الفروع):</span>
                                        <span style="font-weight: 800; color: var(--accent-teal);">${this.getBranchDisplay(t)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-section-card" style="margin-bottom: 0; border-right: 5px solid #f59e0b;">
                                <h4 style="margin: 0 0 15px; font-weight: 900; display: flex; align-items: center; gap: 10px; color: #f59e0b;">
                                    <i class="fa-solid fa-coins"></i> الإعدادات المالية
                                </h4>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: 700; color: var(--text-muted);">نظام الحساب:</span>
                                        <span style="font-weight: 800;">${t.paymentMode === 'fixed' ? 'راتب ثابت' : t.paymentMode === 'ratio' ? 'نسبة مئوية' : 'أساسي + نسبة'}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: 700; color: var(--text-muted);">المبلغ المالي:</span>
                                        <span style="font-weight: 900; color: var(--accent-teal);">${t.paymentValue} ج.م</span>
                                    </div>
                                    ${t.paymentRatio ? `<div style="display: flex; justify-content: space-between;"><span style="font-weight: 700; color: var(--text-muted);">النسبة المتفق عليها:</span><span style="font-weight: 900; color: #f59e0b;">${t.paymentRatio}%</span></div>` : ''}
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 15px;">
                            <button onclick="window.trainersManager.openEdit('${t.id}')" class="app-btn-primary" style="flex: 1; height: 55px; border-radius: 15px; font-weight: 900;">
                                <i class="fa-solid fa-edit"></i> تعديل بيانات المحاضر
                            </button>
                            <button onclick="window.trainersManager.printID('${t.id}')" class="btn-neuro" style="flex: 1; border: 2px solid var(--accent-teal); color: var(--accent-teal); background: transparent; font-weight:900;">
                                <i class="fa-solid fa-print"></i> طباعة كود الحضور
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        let old = document.getElementById('trainer-profile-modal');
        if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', profileHtml);
        Modal.open('trainer-profile-modal');
    }

    openEdit(id) {
        window.location.href = `add-trainer.html?editId=${id}`;
    }

    printID(id) {
        if (window.IDGenerator) {
            window.IDGenerator.previewSingleCard('trainer', id);
        } else {
            Toast.show('عذراً، محرك الطباعة غير متوفر في هذه الصفحة', 'error');
        }
    }

    delete(id) {
        const trainers = Storage.get('trainers') || [];
        const trainer = trainers.find(t => t.id == id);
        if (!trainer) return;

        Modal.secureDelete(trainer.name, () => {
            const filtered = trainers.filter(t => t.id != id);
            Storage.save('trainers', filtered);
            this.render();
            Toast.show('تم حذف المحاضر بنجاح', 'success');
        });
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.trainersManager = new TrainersManager();
    document.addEventListener('branchChanged', () => {
        window.trainersManager?.render();
    });
});
