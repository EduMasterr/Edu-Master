/**
 * Enhanced Students Management Module
 * - Cross-branch search
 * - Immutable 'addedBy' accountability
 * - Permission-aware editing (Branch Lock)
 * - Luxury Profile Modal with Financial & Activity logs
 */
class StudentsManager {
    constructor() {
        this.container = document.getElementById('students-table-body');
        this.editForm = document.getElementById('edit-student-form');
        this.searchInput = document.getElementById('search-students');
        this.branchFilter = document.getElementById('branch-filter');
        this.selectedStudents = new Set();
        this.currentStudent = null;
        this.activeTab = 'personal';

        this.init();
    }

    init() {
        if (!this.container) return;
        this.populateBranchFilter();
        this.render();
        this.attachEvents();

        // 🔄 تحديث ذكي: إعادة تحميل القائمة فوراً عند العودة من صفحة التعديل لضمان المزامنة
        window.addEventListener('focus', () => {
            console.log("[Students] Page Focused - Syncing Data from Storage...");
            this.render();
        });

        window.studentsManager = this; // Expose for HTML onclicks
    }


    playSystemSound(type) {
        if (!window.AudioCore) return;
        switch (type) {
            case 'success': AudioCore.playSuccess(); break;
            case 'error': AudioCore.playWarning(); break;
            case 'open': AudioCore.playNavigate(); break;
        }
    }

    populateBranchFilter() {
        if (!this.branchFilter) return;
        const branches = Storage.get('branches') || [];
        this.branchFilter.innerHTML = `
            <option value="">جميع الفروع</option>
            ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
        `;
    }

    render() {
        const filterText = Formatter.normalizeArabic(this.searchInput?.value || '').trim();
        const filterBranch = this.branchFilter?.value || '';
        const allStudents = Storage.get('students') || [];

        const currentUser = window.Permissions?.getCurrentUser();
        const isAdmin = currentUser?.role_id === 1;
        // Use active branch from switcher (SuperAdmin can switch branches)
        const activeBranchId = Permissions.getActiveBranchId();

        if (!this.container) return;

        const filtered = allStudents.filter(s => {
            // 🛡️ BRANCH ISOLATION & GLOBAL SEARCH
            const studentBranch = s.branch_id || s.branch;

            // If there's a search text, we show results from ALL branches (Global Search)
            // But if there's no search text, we only show current branch unless user is SuperAdmin
            const isSearching = !!filterText;

            if (!isAdmin && activeBranchId && activeBranchId !== 'null' && !isSearching) {
                if (String(studentBranch) !== String(activeBranchId)) return false;
            }

            // Admin manual branch filter dropdown (still applies if set)
            const matchesBranch = !filterBranch || String(studentBranch) === String(filterBranch);

            const nameNorm = Formatter.normalizeArabic(s.name || '');
            const phoneNorm = Formatter.normalizeArabic(s.phone || '');
            const serialNorm = (s.serial_id || '').toString();
            const idNorm = (s.nationalId || '');

            const searchLower = Formatter.normalizeArabic(filterText || '');
            const matchesText = !filterText ||
                nameNorm.includes(searchLower) ||
                phoneNorm.includes(searchLower) ||
                serialNorm.includes(searchLower) ||
                idNorm.includes(searchLower);

            return matchesText && matchesBranch;
        });

        const label = document.getElementById('branch-nav-label');
        if (label) {
            label.innerHTML = `<i class="fa-solid fa-user-graduate" style="color:var(--accent-teal); margin-left:5px;"></i> ${filtered.length}`;
            label.style.color = 'var(--accent-teal)';
            label.style.fontWeight = '900';
            label.style.fontSize = '14px';
            label.title = `إجمالي الطلاب (المختارين حالياً): ${filtered.length}`;
            
            // Fix container width constraint
            const parent = label.closest('#branch-switcher-nav');
            if (parent) {
                parent.style.minWidth = 'auto';
                parent.style.padding = '5px 12px';
            }
        }

        this.container.innerHTML = '';
        if (filtered.length === 0) {
            this.container.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:60px; color: var(--text-muted);">لا يوجد طلاب ينطبق عليهم معايير البحث</td></tr>';
            return;
        }

        filtered.reverse().forEach(student => {
            const tr = document.createElement('tr');
            const isSelected = this.selectedStudents.has(student.id.toString());
            const studentBranch = student.branch_id || student.branch;

            // Allow editing if user is SuperAdmin OR if they are in THEIR active branch
            const user = Permissions.getCurrentUser();
            const userBranch = user?.branch_id || Permissions.getActiveBranchId();
            const canEdit = isAdmin || (userBranch && String(studentBranch) === String(userBranch));

            const studentGroups = (Storage.get('study_groups') || []).filter(g => g.students && g.students.includes(student.id.toString()));
            const groupText = studentGroups.length > 0 ? `${studentGroups.length} مجموعات` : 'جديد';

            tr.innerHTML = `
                <td><input type="checkbox" class="student-checkbox" data-id="${student.id}" ${isSelected ? 'checked' : ''}></td>
                <td style="font-weight: 800; color: var(--accent-teal);">#${student.serial_id || student.id.toString().slice(-5)}</td>
                <td>
                    <div class="student-entry">
                        <div class="student-avatar" style="background: ${student.gender === 'female' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(14, 165, 233, 0.1)'}; overflow: hidden;">
                            ${student.photo ? 
                                `<img src="${student.photo}" style="width:100%; height:100%; object-fit:cover;">` : 
                                `<img src="../education.png" style="width:70%; height:70%; opacity:0.6; object-fit:contain;">`
                            }
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <div style="display:flex; align-items:center; gap:5px;">
                                <span style="font-weight: 800;">${student.name}</span>
                                ${!canEdit ? '<i class="fa-solid fa-lock" title="عرض فقط - فرع آخر" style="font-size:0.7rem; color:#94a3b8;"></i>' : ''}
                            </div>
                            <small style="color: var(--text-muted); font-size: 0.7rem;">${student.phone || 'بدون هاتف'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="branch-badge" style="background: ${String(studentBranch) === String(userBranch) ? 'rgba(43, 90, 158, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${String(studentBranch) === String(userBranch) ? '#2B5A9E' : '#d97706'}; border: 1px solid ${String(studentBranch) === String(userBranch) ? 'rgba(43, 90, 158, 0.2)' : 'rgba(245, 158, 11, 0.2)'};">
                        ${this.getBranchName(studentBranch)}
                    </span>
                </td>
                <td><span style="font-weight: 700;">${groupText}</span></td>
                <td><span class="status-badge ${student.status === 'Active' ? 'status-confirmed' : 'status-cancelled'}">${student.status === 'Active' ? 'نشط' : 'متوقف'}</span></td>
                <td><span style="font-weight: 700; color: var(--text-muted); font-size: 0.85rem;">${student.addedBy || 'غير معروف'}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="action-btn view-student" data-id="${student.id}" title="عرض الملف الكامل" style="background: rgba(26, 158, 156, 0.1); color: var(--accent-teal); border-color: rgba(26, 158, 156, 0.2);"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn whatsapp-student" data-id="${student.id}" title="تواصل واتساب" style="background: rgba(37, 211, 102, 0.1); color: #25D366; border-color: rgba(37, 211, 102, 0.2);"><i class="fa-brands fa-whatsapp"></i></button>
                        ${canEdit ? `
                            <button class="action-btn edit-student" data-id="${student.id}" title="تعديل"><i class="fa-solid fa-edit"></i></button>
                            <button class="action-btn delete-student" data-id="${student.id}" title="حذف" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                        ` : `
                            <button class="action-btn" title="تعديل مغلق (فرع آخر)" style="opacity: 0.3; cursor: not-allowed; background: #f1f5f9;"><i class="fa-solid fa-lock"></i></button>
                        `}
                    </div>
                </td>
            `;
            this.container.appendChild(tr);
        });

        this.updateBulkToolbar();
    }

