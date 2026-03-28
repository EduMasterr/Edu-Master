/**
 * Attendance Management Module (Global Version)
 */
class AttendanceManager {
    constructor() {
        this.container = document.querySelector('.neuro-table tbody');
        this.saveBtn = document.getElementById('save-attendance');
        this.dateInput = document.getElementById('attendance-date');
        this.groupSelect = document.getElementById('group-select');
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.attachEvents();
    }

    render() {
        if (!this.container) return;
        const students = Storage.get('students') || [];
        const date = this.dateInput?.value || new Date().toISOString().split('T')[0];
        const group = this.groupSelect?.value || 'GE-L1';

        const groupStudents = students.filter(s => s.group === group);
        const currentData = Storage.get('attendance') || {};
        const key = `${date}_${group}`;
        const sessionAttendance = currentData[key] || {};

        this.container.innerHTML = '';
        if (groupStudents.length === 0) {
            this.container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px;">لا يوجد طلاب في هذه المجموعة</td></tr>';
            return;
        }

        groupStudents.forEach(student => {
            const status = sessionAttendance[student.id]?.status || 'present';
            const time = sessionAttendance[student.id]?.time || '--:--';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="user-avatar">${(student.name || '').substring(0, 2)}</div>
                        <span>${student.name}</span>
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:8px;" class="attendance-btns" data-student-id="${student.id}">
                        <button class="btn-neuro ${status === 'present' ? 'btn-primary' : 'btn-secondary'}" data-status="present">حاضر</button>
                        <button class="btn-neuro ${status === 'absent' ? 'btn-red' : 'btn-secondary'}" data-status="absent">غائب</button>
                    </div>
                </td>
                <td class="status-time">${time}</td>
                <td><input type="text" placeholder="ملاحظات..." class="form-control" style="padding:4px 8px; font-size:13px;"></td>
            `;
            this.container.appendChild(tr);
        });
    }

    attachEvents() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.attendance-btns button');
            if (btn) {
                const container = btn.closest('.attendance-btns');
                const row = btn.closest('tr');
                const status = btn.dataset.status;

                container.querySelectorAll('button').forEach(b => {
                    b.className = 'btn-neuro btn-secondary';
                });
                btn.className = status === 'present' ? 'btn-neuro btn-primary' : 'btn-neuro btn-red';

                if (status === 'present') {
                    const now = new Date();
                    row.querySelector('.status-time').innerText = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
                } else {
                    row.querySelector('.status-time').innerText = '--:--';
                }
            }
        });

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.save());
        }

        if (this.groupSelect) {
            this.groupSelect.addEventListener('change', () => this.render());
        }
    }

    save() {
        const date = this.dateInput?.value || new Date().toISOString().split('T')[0];
        const group = this.groupSelect?.value || 'GE-L1';
        const key = `${date}_${group}`;

        const data = Storage.get('attendance') || {};
        const sessionData = {};

        this.container.querySelectorAll('tr').forEach(tr => {
            const studentId = tr.querySelector('.attendance-btns')?.dataset.studentId;
            if (!studentId) return;

            const activeBtn = tr.querySelector('.attendance-btns .btn-primary, .attendance-btns .btn-red');
            sessionData[studentId] = {
                status: activeBtn ? activeBtn.dataset.status : 'absent',
                time: tr.querySelector('.status-time').innerText
            };
        });

        data[key] = sessionData;
        Storage.save('attendance', data);
        Toast.show('تم حفظ دفتر الحضور بنجاح', 'success');
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (window.location.pathname.includes('attendance.html')) new AttendanceManager(); });
} else {
    if (window.location.pathname.includes('attendance.html')) new AttendanceManager();
}
