class BranchesManager {
    constructor() {
        this.container = document.querySelector('.stats-grid');
        this.form = document.getElementById('branch-form');
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.attachEvents();
    }

    render() {
        const activeBranchId = window.Permissions?.getActiveBranchId();
        const allBranches = Storage.get('branches') || [];
        if (!this.container) return;

        const filtered = activeBranchId ? allBranches.filter(b => b.id === activeBranchId) : allBranches;

        const label = document.getElementById('branch-nav-label');
        if (label) {
            label.innerHTML = `<i class="fa-solid fa-building-columns" style="color:var(--accent-teal); margin-left:5px;"></i> ${filtered.length}`;
            label.style.color = 'var(--accent-teal)';
            label.style.fontWeight = '900';
            label.style.fontSize = '14px';
            label.title = `إجمالي الفروع النشطة: ${filtered.length}`;
            
            // Fix container width constraint
            const parent = label.closest('#branch-switcher-nav');
            if (parent) {
                parent.style.minWidth = 'auto';
                parent.style.padding = '5px 12px';
            }
        }

        this.container.innerHTML = '';
        if (filtered.length === 0) {
            this.container.innerHTML = '<div style="padding:40px; text-align:center; width:100%; grid-column: 1/-1;">لا توجد فروع مسجلة أو متاحة للعرض</div>';
            return;
        }

        filtered.forEach(branch => {
            const card = document.createElement('div');
            card.className = 'branch-card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div class="branch-logo-mini" style="width:50px; height:50px; background:var(--bg-input); border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            ${branch.logo ? `<img src="${branch.logo}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid fa-building-columns" style="color:var(--accent-teal); font-size:1.4rem;"></i>`}
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:1.3rem; color: var(--accent-teal); font-weight: 900;">${branch.name}</h3>
                            <p style="margin:3px 0 0; font-size:0.75rem; color:var(--text-muted); font-weight:700;">كود الفرع: #${branch.id}</p>
                        </div>
                    </div>
                    <span class="status-badge ${branch.status === 'Active' ? 'status-confirmed' : 'status-pending'}">
                        ${branch.status === 'Active' ? 'نشط' : 'متوقف'}
                    </span>
                </div>
                
                <div style="background:var(--accent-teal-soft); padding:15px; border-radius:12px; margin-bottom:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                        <span style="font-size:0.85rem; color:var(--text-main); font-weight:700;">إجمالي الطلاب</span>
                        <span style="font-size:1.2rem; font-weight:900; color:var(--accent-teal);">${branch.students || 0}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; opacity: 0.8;">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">السعة المتاحة</span>
                        <span style="font-size:0.9rem; font-weight:900; color:${(branch.capacity && (branch.students || 0) >= branch.capacity) ? '#ef4444' : 'var(--text-main)'};">
                            ${branch.capacity ? branch.capacity : '∞'}
                        </span>
                    </div>
                    ${(branch.capacity && (branch.students || 0) >= branch.capacity) ? `
                        <div style="margin-top: 10px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2);">
                            ⚠️ الفرع وصل للسعة الكاملة
                        </div>
                    ` : ''}
                </div>

                <div style="display:flex; gap:12px; margin-top:auto;">
                    <button class="btn-neuro btn-secondary edit-branch" data-id="${branch.id}" style="padding:10px; flex:1; font-weight:800; font-size:0.85rem;">
                        <i class="fa-solid fa-pen-to-square"></i> تعديل
                    </button>
                    ${Permissions.isAdmin() ? `
                        <button class="btn-neuro btn-danger delete-branch" data-id="${branch.id}" style="padding:10px; flex:1; font-weight:800; font-size:0.85rem; background: rgba(239, 68, 68, 0.1) !important; border: 1.5px solid rgba(239, 68, 68, 0.3) !important; color: #ef4444 !important;">
                            <i class="fa-solid fa-trash-can"></i> حذف
                        </button>
                    ` : ''}
                </div>
            `;
            this.container.appendChild(card);
        });
    }

    attachEvents() {
        // Use a wrapper listener to avoid multiple attachments
        if (window._branchesEventsAttached) return;
        window._branchesEventsAttached = true;

        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-branch');
            const delBtn = e.target.closest('.delete-branch');
            const addBtn = e.target.closest('#btn-add-branch');
            const closeBtn = e.target.closest('.close-modal');

            if (editBtn) {
                e.preventDefault();
                const instance = window.BranchesInstance || this;
                instance.handleEdit(editBtn.dataset.id);
            }
            if (delBtn) {
                e.preventDefault();
                const instance = window.BranchesInstance || this;
                instance.handleDelete(delBtn.dataset.id);
            }
            if (addBtn) {
                e.preventDefault();
                const instance = window.BranchesInstance || this;
                instance.resetForm();
                Modal.open('branch-modal');
            }
            if (closeBtn) {
                const modal = closeBtn.closest('.modal-overlay');
                if (modal) Modal.close(modal.id);
            }
        });

        if (this.form) {
            this.form.onsubmit = (e) => {
                e.preventDefault();
                this.save();
            };

            const logoUpload = document.getElementById('logo-upload');
            if (logoUpload) {
                logoUpload.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            const base64Logo = re.target.result;
                            document.getElementById('logo-hidden').value = base64Logo;
                            this.updateLogoPreview(base64Logo);
                        };
                        reader.readAsDataURL(file);
                    }
                };
            }
        }
    }

    updateLogoPreview(src) {
        const preview = document.getElementById('logo-preview-container');
        if (preview) {
            if (src) {
                preview.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                preview.innerHTML = `<i class="fa-solid fa-image" style="color: var(--text-secondary); opacity: 0.5;"></i>`;
            }
        }
    }

    save() {
        const formData = new FormData(this.form);
        const id = formData.get('branchId');
        const branches = Storage.get('branches') || [];

        const branchData = {
            id: id ? parseInt(id) : Date.now(),
            name: formData.get('name'),
            capacity: parseInt(formData.get('capacity')) || 0,
            status: 'Active',
            logo: document.getElementById('logo-hidden').value || '',
            students: id ? (branches.find(b => b.id === parseInt(id))?.students || 0) : 0
        };

        if (id) {
            const index = branches.findIndex(b => b.id === parseInt(id));
            if (index !== -1) branches[index] = branchData;
            Toast.show('تم تحديث بيانات الفرع بنجاح', 'success');
        } else {
            branches.push(branchData);
            Toast.show('تم إضافة الفرع الجديد بنجاح', 'success');
        }

        const username = formData.get('username');
        const password = formData.get('password');
        if (username && password) {
            const users = Storage.get('users') || [];
            let user = users.find(u => u.branch === branchData.id && u.role_id === 2);
            if (user) {
                user.username = username;
                user.password = password;
                user.name = `مدير فرع ${branchData.name}`;
            } else {
                users.push({
                    id: Date.now(),
                    username: username,
                    password: password,
                    role_id: 2,
                    name: `مدير فرع ${branchData.name}`,
                    branch: branchData.id
                });
            }
            Storage.save('users', users);
        }

        Storage.save('branches', branches);
        this.render();
        Modal.close('branch-modal');
    }

    handleEdit(id) {
        const branches = Storage.get('branches') || [];
        const branch = branches.find(b => b.id === parseInt(id));
        if (branch) {
            this.form.querySelector('[name="branchId"]').value = branch.id;
            this.form.querySelector('[name="name"]').value = branch.name;
            this.form.querySelector('[name="capacity"]').value = branch.capacity || 0;
            const logoVal = branch.logo || '';
            document.getElementById('logo-hidden').value = logoVal;
            this.updateLogoPreview(logoVal);

            const users = Storage.get('users') || [];
            const admin = users.find(u => u.branch === branch.id && u.role_id === 2);
            if (admin) {
                this.form.querySelector('[name="username"]').value = admin.username;
                this.form.querySelector('[name="password"]').value = admin.password;
            } else {
                this.form.querySelector('[name="username"]').value = '';
                this.form.querySelector('[name="password"]').value = '';
            }

            Modal.open('branch-modal');
        }
    }

    handleDelete(id) {
        if (!Permissions.isAdmin()) {
            if (window.AudioCore) AudioCore.playWarning();
            Toast.show('عذراً، وظيفة الحذف متاحة للمدير العام فقط', 'error');
            return;
        }

        if (window.AudioCore) AudioCore.playScare();

        Modal.confirm({
            title: 'تأكيد الحذف النهائي (1/3)',
            message: 'هل أنت متأكد من حذف هذا الفرع؟ سيؤدي هذا لمسح كافة البيانات المرتبطة.',
            confirmText: 'نعم، تابع',
            icon: 'fa-skull-crossbones',
            onConfirm: () => {
                Modal.confirm({
                    title: 'تأكيد أمني (2/3)',
                    message: '🚨 سيتم أيضاً حذف كافة حسابات الموظفين والمدراء التابعين لهذا الفرع. هل تستمر؟',
                    confirmText: 'أنا متأكد، استمر',
                    icon: 'fa-triangle-exclamation',
                    onConfirm: () => {
                        Modal.confirm({
                            title: 'الخطوة الأخيرة (3/3)',
                            message: '⚠️ لا يمكن التراجع! هل تريد الحذف الآن؟',
                            confirmText: 'احذف نهائياً',
                            icon: 'fa-bolt',
                            onConfirm: () => {
                                if (window.AudioCore) AudioCore.playScare();
                                const branches = Storage.get('branches') || [];
                                const users = Storage.get('users') || [];
                                const updatedBranches = branches.filter(b => b.id !== parseInt(id));
                                const updatedUsers = users.filter(u => u.branch !== parseInt(id));
                                Storage.save('branches', updatedBranches);
                                Storage.save('users', updatedUsers);
                                this.render();
                                Toast.show('تم حذف الفرع وبياناته بالكامل', 'error');
                            }
                        });
                    }
                });
            }
        });
    }

    resetForm() {
        this.form.reset();
        this.form.querySelector('[name="branchId"]').value = '';
        document.getElementById('logo-hidden').value = '';
        this.updateLogoPreview('');
    }
}

// Singleton Instance
if (window.location.pathname.includes('branches.html')) {
    window.BranchesInstance = new BranchesManager();
}

