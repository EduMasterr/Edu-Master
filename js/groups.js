/**
 * Groups Management Module
 * - Handles study group/class creation
 * - Ties trainers to groups
 * - Enroll students via bulk actions (external)
 */
class GroupsManager {
    constructor() {
        this.container = document.getElementById('groups-container');
        this.form = document.getElementById('group-form');
        this.searchInput = document.getElementById('search-groups');
        this.trainerSelect = document.getElementById('trainer-select');
        this.statusFilter = 'Active'; // Toggle between Active and Inactive
        this.init();
    }

    init() {
        if (!this.container) return;
        this.populateTrainers();
        this.seed(); // Seed demo groups if empty
        this.render();
        this.attachEvents();

        // ── Deep Linking for Edit ──
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('editId') || params.get('edit');
        if (editId) {
            setTimeout(() => this.openEdit(editId), 500); // Small delay to ensure render is done
        }
    }

    seed() {
        // No hardcoded seeding to ensure a clean system for the user.
    }

    populateTrainers() {
        if (!this.trainerSelect) return;
        const allTrainers = Storage.get('trainers') || [];
        const activeBranchId = Permissions.getActiveBranchId();

        // Show all trainers regardless of branch
        const trainers = allTrainers;

        this.trainerSelect.innerHTML = `
            <option value="">اختر المحاضر المسؤول...</option>
            ${trainers.map(t => `<option value="${t.id}">${t.name} (${t.specialty})</option>`).join('')}
        `;
    }

    render() {
        const allGroups = Storage.get('study_groups') || [];
        const trainers = Storage.get('trainers') || [];
        const activeBranchId = Permissions.getActiveBranchId();
        const query = Formatter.normalizeArabic(this.searchInput?.value || '').trim();

        this.container.innerHTML = '';

        // ── Branch Isolation: only show groups of the active branch ──
        const groups = allGroups.filter(g => {
            const b = String(g.branch_id || '');
            const activeB = String(activeBranchId || '');
            const match = (!activeBranchId || activeBranchId === 'null') || (b === activeB);
            if(!match) console.log(`Group ${g.name} hidden. Branch: ${b} vs Active: ${activeB}`);
            return match;
        });

        const filtered = groups.filter(g => {
            const trainer = trainers.find(t => Number(t.id) === Number(g.trainerId));
            const groupNameNormalized = Formatter.normalizeArabic(g.name || '');
            const trainerNameNormalized = Formatter.normalizeArabic(trainer?.name || '');
            const specialtyNormalized = Formatter.normalizeArabic(trainer?.specialty || '');

            // 🛡️ Status Filter: Only show groups matching the current tab
            const groupStatus = g.status || 'Active'; // Default to active for old records
            if (this.statusFilter !== 'All' && groupStatus !== this.statusFilter) return false;

            return !query ||
                groupNameNormalized.includes(query) ||
                trainerNameNormalized.includes(query) ||
                specialtyNormalized.includes(query);
        });

        const label = document.getElementById('branch-nav-label');
        if (label) {
            label.innerHTML = `<i class="fa-solid fa-layer-group" style="color:var(--accent-teal); margin-left:5px;"></i> ${filtered.length}`;
            label.style.color = 'var(--accent-teal)';
            label.style.fontWeight = '900';
            label.style.fontSize = '14px';
            label.title = `إجمالي المجموعات (المختارة حالياً): ${filtered.length}`;
            
            // Fix container width constraint
            const parent = label.closest('#branch-switcher-nav');
            if (parent) {
                parent.style.minWidth = 'auto';
                parent.style.padding = '5px 12px';
            }
        }

        if (filtered.length === 0) {
            this.container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:100px; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size:4rem; margin-bottom:20px; opacity:0.3;"></i>
                    <br>
                    <span style="font-weight: 800; font-size: 1.2rem;">لا توجد مجموعات ينطبق عليها البحث</span>
                </div>`;
            return;
        }

        // Show newest groups at top
        const sorted = [...filtered].sort((a, b) => b.id - a.id);

        sorted.forEach(group => {
            const trainer = trainers.find(t => Number(t.id) === Number(group.trainerId));
            const studentCount = (group.students || []).length;

            const card = document.createElement('div');
            card.className = 'group-item';
            card.innerHTML = `
                <div class="student-count-chip">
                    <i class="fa-solid fa-user-graduate"></i> ${studentCount} طالب
                </div>
                <h3 class="group-name">
                    <i class="fa-solid fa-layer-group" style="color: var(--accent-teal);"></i>
                    ${group.name}
                </h3>
                
                <div class="group-meta">
                    <div class="meta-tag">
                        <i class="fa-solid fa-calendar-day"></i> ${this.translateDay(group.day)}
                    </div>
                    <div class="meta-tag">
                        <i class="fa-solid fa-clock"></i> ${group.time || '--:--'}
                    </div>
                    <div class="meta-tag">
                        <i class="fa-solid fa-calendar-check"></i> ${group.startDate || 'قريباً'}
                    </div>
                    <div class="meta-tag" style="background: var(--accent-teal-soft); color: var(--accent-teal);">
                        <i class="fa-solid fa-fingerprint"></i> ID: ${group.id.toString().slice(-5)}
                    </div>
                </div>

                <div class="trainer-bar" style="margin-top: 20px;">
                    <div class="user-avatar" style="width: 44px; height: 44px; font-size: 1.1rem; background: var(--sidebar-bg) !important; color:#fff !important;">
                        ${(trainer?.name || '??').substring(0, 1).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 900; font-size: 1.1rem;">${trainer?.name || 'محاضر غير محدد'}</span>
                        <small style="color: var(--text-muted); font-size: 0.9rem; font-weight: 700;">${trainer?.specialty || 'تخصص غير محدد'}</small>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 25px; border-top: 1px solid var(--border-soft); padding-top: 15px;">
                    <button class="action-btn view-group-students" data-id="${group.id}" title="عرض الطلاب" style="color: var(--accent-teal); background: var(--accent-teal-soft);"><i class="fa-solid fa-users"></i></button>
                    <button class="action-btn edit-group" data-id="${group.id}" title="تعديل"><i class="fa-solid fa-edit"></i></button>
                    <button class="action-btn delete-group" data-id="${group.id}" style="color: #ef4444;" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Allow clicking the card itself to view students (but not on buttons)
            card.onclick = (e) => {
                if (!e.target.closest('.action-btn')) {
                    this.showGroupStudents(group.id);
                }
            };

            this.container.appendChild(card);
        });
    }

