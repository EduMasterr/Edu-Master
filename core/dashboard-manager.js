/**
 * Dashboard Manager - Core Logic for Dashboard Statistics & Analytics
 * Phase 2 - EduMaster Pro
 */

export class DashboardManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Get Dashboard Statistics for a specific branch (or all)
     * @param {number|null} branchId - null for all branches
     */
    async getDashboardStats(branchId = null) {
        console.log(`[DashboardManager] Loading stats for branch: ${branchId || 'All'}`);

        const stats = {
            totalStudents: 0,
            activeStudents: 0,
            totalTeachers: 0,
            activeGroups: 0,
            totalRevenue: 0,
            pendingPayments: 0,
            attendanceRate: 0,
            newEnrollmentsThisMonth: 0
        };

        // Get students
        const students = await this.db.getAllStudents();
        const filteredStudents = branchId
            ? students.filter(s => s.branch_id === branchId)
            : students;

        stats.totalStudents = filteredStudents.length;
        stats.activeStudents = filteredStudents.filter(s => s.status === 'Active').length;

        // Get teachers
        const teachers = await this.db.getAllTeachers();
        const filteredTeachers = branchId
            ? teachers.filter(t => t.branch_id === branchId)
            : teachers;
        stats.totalTeachers = filteredTeachers.length;

        // Get groups
        const groups = await this.db.getAllGroups();
        const filteredGroups = branchId
            ? groups.filter(g => g.branch_id === branchId)
            : groups;
        stats.activeGroups = filteredGroups.filter(g => g.status === 'Active').length;

        // Get revenue
        const payments = await this.db.getAllPayments();
        const filteredPayments = branchId
            ? payments.filter(p => p.branch_id === branchId)
            : payments;

        stats.totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

        // Get pending payments
        const enrollments = await this.db.getAllEnrollments();
        const pendingEnrollments = enrollments.filter(e => e.payment_status === 'Pending');
        stats.pendingPayments = pendingEnrollments.reduce((sum, e) => sum + (e.fee || 0), 0);

        // Calculate attendance rate
        const attendance = await this.db.getAllAttendance();
        const totalSessions = attendance.length;
        const presentSessions = attendance.filter(a => a.status === 'Present').length;
        stats.attendanceRate = totalSessions > 0
            ? Math.round((presentSessions / totalSessions) * 100)
            : 0;

        // New enrollments this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        stats.newEnrollmentsThisMonth = enrollments.filter(e => {
            const enrollDate = new Date(e.enrollment_date);
            return enrollDate.getMonth() === currentMonth && enrollDate.getFullYear() === currentYear;
        }).length;

        return stats;
    }

    /**
     * Get Recent Activity Feed
     * @param {number} limit - Number of activities to return
     */
    async getRecentActivity(limit = 10) {
        console.log('[DashboardManager] Loading recent activity...');

        const activities = [];

        // Get recent enrollments
        const enrollments = await this.db.getAllEnrollments();
        const recentEnrollments = enrollments
            .sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date))
            .slice(0, 5);

        for (const enrollment of recentEnrollments) {
            const student = await this.db.findUserById(enrollment.student_id);
            const group = await this.db.findGroupById(enrollment.group_id);

            activities.push({
                type: 'enrollment',
                icon: 'fa-user-plus',
                color: '#10b981',
                message: `${student.full_name} انضم إلى ${group.group_name}`,
                timestamp: enrollment.enrollment_date,
                details: `حالة الدفع: ${enrollment.payment_status === 'Paid' ? 'مدفوع' : 'معلق'}`
            });
        }

        // Get recent payments
        const payments = await this.db.getAllPayments();
        const recentPayments = payments
            .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
            .slice(0, 3);

        for (const payment of recentPayments) {
            const student = await this.db.findUserById(payment.student_id);

            activities.push({
                type: 'payment',
                icon: 'fa-money-bill-wave',
                color: '#00eaff',
                message: `${student.full_name} دفع ${payment.amount} EGP`,
                timestamp: payment.payment_date,
                details: `طريقة الدفع: ${payment.payment_method}`
            });
        }

        // Get recent attendance (absences)
        const attendance = await this.db.getAllAttendance();
        const recentAbsences = attendance
            .filter(a => a.status === 'Absent')
            .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
            .slice(0, 2);

        for (const absence of recentAbsences) {
            const enrollment = await this.db.getEnrollmentById(absence.enrollment_id);
            const student = await this.db.findUserById(enrollment.student_id);

            activities.push({
                type: 'absence',
                icon: 'fa-user-xmark',
                color: '#ef4444',
                message: `${student.full_name} غائب`,
                timestamp: absence.session_date,
                details: `تاريخ الجلسة: ${absence.session_date}`
            });
        }

        // Sort by timestamp and limit
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Get Chart Data for Revenue Trend (Last 6 Months)
     */
    async getRevenueChartData() {
        console.log('[DashboardManager] Generating revenue chart data...');

        const months = [];
        const revenues = [];

        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            const monthName = date.toLocaleDateString('ar-EG', { month: 'short' });
            months.push(monthName);

            // Calculate revenue for this month (placeholder logic)
            const payments = await this.db.getAllPayments();
            const monthRevenue = payments
                .filter(p => {
                    const paymentDate = new Date(p.payment_date);
                    return paymentDate.getMonth() === date.getMonth() &&
                        paymentDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, p) => sum + p.amount, 0);

            revenues.push(monthRevenue);
        }

        return { labels: months, data: revenues };
    }

    /**
     * Get Chart Data for Student Distribution by Branch
     */
    async getStudentDistributionChartData() {
        console.log('[DashboardManager] Generating student distribution chart...');

        const branches = await this.db.findAllBranches();
        const labels = [];
        const data = [];

        for (const branch of branches) {
            labels.push(branch.name);
            const count = await this.db.userCountByBranch(branch.branch_id, 'Student');
            data.push(count);
        }

        return { labels, data };
    }

    /**
     * Get Chart Data for Attendance Rate (Last 7 Days)
     */
    async getAttendanceChartData() {
        console.log('[DashboardManager] Generating attendance chart data...');

        const days = [];
        const presentData = [];
        const absentData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
            days.push(dayName);

            // Get attendance for this day
            const attendance = await this.db.getAllAttendance();
            const dayAttendance = attendance.filter(a => {
                const sessionDate = new Date(a.session_date);
                return sessionDate.toDateString() === date.toDateString();
            });

            const present = dayAttendance.filter(a => a.status === 'Present').length;
            const absent = dayAttendance.filter(a => a.status === 'Absent').length;

            presentData.push(present);
            absentData.push(absent);
        }

        return { labels: days, present: presentData, absent: absentData };
    }

    /**
     * Global Search across Students, Teachers, Courses
     * @param {string} query - Search term
     */
    async globalSearch(query) {
        console.log(`[DashboardManager] Global search: "${query}"`);

        if (!query || query.length < 2) {
            return { students: [], teachers: [], courses: [], branches: [] };
        }

        const term = query.toLowerCase();
        const results = {
            students: [],
            teachers: [],
            courses: [],
            branches: []
        };

        // Search students
        const students = await this.db.getAllStudents();
        results.students = students.filter(s =>
            s.full_name.toLowerCase().includes(term) ||
            s.username.toLowerCase().includes(term) ||
            (s.phone && s.phone.includes(term)) ||
            (s.email && s.email.toLowerCase().includes(term))
        ).slice(0, 5);

        // Search teachers
        const teachers = await this.db.getAllTeachers();
        results.teachers = teachers.filter(t =>
            t.full_name.toLowerCase().includes(term) ||
            t.username.toLowerCase().includes(term) ||
            (t.email && t.email.toLowerCase().includes(term))
        ).slice(0, 5);

        // Search courses
        const courses = await this.db.getAllCourses();
        results.courses = courses.filter(c =>
            c.course_name.toLowerCase().includes(term) ||
            (c.description && c.description.toLowerCase().includes(term))
        ).slice(0, 5);

        // Search branches
        const branches = await this.db.findAllBranches();
        results.branches = branches.filter(b =>
            b.name.toLowerCase().includes(term) ||
            (b.location && b.location.toLowerCase().includes(term))
        ).slice(0, 5);

        return results;
    }
}