    getBranchName(id) {
        const branches = Storage.get('branches') || [];
        const b = branches.find(x => x.id == id);
        return b ? b.name : 'غير محدد';
    }

    attachEvents() {
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-student');
            const waBtn = e.target.closest('.whatsapp-student');
            const editBtn = e.target.closest('.edit-student');
            const delBtn = e.target.closest('.delete-student');

            if (viewBtn) {
                this.playSystemSound('open');
                this.openProfile(viewBtn.dataset.id);
            }
            if (waBtn) {
                const s = (Storage.get('students') || []).find(x => x.id == waBtn.dataset.id);
                if (s) {
                    const msg = `مرحباً أ/ ${s.name}، معك إدارة EduMaster Pro. يسعدنا التواصل معك! ✨`;
                    MessagingCore.sendWhatsApp(s.phone || s.parent_phone, msg);
                }
            }
            if (editBtn) {
                this.playSystemSound('open');
                this.openEdit(editBtn.dataset.id);
            }
            if (delBtn) this.handleDelete(delBtn.dataset.id);

            // Restore Profile Tabs and Edit Profile Logic
            const tabBtn = e.target.closest('.profile-tab');
            const editProfileBtn = e.target.closest('#btn-edit-student-profile');

            if (tabBtn) {
                this.playSystemSound('open');
                this.switchTab(tabBtn.dataset.tab);
            }
            if (editProfileBtn && this.currentStudent) {
                this.playSystemSound('open');
                Modal.close('student-profile-modal');
                this.openEdit(this.currentStudent.id);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('student-checkbox')) {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedStudents.add(id);
                else this.selectedStudents.delete(id);
                this.updateBulkToolbar();
            }
            if (e.target.id === 'select-all-students') {
                const checkboxes = document.querySelectorAll('.student-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (cb.checked) this.selectedStudents.add(cb.dataset.id);
                    else this.selectedStudents.delete(cb.dataset.id);
                });
                this.updateBulkToolbar();
            }
        });

        document.getElementById('edit-group-search')?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.searchGroupsForEdit(query);
        });

        // Hide search results on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#edit-group-search') && !e.target.closest('#edit-group-results')) {
                const res = document.getElementById('edit-group-results');
                if (res) res.style.display = 'none';
            }
            if (!e.target.closest('#profile-group-search') && !e.target.closest('#profile-group-results')) {
                const res = document.getElementById('profile-group-results');
                if (res) res.style.display = 'none';
            }
        });

        if (this.searchInput) this.searchInput.addEventListener('input', () => this.render());
        if (this.branchFilter) this.branchFilter.addEventListener('change', () => this.render());
        if (this.editForm) this.editForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveEdit(); });
    }

    searchGroupsForEdit(query) {
        const resultsBox = document.getElementById('edit-group-results');
        if (!query || query.length < 1) {
            resultsBox.style.display = 'none';
            return;
        }

        const groups = Storage.get('study_groups') || [];
        const trainers = Storage.get('trainers') || [];
        const student = this.currentStudent;

        // Filter groups by name and branch (if student has one)
        const filtered = groups.filter(g => {
            const trainer = trainers.find(t => t.id == g.trainerId);
            const matches = g.name.toLowerCase().includes(query.toLowerCase()) ||
                (trainer && trainer.name.toLowerCase().includes(query.toLowerCase()));
            const isSameBranch = !student || !student.branch || g.branch_id == student.branch;
            return matches && isSameBranch;
        });

        if (filtered.length === 0) {
            resultsBox.innerHTML = '<div style="padding: 15px; color: var(--text-muted); text-align: center;">لا توجد مجموعات مطابقة</div>';
        } else {
            resultsBox.innerHTML = filtered.map(g => `
                <div class="search-result-item" onclick="studentsManager.enrollFromEdit('${g.id}')" style="
                    padding: 12px 15px; 
                    cursor: pointer; 
                    border-bottom: 1px solid var(--border-soft);
                    transition: 0.2s;
                ">
                    <div style="font-weight: 800; color: var(--sidebar-bg);">${g.name}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-teal); font-weight: 700;">
                        <i class="fa-solid fa-user-tie"></i> ${trainers.find(t => t.id == g.trainerId)?.name || 'بدون مدرس'}
                    </div>
                </div>
            `).join('');
        }
        resultsBox.style.display = 'block';
    }

    enrollFromEdit(groupId) {
        if (!this.currentStudent) return;
        const studentId = this.currentStudent.id.toString();

        if (window.EnrollmentLogic.enrollInGroup([studentId], groupId)) {
            Toast.show('تمت الإضافة للمجموعة بنجاح', 'success');
            document.getElementById('edit-group-search').value = '';
            document.getElementById('edit-group-results').style.display = 'none';
            this.renderCurrentGroupsInEdit();
            this.render(); // Update main table
        }
    }

    unenrollFromEdit(groupId) {
        if (!this.currentStudent) return;
        const studentId = this.currentStudent.id.toString();

        const groups = Storage.get('study_groups') || [];
        const gIdx = groups.findIndex(g => g.id == groupId);
        if (gIdx !== -1) {
            groups[gIdx].students = (groups[gIdx].students || []).filter(sid => sid !== studentId);
            Storage.save('study_groups', groups);
            Toast.show('تم الحذف من المجموعة', 'info');
            this.renderCurrentGroupsInEdit();
            this.render(); // Update main table
        }
    }

    renderCurrentGroupsInEdit() {
        const studentId = this.currentStudent?.id.toString();
        const groups = Storage.get('study_groups') || [];
        const studentGroups = groups.filter(g => g.students && g.students.includes(studentId));
        const container = document.getElementById('current-groups-list');

        if (studentGroups.length === 0) {
            container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted); padding: 5px;">لم يتم التسجيل في مجموعات بعد بمجموعة</span>';
            return;
        }

        container.innerHTML = studentGroups.map(g => `
            <div style="background: var(--accent-teal-soft); color: var(--accent-teal); padding: 8px 12px; border-radius: 50px; display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.85rem;">
                <span>${g.name}</span>
                <i class="fa-solid fa-times-circle" onclick="studentsManager.unenrollFromEdit('${g.id}')" style="cursor: pointer; opacity: 0.7;"></i>
            </div>
        `).join('');
    }

    updateBulkToolbar() {
        const toolbar = document.getElementById('bulk-toolbar');
        const countSpan = document.getElementById('selected-count');
        if (!toolbar) return;

        if (this.selectedStudents.size > 0) {
            toolbar.style.display = 'flex';
            countSpan.textContent = this.selectedStudents.size;
        } else {
            toolbar.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedStudents.clear();
        const selectAll = document.getElementById('select-all-students');
        if (selectAll) selectAll.checked = false;
        this.render();
    }

    openBulkEnroll() {
        document.getElementById('enroll-count-text').textContent = this.selectedStudents.size;
        this.populateEnrollGroups();
        Modal.open('enroll-group-modal');
    }

    populateEnrollGroups(query = '') {
        const select = document.getElementById('enroll-group-select');
        const groups = Storage.get('study_groups') || [];
        const trainers = Storage.get('trainers') || [];

        const filtered = groups.filter(g => {
            const trainer = trainers.find(t => t.id == g.trainerId);
            return !query ||
                g.name.toLowerCase().includes(query.toLowerCase()) ||
                (trainer && trainer.name.toLowerCase().includes(query.toLowerCase()));
        });

        select.innerHTML = filtered.map(g => {
            const trainer = trainers.find(t => t.id == g.trainerId);
            return `<option value="${g.id}">${g.name} (${trainer?.name || 'بدون مدرس'})</option>`;
        }).join('');
    }

    confirmBulkEnroll() {
        const groupId = document.getElementById('enroll-group-select').value;
        if (!groupId) {
            Toast.show('الرجاء اختيار مجموعة أولاً', 'error');
            return;
        }

        const studentIds = Array.from(this.selectedStudents);
        if (window.EnrollmentLogic.enrollInGroup(studentIds, groupId)) {
            Toast.show(`تم تسكين ${studentIds.length} طلاب في المجموعة بنجاح`, 'success');
            this.clearSelection();
            Modal.close('enroll-group-modal');
        }
    }

    // --- Profile Modal Logic ---
    openProfile(id) {
        const students = Storage.get('students') || [];
        const student = students.find(s => s.id == id);
        if (!student) return;

        this.currentStudent = student;
        document.getElementById('modal-profile-name').textContent = student.name;
        document.getElementById('modal-profile-id').textContent = student.serial_id || student.id.toString().slice(-5);
        document.getElementById('modal-profile-branch').textContent = this.getBranchName(student.branch);
        document.getElementById('modal-added-by').textContent = student.addedBy || 'غير محدد';

        const avatarBox = document.getElementById('modal-profile-img');
        avatarBox.textContent = (student.name || '').substring(0, 1);
        avatarBox.style.background = student.gender === 'female' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(14, 165, 233, 0.2)';
        avatarBox.style.color = student.gender === 'female' ? '#ec4899' : '#0ea5e9';

        const currentUser = window.Permissions?.getCurrentUser();
        const canEdit = currentUser?.role_id === 1 || (currentUser?.branch && student.branch == currentUser.branch);
        document.getElementById('btn-edit-student-profile').style.display = canEdit ? 'flex' : 'none';

        this.switchTab('personal');
        Modal.open('student-profile-modal');
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        const content = document.getElementById('modal-tab-content');
        content.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</div>';
        setTimeout(() => {
            switch (tabName) {
                case 'personal': this.renderPersonalTab(content); break;
                case 'financial': this.renderFinancialTab(content); break;
                case 'activity': this.renderActivityTab(content); break;
            }
        }, 150);
    }

    renderPersonalTab(container) {
        const s = this.currentStudent;
        const groups = (Storage.get('study_groups') || []);
        const studentGroups = groups.filter(g => g.students && g.students.includes(s.id.toString()));
        const allStudents = Storage.get('students') || [];

        // --- 📊 CALCULATE RETENTION (Simplified for now) ---
        const attendance = Storage.get('attendance') || [];
        const studentHistory = attendance.filter(a => a.studentId == s.id);
        const consecutiveAbsences = 0; // Logic for real counting would go here

        // Status determination
        let statusColor = '#10b981'; // Safe
        let statusText = 'ملتزم';
        if (consecutiveAbsences >= 4) {
            statusColor = '#ef4444'; statusText = 'منقطع - خطر';
        } else if (consecutiveAbsences >= 2) {
            statusColor = '#f59e0b'; statusText = 'متغيب - تنبيه';
        }

        // --- 👨‍👩‍👧‍👦 FIND SIBLINGS ---
        const siblings = allStudents.filter(x => (x.siblingId == s.id || (s.siblingId && x.id == s.siblingId) || (s.siblingId && x.siblingId == s.siblingId)) && x.id != s.id);

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 280px; gap: 30px;">
                <!-- Main Data -->
                <div>
                    <div class="info-grid">
                        <style>
                            .info-grid .info-value { font-size: 1.15rem !important; font-weight: 800 !important; }
                            .premium-section-box {
                                margin-top: 25px; 
                                padding: 25px; 
                                background: #ffffff; 
                                border-radius: 20px; 
                                border: 1px solid var(--border-soft);
                                box-shadow: 0 10px 40px rgba(0,0,0,0.04);
                                position: relative;
                            }
                            .retention-indicator {
                                display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 50px; 
                                background: ${statusColor}15; color: ${statusColor}; font-weight: 900; font-size: 0.85rem; width: fit-content;
                            }
                        </style>
                        <div class="info-item"><span class="info-label">رقم الهاتف</span><span class="info-value">${s.phone || '-'}</span></div>
                        <div class="info-item"><span class="info-label">الرقم القومي</span><span class="info-value">${s.nationalId || '-'}</span></div>
                        <div class="info-item"><span class="info-label">تاريخ الميلاد</span><span class="info-value">${s.birthDate || '-'}</span></div>
                        <div class="info-item"><span class="info-label">المجموعة الحالية</span><span class="info-value" style="color:var(--accent-teal);">${studentGroups.map(g => g.name).join(', ') || 'غير مسجل'}</span></div>
                        <div class="info-item"><span class="info-label">الحالة الدراسية</span>
                            <div class="retention-indicator"><i class="fa-solid fa-signal"></i> ${statusText}</div>
                        </div>
                        <div class="info-item"><span class="info-label">النوع</span><span class="info-value">${s.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>
                        <div class="info-item"><span class="info-label">الوظيفة</span><span class="info-value">${s.job || '-'}</span></div>
                        <div class="info-item"><span class="info-label">رقم الإيصال</span><span class="info-value" style="color: var(--accent-teal);">#${s.receipt_no || '-'}</span></div>
                        <div class="info-item" style="grid-column: span 2;"><span class="info-label">العنوان بالتفصيل</span><span class="info-value">${s.addressPersonal || s.addressExtra || '-'}</span></div>
                    </div>

                    <!-- 👨‍👩‍👧‍👦 SIBLING MANAGEMENT -->
                    <div class="premium-section-box">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 style="margin:0; font-weight:900; font-size:1rem; color:var(--sidebar-bg);"><i class="fa-solid fa-people-group" style="color:var(--accent-teal);"></i> الأشقاء والعائلة</h3>
                            <button onclick="window.location.href='add-student.html?siblingId=${s.id}'" class="app-btn-primary" style="padding: 10px 18px; font-size: 0.8rem; border-radius:12px; height:auto;">
                                <i class="fa-solid fa-plus-circle"></i> إضافة شقيق جديد
                            </button>
                        </div>

                        ${siblings.length > 0 ? `
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                                ${siblings.map(sib => `
                                    <div style="padding:15px; background:var(--bg-main); border-radius:15px; border:1.5px solid var(--border-soft); display:flex; align-items:center; gap:12px;">
                                        <div style="width:35px; height:35px; border-radius:10px; background:var(--accent-teal); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900;">${sib.name.substring(0, 1)}</div>
                                        <div style="flex:1; overflow:hidden;">
                                            <div style="font-weight:900; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sib.name}</div>
                                            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">${this.getBranchName(sib.branch_id || sib.branch)}</div>
                                        </div>
                                        <button onclick="studentsManager.openProfile(${sib.id})" style="border:none; background:transparent; color:var(--accent-teal); cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="text-align:center; padding:20px; color:var(--text-muted); font-weight:700; font-size:0.85rem; background:var(--bg-main); border-radius:15px; margin-bottom:20px;">لا يوجد أشقاء مرنبطين حالياً</div>
                        `}

                        <div style="padding-top:15px; border-top:1px dashed var(--border-soft);">
                            <label style="display:block; margin-bottom:12px; font-weight:900; font-size:0.85rem; color:var(--text-muted);">ربط شقيق موجود مسبقاً:</label>
                            <div class="enroll-search-wrapper">
                                <i class="fa-solid fa-link" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                                <input type="text" id="profile-sibling-search" placeholder="ابحث عن اسم الشقيق لربطه..." 
                                    style="width:100%; border:none; background:transparent; padding:12px 45px 12px 20px; font-weight:700; outline:none; font-family:inherit; font-size:0.85rem;">
                                <div id="profile-sibling-results" style="position:absolute; top:calc(100% + 8px); left:0; right:0; background:#fff; z-index:110; box-shadow:0 15px 35px rgba(0,0,0,0.15); border-radius:15px; display:none; max-height:180px; overflow-y:auto; border:1px solid var(--border-soft);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 🏫 ENROLLMENT BOX -->
                    <div class="premium-enroll-box">
                        <label style="display:block; margin-bottom:15px; font-weight:900; color:var(--sidebar-bg); font-size: 1rem;">
                            <i class="fa-solid fa-plus-circle" style="color:var(--accent-teal);"></i> تنسيب سريع لمجموعة
                        </label>
                        <div class="enroll-search-wrapper">
                            <i class="fa-solid fa-search" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                            <input type="text" id="profile-group-search" placeholder="ابحث عن اسم المجموعة هنا..." 
                                style="width:100%; border:none; background:transparent; padding:12px 45px 12px 20px; font-weight:700; outline:none; font-family:inherit;">
                        </div>
                        <div id="profile-group-results" style="position:absolute; top:calc(100% + 10px); left:0; right:0; background:#fff; z-index:100; box-shadow:0 15px 35px rgba(0,0,0,0.15); border-radius:15px; display:none; max-height:200px; overflow-y:auto; border:1px solid var(--border-soft);"></div>
                    </div>
                </div>

                <!-- RHS: QR & Badge -->
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div id="student-qr-card" style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:25px; border-radius:24px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.2); transition: 0.3s; cursor: pointer;">
                        <div style="background:#fff; padding:15px; border-radius:16px; margin-bottom:15px; display:inline-block;">
                            <img src="${window.QRAttendanceSystem ? window.QRAttendanceSystem.generateQRCodeURL(s.serial_id || s.id) : ''}" style="width: 140px; height: 140px; display: block;" alt="Student QR">
                        </div>
                        <h4 style="color:#fff; margin:0 0 5px; font-weight:900; font-size:1.1rem; letter-spacing: 1px;">ID SMART CARD</h4>
                        <p style="color:var(--accent-teal); margin:0; font-size:0.85rem; font-weight:900; background: rgba(26, 158, 156, 0.1); padding: 5px; border-radius: 8px;">
                            ${(s.serial_id || s.id).toString().toUpperCase()}
                        </p>
                        ${(window.Permissions?.getCurrentUser()?.role_id === 1) ? `
                        <button onclick="studentsManager.printIDCard()" style="margin-top:20px; width:100%; height: 50px; background:var(--accent-teal); color:#fff; border:none; padding:10px; border-radius:12px; font-weight:900; cursor:pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 15px rgba(26, 158, 156, 0.3);">
                            <i class="fa-solid fa-print"></i> طباعة الكارنيه الذكي
                        </button>
                        ` : ''}
                    </div>

                    <div style="background:var(--card); padding:20px; border-radius:24px; border:1px solid var(--border-soft); box-shadow: 0 10px 25px rgba(0,0,0,0.03); text-align:center;">
                        <i class="fa-solid fa-mobile-screen-button" style="font-size: 2rem; color: #8b5cf6; margin-bottom: 10px; display: block;"></i>
                        <h4 style="margin-bottom: 5px; font-weight: 900;">بوابة المتابعة الذكية</h4>
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 15px; font-weight: 700;">ارسال كود الدخول ورابط المتابعة لولي الأمر</p>
                        <button onclick="MessagingCore.notifyPortalLink(studentsManager.currentStudent)" style="width:100%; height: 45px; background:#8b5cf6; color:#fff; border:none; border-radius:12px; font-weight:900; cursor:pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة الرابط الآن
                        </button>
                    </div>

                    <div style="background:var(--bg-main); padding:20px; border-radius:20px; border:1.5px solid var(--border-soft); display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight:900; font-size:0.8rem; color:var(--text-muted);">انضم في</span>
                            <span style="font-weight:900; color:var(--sidebar-bg); background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 8px;">${s.enrollmentDate || (s.createdAt ? s.createdAt.split('T')[0] : '-') || '-'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight:900; font-size:0.8rem; color:var(--text-muted);">حالة التوفر</span>
                            <span style="font-weight:900; color: ${s.status === 'Active' ? '#10b981' : '#ef4444'};">${s.status === 'Active' ? 'نشط حالياً' : 'غير نشط'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update the header QR as well
        document.getElementById('modal-profile-qr').innerHTML = `
            <img src="${window.QRAttendanceSystem ? window.QRAttendanceSystem.generateQRCodeURL(s.serial_id || s.id) : ''}" style="width: 100%; height: 100%;" alt="ID QR">
        `;

        // --- Attach Events ---
        const groupSearch = document.getElementById('profile-group-search');
        groupSearch?.addEventListener('input', (e) => this.handleProfileGroupSearch(e.target.value));

        const sibSearch = document.getElementById('profile-sibling-search');
        sibSearch?.addEventListener('input', (e) => this.handleProfileSiblingSearch(e.target.value));
    }

    printIDCard() {
        const s = this.currentStudent;
        if (!s) return;

        const qrUrl = window.QRAttendanceSystem.generateQRCodeURL(s.serial_id || s.id);
        const branchName = this.getBranchName(s.branch_id || s.branch);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>ID CARD - ${s.name}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Tajawal', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f1f5f9; }
                        .card { 
                            width: 350px; height: 500px; background: #fff; border-radius: 25px; overflow: hidden; 
                            box-shadow: 0 20px 50px rgba(0,0,0,0.1); position: relative; border: 1px solid #e2e8f0;
                        }
                        .header { background: #1e293b; height: 150px; padding: 20px; text-align: center; color: #fff; }
                        .content { padding: 30px; text-align: center; }
                        .qr-box { background: #fff; width: 150px; height: 150px; margin: -75px auto 20px; padding: 15px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                        .name { font-size: 1.4rem; font-weight: 900; color: #1e293b; margin-bottom: 5px; }
                        .branch { font-weight: 700; color: #14b8a6; margin-bottom: 20px; }
                        .code { background: #f8fafc; padding: 10px 20px; border-radius: 12px; font-weight: 900; color: #64748b; display: inline-block; border: 1.5px solid #e2e8f0; }
                        .footer { position: absolute; bottom: 0; left: 0; right: 0; height: 10px; background: #14b8a6; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h2 style="margin: 0; font-weight: 900;">EDU MASTER</h2>
                            <p style="margin: 5px 0 0; opacity: 0.7; font-size: 0.8rem;">Learning Management System</p>
                        </div>
                        <div class="content">
                            <div class="qr-box">
                                <img src="${qrUrl}" style="width: 100%; height: 100%;">
                            </div>
                            <div class="name">${s.name}</div>
                            <div class="branch">${branchName}</div>
                            <div class="code">ID: ${(s.serial_id || s.id).toString().toUpperCase()}</div>
                        </div>
                        <div class="footer"></div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    handleProfileGroupSearch(query) {
        const resultsBox = document.getElementById('profile-group-results');
        if (!query) { resultsBox.style.display = 'none'; return; }

        const groups = Storage.get('study_groups') || [];
        const term = query.toLowerCase();
        const filtered = groups.filter(g => g.name.toLowerCase().includes(term) && (!this.currentStudent.branch || g.branch_id == this.currentStudent.branch));

        resultsBox.innerHTML = filtered.map(g => `
            <div onclick="window.studentsManager.quickEnroll('${g.id}')" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #eee; font-weight:700; transition:0.2s; hover:background:#f8fafc;">${g.name}</div>
        `).join('') || '<div style="padding:10px; color:#999;">لا توجد نتائج</div>';
        resultsBox.style.display = 'block';
    }

    handleProfileSiblingSearch(query) {
        const resultsBox = document.getElementById('profile-sibling-results');
        if (!query) { resultsBox.style.display = 'none'; return; }

        const term = Formatter.normalizeArabic(query);
        const students = Storage.get('students') || [];
        const filtered = students.filter(s =>
            s.id != this.currentStudent.id &&
            Formatter.normalizeArabic(s.name || '').includes(term)
        ).slice(0, 5);

        resultsBox.innerHTML = filtered.map(s => `
            <div onclick="studentsManager.linkSibling(${s.id})" style="padding:12px 15px; cursor:pointer; border-bottom:1px solid #eee; transition:0.2s;">
                <div style="font-weight:800; font-size:0.85rem;">${s.name}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">${this.getBranchName(s.branch_id || s.branch)} | ${s.phone || '-'}</div>
            </div>
        `).join('') || '<div style="padding:10px; color:#999; font-size:0.8rem;">لا توجد نتائج</div>';
        resultsBox.style.display = 'block';
    }

    linkSibling(sisterId) {
        if (!this.currentStudent) return;

        const students = Storage.get('students') || [];
        const brotherIndex = students.findIndex(x => x.id == this.currentStudent.id);
        const sisterIndex = students.findIndex(x => x.id == sisterId);

        if (brotherIndex !== -1 && sisterIndex !== -1) {
            // Establish bidirectional link
            students[brotherIndex].siblingId = sisterId;
            // Optionally link sister back if she doesn't have one, or use a shared family ID
            // For now, simple pair is enough
            Storage.save('students', students);
            this.currentStudent = students[brotherIndex];

            Toast.show('✅ تم ربط الأشقاء بنجاح', 'success');
            const content = document.getElementById('modal-tab-content');
            this.renderPersonalTab(content);
        }
    }

    quickEnroll(groupId) {
        if (!this.currentStudent) return;
        if (window.EnrollmentLogic && EnrollmentLogic.enrollInGroup([this.currentStudent.id.toString()], groupId)) {
            Toast.show('تم التنسيب بنجاح', 'success');
            const content = document.getElementById('modal-tab-content');
            this.renderPersonalTab(content);
            this.render();
        }
    }

    renderFinancialTab(container) {
        const s = this.currentStudent;
        const transactions = window.AccountingCore ? AccountingCore.getTransactions({ studentId: s.id }) : [];
        if (transactions.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.6;"><i class="fa-solid fa-receipt" style="font-size:3rem; margin-bottom:15px;"></i><br>لا يوجد سجلات مالية مسجلة لهذا الطالب بعد</div>`;
            return;
        }
        let totalPaid = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : 0), 0);
        container.innerHTML = `
            <div style="background: var(--accent-teal-soft); padding: 15px; border-radius:12px; margin-bottom: 25px; display:flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: var(--accent-teal);">إجمالي المدفوعات من الطالب:</span>
                <span style="font-size: 1.4rem; font-weight: 900; color: var(--accent-teal);">${totalPaid} ج.م</span>
            </div>
            <table class="app-table" style="font-size: 0.9rem;">
                <thead><tr><th>التاريخ</th><th>البند</th><th>رقم الإيصال</th><th>المبلغ</th><th>إجراء</th></tr></thead>
                <tbody>${[...transactions].reverse().map(t => `
                    <tr>
                        <td>${t.date}</td>
                        <td>${t.description}</td>
                        <td><span style="font-family: monospace; font-weight:700;">#${t.receipt_no || '-'}</span></td>
                        <td style="font-weight: 900; color: #10b981;">${t.amount}</td>
                        <td>
                            <button onclick="studentsManager.whatsappReceipt('${t.id}')" style="background:#25d366; color:#fff; border:none; border-radius:6px; padding:4px 8px; cursor:pointer;" title="إرسال عبر واتساب">
                                <i class="fa-brands fa-whatsapp"></i>
                            </button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        `;
    }

    whatsappReceipt(transactionId) {
        if (!this.currentStudent) return;
        const s = this.currentStudent;
        const transactions = window.AccountingCore ? AccountingCore.getTransactions({ studentId: s.id }) : [];
        const t = transactions.find(x => x.id == transactionId);
        if (!t) return;

        const msg = `🧾 *إيصال دفع رقمي - EduMaster*\n\nوصلنا من: ${s.name}\nمبلغ وقدره: *${t.amount} ج.م*\nوذلك مقابل: ${t.description}\nرقم الإيصال: #${t.receipt_no || t.id}\nالتاريخ: ${t.date}\n\n*شكراً لثقتكم بنا.*`;
        WhatsApp.send(s.phone, msg);
    }

    renderActivityTab(container) {
        const s = this.currentStudent;
        const deliveries = Storage.get('book_deliveries') || [];
        const studentBooks = deliveries.filter(d => d.student_id == s.id);
        const groups = Storage.get('study_groups') || [];
        const studentGroups = groups.filter(g => g.students && g.students.includes(s.id.toString()));

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h4 style="font-weight: 900;"><i class="fa-solid fa-layer-group"></i> المجموعات المسجل بها</h4>
                ${studentGroups.length > 0 ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${studentGroups.map(g => `<span class="badge-premium" style="background: var(--accent-teal-soft); border-color: var(--accent-teal); color: var(--accent-teal);">${g.name}</span>`).join('')}
                    </div>
                ` : '<div style="padding:15px; background: rgba(0,0,0,0.02); border-radius: 10px; opacity:0.6;">غير ملتحق بمجموعات حالياً</div>'}
                
                <h4 style="margin-top: 10px; font-weight: 900;"><i class="fa-solid fa-book"></i> الكتب المستلمة</h4>
                ${studentBooks.length > 0 ? `
                    <table class="app-table">
                        <thead><tr><th>اسم الكتاب</th><th>التاريخ</th></tr></thead>
                        <tbody>${studentBooks.map(b => `<tr><td>${b.book_name}</td><td>${b.date}</td></tr>`).join('')}</tbody>
                    </table>
                ` : '<div style="padding:15px; background: rgba(0,0,0,0.02); border-radius: 10px; opacity:0.6;">لم يتم تسجيل استلام كتب بعد</div>'}
            </div>
        `;
    }

    openEdit(id) {
        if (!id) {
            console.error("[Students] Attempted to edit without a valid ID");
            return;
        }
        console.log(`[Students] Redirecting to edit page for student ID: ${id}`);
        window.location.href = `add-student.html?editId=${id}`;
    }

    saveEdit() {
        // Deprecated: Editing is now handled via add-student.html (Single Source of Truth)
        console.log("Editing is now handled by the unified registration page.");
    }

    handleDelete(id) {
        const students = Storage.get('students') || [];
        const student = students.find(s => s.id == id);
        if (!student) return;
        Modal.secureDelete(student.name, () => {
            const newStudents = students.filter(s => s.id != id);
            Storage.save('students', newStudents);
            this.render();
            Toast.show(`تم حذف الطالب (${student.name}) نهائياً من النظام`, 'success');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.studentsManager = new StudentsManager();

    // Re-render when SuperAdmin switches branches
    window.addEventListener('branchChanged', () => {
        window.studentsManager?.render();
        window.studentsManager?.populateBranchFilter();
    });
});