    showGroupStudents(groupId) {
        const groups = Storage.get('study_groups') || [];
        const group = groups.find(g => Number(g.id) === Number(groupId));
        if (!group) return;

        const allStudents = Storage.get('students') || [];
        const trainers = Storage.get('trainers') || [];
        const trainer = trainers.find(t => Number(t.id) === Number(group.trainerId));

        // UI Prep
        document.getElementById('modal-group-name-title').innerText = `طلاب مجموعة: ${group.name}`;
        document.getElementById('modal-group-subtitle').innerHTML = `
            <i class="fa-solid fa-chalkboard-user"></i> المحاضر: ${trainer?.name || 'غير محدد'} | 
            <i class="fa-solid fa-calendar-day"></i> اليوم: ${this.translateDay(group.day)} | 
            <i class="fa-solid fa-clock"></i> الساعة: ${group.time || '--:--'}
        `;

        const tbody = document.getElementById('group-students-tbody');
        tbody.innerHTML = '';

        const studentsInGroup = allStudents.filter(s => (group.students || []).includes(s.id.toString()));

        if (studentsInGroup.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-muted);">لا يوجد طلاب مسجلين في هذه المجموعة حالياً</td></tr>`;
        } else {
            studentsInGroup.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="user-avatar" style="width:30px; height:30px; font-size: 0.8rem;">${s.name.charAt(0)}</div>
                            <span style="font-weight:700;">${s.name}</span>
                        </div>
                    </td>
                    <td style="font-family: monospace; font-weight: 700;">${s.phone}</td>
                    <td><span class="badge-status" style="background: var(--accent-teal-soft); color: var(--accent-teal);">${s.serial_id || s.id}</span></td>
                    <td style="font-weight: 600; color: var(--text-muted);">${s.enrollmentDate || '---'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('modal-student-count-summary').innerText = `إجمالي: ${studentsInGroup.length} طلاب`;
        Modal.open('view-students-modal');
        if (window.AudioCore) AudioCore.play('click');
    }

    translateDay(day) {
        const days = {
            'Saturday': 'السبت', 'Sunday': 'الأحد', 'Monday': 'الاثنين',
            'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس',
            'Friday': 'الجمعة'
        };
        return days[day] || day;
    }

    setStatusFilter(status) {
        this.statusFilter = status;

        // Update UI Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        this.render();
        if (window.AudioCore) AudioCore.play('click');
    }

    attachEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.render());
        }

        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-group-students');
            const editBtn = e.target.closest('.edit-group');
            const delBtn = e.target.closest('.delete-group');

            if (viewBtn) this.showGroupStudents(viewBtn.dataset.id);
            if (editBtn) this.openEdit(editBtn.dataset.id);
            if (delBtn) this.delete(delBtn.dataset.id);
        });

        // 📅 Auto-sync day select with start date
        const dateInput = this.form.querySelector('[name="startDate"]');
        const daySelect = this.form.querySelector('[name="day"]');
        if (dateInput && daySelect) {
            dateInput.addEventListener('change', (e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) {
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    daySelect.value = days[date.getDay()];
                }
            });
        }
    }

    save() {
        const formData = new FormData(this.form);
        const groups = Storage.get('study_groups') || [];
        const id = formData.get('groupId');
        const activeBranchId = Permissions.getActiveBranchId() || 'miami';

        const groupData = {
            id: id || Date.now(),
            name: formData.get('name'),
            trainerId: formData.get('trainerId'),
            day: formData.get('day'),
            time: `${document.getElementById('group-hour').value}:${document.getElementById('group-minute').value} ${document.getElementById('group-ampm').value}`,
            startDate: formData.get('startDate'),
            status: formData.get('status'), // ← Capture Status
            students: id ? (groups.find(g => g.id == id)?.students || []) : [],
            branch_id: activeBranchId  // ← Branch Isolation
        };

        if (id) {
            const idx = groups.findIndex(g => g.id == id);
            groups[idx] = groupData;
        } else {
            // 📅 SMART SCHEDULER CHECK (NEW)
            if (window.SchedulerEngine) {
                const conflict = window.SchedulerEngine.checkConflict(groupData.trainerId, groupData.day, groupData.time);
                if (conflict.hasConflict) {
                    if (!confirm(conflict.msg + '\n\nهل تريد المتابعة على أي حال؟')) return;
                }
            }
            groups.push(groupData);
        }

        Storage.save('study_groups', groups);
        this.render();
        Modal.close('group-modal');
        this.form.reset();
        Toast.show('تم حفظ المجموعة بنجاح', 'success');
        if (window.AudioCore) AudioCore.play('success');
    }

    openEdit(id) {
        const groups = Storage.get('study_groups') || [];
        const group = groups.find(g => g.id == id);
        if (!group) return;

        this.form.querySelector('[name="groupId"]').value = group.id;
        this.form.querySelector('[name="name"]').value = group.name;
        this.form.querySelector('[name="trainerId"]').value = group.trainerId;
        this.form.querySelector('[name="day"]').value = group.day;

        // Handle New Time Picker
        const fullTime = group.time || "10:00 AM";
        const parts = fullTime.split(' '); // [ "10:00", "AM" ]
        const timeParts = parts[0].split(':'); // [ "10", "00" ]
        document.getElementById('group-hour').value = timeParts[0];
        document.getElementById('group-minute').value = timeParts[1] || "00";
        document.getElementById('group-ampm').value = parts[1] || "AM";

        this.form.querySelector('[name="startDate"]').value = group.startDate;
        this.form.querySelector('[name="status"]').value = group.status || 'Active';

        Modal.open('group-modal');
    }

    delete(id) {
        const groups = Storage.get('study_groups') || [];
        const group = groups.find(g => g.id == id);

        Modal.secureDelete(group.name, () => {
            const filtered = groups.filter(g => g.id != id);
            Storage.save('study_groups', filtered);
            this.render();
            Toast.show('تم حذف المجموعة بنجاح', 'success');
        });
    }
}

// Enrollment Logic is now handled by core.js for global access.

// Initial Launch
document.addEventListener('DOMContentLoaded', () => {
    window.groupsManager = new GroupsManager();
});
