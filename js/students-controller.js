/**
 * Students Page Frontend Logic
 * Connects UI to StudentManager Core Logic
 */

import { system } from '../../core/main.js';

class StudentsPageController {
    constructor() {
        this.currentStudents = [];
        this.selectedStudent = null;
        this.init();
    }

    async init() {
        console.log('[StudentsPage] Initializing...');
        await this.loadStudents();
        this.attachEventListeners();
    }

    /**
     * Load Students from Backend
     */
    async loadStudents(filters = {}) {
        try {
            this.currentStudents = await system.students.searchStudents(filters);
            this.renderStudentsTable();
        } catch (error) {
            console.error('[StudentsPage] Error loading students:', error);
            this.showError('فشل تحميل بيانات الطلاب');
        }
    }

    /**
     * Render Students Table
     */
    renderStudentsTable() {
        const tbody = document.querySelector('.neuro-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.currentStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">لا توجد نتائج</td></tr>';
            return;
        }

        this.currentStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:30px; height:30px; border-radius:50%; background:#1e293b; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.8rem;">
                            ${this.getInitials(student.full_name)}
                        </div>
                        <span>${student.full_name}</span>
                    </div>
                </td>
                <td>${this.getStudentGroup(student.user_id)}</td>
                <td>${student.phone || 'N/A'}</td>
                <td>${this.getPaymentStatus(student.user_id)}</td>
                <td><span class="status-badge ${student.status === 'Active' ? 'status-confirmed' : 'status-cancelled'}">${student.status === 'Active' ? 'نشط' : 'منقطع'}</span></td>
                <td>
                    <button class="btn-edit" data-id="${student.user_id}" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; margin-left:5px;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete" data-id="${student.user_id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Attach row-level event listeners
        this.attachRowEventListeners();
    }

    /**
     * Get Student's Current Group (Mock)
     */
    getStudentGroup(studentId) {
        // This would come from enrollments in real implementation
        const groups = ['English Level 1 (Group A)', 'IELTS Prep', 'English Level 2'];
        return groups[studentId % 3];
    }

    /**
     * Get Payment Status (Mock)
     */
    getPaymentStatus(studentId) {
        const statuses = [
            '<span style="color:#10b981;">خالص</span>',
            '<span style="color:#ef4444;">عليه 600 EGP</span>',
            '<span style="color:#f59e0b;">عليه 300 EGP</span>'
        ];
        return statuses[studentId % 3];
    }

    /**
     * Get Initials from Name
     */
    getInitials(name) {
        const parts = name.split(' ');
        return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2);
    }

    /**
     * Attach Event Listeners
     */
    attachEventListeners() {
        // Search Input
        const searchInput = document.querySelector('input[placeholder*="بحث"]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.loadStudents({ searchTerm: e.target.value });
            });
        }

        // Filter Dropdowns
        const groupFilter = document.querySelector('select');
        if (groupFilter) {
            groupFilter.addEventListener('change', (e) => {
                this.loadStudents({ groupId: e.target.value });
            });
        }

        // Add Student Button
        const addBtn = document.querySelector('.btn-neuro[style*="accent-blue"]');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddStudentModal());
        }

        // Export Button
        const exportBtn = document.querySelector('.btn-neuro[style*="0b1120"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStudents());
        }
    }

    /**
     * Attach Row-Level Event Listeners
     */
    attachRowEventListeners() {
        // Edit Buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = parseInt(e.currentTarget.dataset.id);
                this.editStudent(studentId);
            });
        });

        // Delete Buttons
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = parseInt(e.currentTarget.dataset.id);
                this.deleteStudent(studentId);
            });
        });
    }

    /**
     * Show Add Student Modal
     */
    showAddStudentModal() {
        alert('سيتم فتح نافذة إضافة طالب جديد (قيد التطوير)');
        // TODO: Implement modal UI
    }

    /**
     * Edit Student
     */
    async editStudent(studentId) {
        const student = this.currentStudents.find(s => s.user_id === studentId);
        if (!student) return;

        alert(`تعديل بيانات الطالب: ${student.full_name}\n(قيد التطوير)`);
        // TODO: Implement edit modal
    }

    /**
     * Delete Student
     */
    async deleteStudent(studentId) {
        const student = this.currentStudents.find(s => s.user_id === studentId);
        if (!student) return;

        if (window.Modal && Modal.secureDelete) {
            Modal.secureDelete(student.full_name, async () => {
                try {
                    const result = await system.students.deleteStudent(studentId);
                    if (result.success) {
                        Toast.show('تم حذف الطالب بنجاح', 'success');
                        await this.loadStudents();
                    } else {
                        Toast.show('خطأ: ' + result.error, 'error');
                    }
                } catch (error) {
                    console.error('[StudentsPage] Delete error:', error);
                    Toast.show('فشل حذف الطالب', 'error');
                }
            });
        } else {
            // Fallback if Modal is not loaded
            if (confirm(`هل أنت متأكد من حذف الطالب: ${student.full_name}؟`)) {
                if (window.AudioCore) AudioCore.playScare();
                try {
                    const result = await system.students.deleteStudent(studentId);
                    if (result.success) {
                        alert('تم حذف الطالب بنجاح');
                        await this.loadStudents();
                    }
                } catch (error) {
                    console.error('[StudentsPage] Delete error:', error);
                }
            }
        }
    }

    /**
     * Export Students
     */
    async exportStudents() {
        try {
            const result = await system.students.exportStudents();

            // Create download link
            const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = result.filename;
            link.click();

            alert('تم تصدير البيانات بنجاح');
        } catch (error) {
            console.error('[StudentsPage] Export error:', error);
            alert('فشل تصدير البيانات');
        }
    }

    /**
     * Show Error Message
     */
    showError(message) {
        alert('خطأ: ' + message);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.studentsController = new StudentsPageController();
    });
} else {
    window.studentsController = new StudentsPageController();
}
