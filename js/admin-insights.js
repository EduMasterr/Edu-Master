/**
 * General Manager Insights Controller
 * EduMaster Pro - Admin Analytics Engine
 */

class AdminInsightsController {
    constructor() {
        this.init();
    }

    init() {
        if (window.Permissions?.getCurrentUser()?.role_id !== 1) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.renderExecutiveSummary();
        this.renderBranchList();
        this.renderCharts();
        this.renderGrowthAlerts();

        // Handle theme changes
        document.addEventListener('themeChanged', () => {
            this.renderCharts();
        });
    }

    renderExecutiveSummary() {
        const students = Storage.get('students') || [];
        const branches = Storage.get('branches') || [];

        // Calculate Total Revenue from all transactions
        const transactions = Storage.get('transactions') || [];
        const totalRevenue = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        document.getElementById('total-revenue-all').textContent = Formatter.formatCurrency(totalRevenue) + ' ج.م';
        document.getElementById('total-students-all').textContent = students.length;

        // Find top branch by student count
        const branchCounts = {};
        students.forEach(s => {
            const bId = s.branch_id || s.branch;
            if (bId) branchCounts[bId] = (branchCounts[bId] || 0) + 1;
        });

        let topBranchId = null;
        let maxCount = -1;
        for (const [id, count] of Object.entries(branchCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topBranchId = id;
            }
        }

        const topBranch = branches.find(b => b.id == topBranchId);
        document.getElementById('top-branch-name').textContent = topBranch ? topBranch.name : 'لا يوجد بيانات';
    }

    renderBranchList() {
        const branches = Storage.get('branches') || [];
        const students = Storage.get('students') || [];
        const transactions = Storage.get('transactions') || [];
        const container = document.getElementById('branch-performance-list');

        if (branches.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;">لا يوجد فروع مسجلة</div>';
            return;
        }

        const totalStudents = students.length || 1; // Avoid divide by zero

        let html = '';
        branches.forEach(branch => {
            const branchStudents = students.filter(s => (s.branch_id || s.branch) == branch.id).length;
            const branchRevenue = transactions
                .filter(t => t.type === 'income' && t.branch_id == branch.id)
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const progress = (branchStudents / totalStudents) * 100;

            // Debt Calculation (Fictionalized/Estimated based on missing payments)
            const atRiskCount = students.filter(s => (s.branch_id || s.branch) == branch.id && window.AIEngine?.analyzeStudent(s.id)?.score > 50).length;

            html += `
                <div class="branch-stat-row">
                    <div style="width: 120px; font-weight: 900; color: var(--sidebar-bg); font-size: 0.9rem;">${branch.name}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    <div style="width: 80px; text-align: left; font-weight: 800; font-size: 0.85rem; color: var(--accent-teal);">
                        ${branchStudents} طالب
                    </div>
                    <div style="width: 100px; text-align: left; font-weight: 900; font-size: 0.85rem; color: var(--sidebar-bg);">
                        ${Formatter.formatCurrency(branchRevenue)} ج.م
                    </div>
                    <div style="width: 80px; text-align: left;">
                        <span class="growth-badge ${atRiskCount > 5 ? 'growth-down' : 'growth-up'}">
                            <i class="fa-solid ${atRiskCount > 5 ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}"></i>
                            ${atRiskCount > 5 ? 'تحذير' : 'نمو'}
                        </span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderCharts() {
        const ctxBar = document.getElementById('branch-comparison-chart')?.getContext('2d');
        const ctxPie = document.getElementById('student-distribution-chart')?.getContext('2d');

        if (!ctxBar || !ctxPie || typeof Chart === 'undefined') return;

        const branches = Storage.get('branches') || [];
        const students = Storage.get('students') || [];
        const transactions = Storage.get('transactions') || [];

        const isDark = document.body.classList.contains('dark-mode');
        const labelColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        // 1. Bar Chart: Revenue by Branch
        const branchLabels = branches.map(b => b.name);
        const revenueData = branches.map(b => {
            return transactions
                .filter(t => t.type === 'income' && t.branch_id == b.id)
                .reduce((sum, t) => sum + (t.amount || 0), 0);
        });

        if (window.adminRevenueChart) window.adminRevenueChart.destroy();
        window.adminRevenueChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: branchLabels,
                datasets: [{
                    label: 'إجمالي الإيرادات',
                    data: revenueData,
                    backgroundColor: 'rgba(26, 158, 156, 0.7)',
                    borderColor: 'var(--accent-teal)',
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { family: 'Tajawal', weight: 'bold' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: labelColor, font: { family: 'Tajawal', weight: 'bold' } }
                    }
                }
            }
        });

        // 2. Pie Chart: Students by Branch
        const studentData = branches.map(b => {
            return students.filter(s => (s.branch_id || s.branch) == b.id).length;
        });

        if (window.adminStudentChart) window.adminStudentChart.destroy();
        window.adminStudentChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: branchLabels,
                datasets: [{
                    data: studentData,
                    backgroundColor: [
                        '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'
                    ],
                    borderWidth: 0,
                    spacing: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor, font: { family: 'Tajawal', weight: 'bold' } }
                    }
                }
            }
        });
    }

    renderGrowthAlerts() {
        const container = document.getElementById('growth-alerts-container');
        const students = Storage.get('students') || [];
        const branches = Storage.get('branches') || [];
        const transactions = Storage.get('transactions') || [];

        let alerts = [];

        // Logic 1: High growth branch
        const branchStats = branches.map(b => {
            return {
                id: b.id,
                name: b.name,
                students: students.filter(s => (s.branch_id || s.branch) == b.id).length
            };
        });

        const sortedByStudents = [...branchStats].sort((a, b) => b.students - a.students);
        if (sortedByStudents.length > 0 && sortedByStudents[0].students > 20) {
            alerts.push({
                type: 'success',
                icon: 'fa-rocket',
                title: `نمو فائق في فرع ${sortedByStudents[0].name}`,
                desc: `الفرع يتصدر النظام بـ ${sortedByStudents[0].students} طالب.`
            });
        }

        // Logic 2: Low activity branch
        const lowActivity = branchStats.find(b => b.students < 5 && students.length > 50);
        if (lowActivity) {
            alerts.push({
                type: 'warning',
                icon: 'fa-triangle-exclamation',
                title: `انتباه لفرع ${lowActivity.name}`,
                desc: 'نسبة الإقبال ضعيفة مقارنة بالمعدل العام للمعهد.'
            });
        }

        // Logic 3: Attendance Analytics (Summary)
        const attendance = Storage.get('attendance_records') || [];
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.date === today);
        if (todayAttendance.length > 0) {
            const absentRate = (todayAttendance.filter(a => a.status === 'absent').length / todayAttendance.length) * 100;
            if (absentRate > 30) {
                alerts.push({
                    type: 'danger',
                    icon: 'fa-user-clock',
                    title: 'ارتفاع نسبة الغياب اليوم',
                    desc: 'تجاوزت نسبة الغياب 30%، نقترح إرسال تنبيهات واتساب مكثفة.'
                });
            }
        }

        if (alerts.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5; font-weight:700;">لا يوجد تنبيهات عاجلة اليوم</div>';
            return;
        }

        container.innerHTML = alerts.map(a => `
            <div style="background: rgba(255,255,255,0.05); border-radius:15px; padding:15px; margin-bottom:12px; border-right: 4px solid ${a.type === 'success' ? '#10b981' : a.type === 'warning' ? '#f59e0b' : '#ef4444'
            };">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <i class="fa-solid ${a.icon}" style="color: ${a.type === 'success' ? '#10b981' : a.type === 'warning' ? '#f59e0b' : '#ef4444'
            };"></i>
                    <strong style="font-size:0.9rem;">${a.title}</strong>
                </div>
                <p style="margin:0; font-size:0.75rem; color: rgba(255,255,255,0.6); font-weight:700;">${a.desc}</p>
            </div>
        `).join('');
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    window.AdminInsights = new AdminInsightsController();
});
