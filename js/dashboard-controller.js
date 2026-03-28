/**
 * Dashboard Controller (Genius AI Version)
 * Implements Advanced BI & Analytics for EduMaster Pro
 */
class DashboardController {
    constructor() {
        this.charts = {};
        this.init();
    }

    async init() {
        try {
            this.updateStats();
            this.initializeFinancialChart();
            this.initializeDistributionChart();
            this.initializeAttendanceChart();
            this.initializeBranchPerformanceChart();
            this.updateAIInsights(); // 🧠 New AI Engine Call
            this.updateLeaderboard(); // 🏆 New Gamification Call
            this.loadRecentActivity();

            // 📦 New Inventory Stock Check
            if (window.InventoryEngine) window.InventoryEngine.checkLowStock();

            // Listen for theme changes or data updates
            document.addEventListener('themeChanged', () => this.refreshAllCharts());
            window.addEventListener('storage', (e) => {
                if (['students', 'transactions', 'attendance'].includes(e.key)) {
                    this.init();
                }
            });
        } catch (err) {
            console.error('Dashboard Engine Error:', err);
        }
    }

    refreshAllCharts() {
        Object.values(this.charts).forEach(chart => chart && chart.destroy());
        this.initializeFinancialChart();
        this.initializeDistributionChart();
        this.initializeAttendanceChart();
        this.initializeBranchPerformanceChart();
    }

    updateStats() {
        try {
            const activeBranchId = window.Permissions?.getActiveBranchId();
            const students = Storage.get('students') || [];
            const groups = Storage.get('study_groups') || [];
            const attendance = Storage.get('attendance') || {};

            // 1. Student Count (Branch Filtering)
            const filteredStudents = activeBranchId ? students.filter(s => s.branch == activeBranchId) : students;
            const studentCountEl = document.getElementById('stat-students-count');
            if (studentCountEl) studentCountEl.innerText = filteredStudents.length.toLocaleString();

            // 2. Attendance Rate Calculation
            const attRate = this._calculateAttendanceRate(attendance, activeBranchId);
            const attendanceRateEl = document.getElementById('stat-attendance-rate');
            if (attendanceRateEl) {
                attendanceRateEl.innerText = attRate + '%';
                attendanceRateEl.nextElementSibling.innerText = (attRate > 70) ? 'مستوى حضور متميز' : 'يتطلب متابعة';
                attendanceRateEl.nextElementSibling.style.color = (attRate > 70) ? '#10b981' : '#f59e0b';
            }

            // 3. Active Groups
            const filteredGroups = activeBranchId ? groups.filter(g => g.branch == activeBranchId) : groups;
            const groupsCountEl = document.getElementById('stat-groups-count');
            if (groupsCountEl) groupsCountEl.innerText = filteredGroups.length;

            // 4. Financial Health (Net Profit)
            const pl = AccountingCore.generateProfitLoss(activeBranchId);
            const netProfitEl = document.getElementById('stat-net-profit');
            if (netProfitEl) {
                netProfitEl.innerText = (pl.summary.netProfit || 0).toLocaleString() + ' ج.م';
            }
        } catch (e) {
            console.error('Stats Engine Failure:', e);
        }
    }

    _calculateAttendanceRate(attendance, branchId) {
        const entries = Object.entries(attendance);
        if (entries.length === 0) return 0;

        let totalPresents = 0;
        let totalRecords = 0;

        // Filter by branch if needed (Note: key format is date_groupId)
        const groups = Storage.get('study_groups') || [];
        const branchGroupIds = branchId ? groups.filter(g => g.branch == branchId).map(g => g.id.toString()) : null;

        entries.forEach(([key, records]) => {
            const groupId = key.split('_')[1];
            if (branchGroupIds && !branchGroupIds.includes(groupId)) return;

            const sessionRecords = Object.values(records);
            totalPresents += sessionRecords.filter(r => r.status === 'present' || r.status === 'late').length;
            totalRecords += sessionRecords.length;
        });

        return totalRecords > 0 ? Math.round((totalPresents / totalRecords) * 100) : 0;
    }

    initializeFinancialChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        const activeBranchId = window.Permissions?.getActiveBranchId();
        const pl = AccountingCore.getDashboardData(activeBranchId);
        const yearlyData = pl.currentYear.monthlyBreakdown;

        const isDark = document.body.classList.contains('dark-mode');
        const accentColor = document.body.classList.contains('cloudy-mode') ? '#6366f1' : '#00eaff';

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                datasets: [{
                    label: 'صافي الربح الشهري',
                    data: yearlyData.map(d => d.netProfit),
                    borderColor: accentColor,
                    backgroundColor: 'rgba(0, 234, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: accentColor
                }]
            },
            options: this._getCommonChartOptions(isDark)
        });
    }

    initializeDistributionChart() {
        const ctx = document.getElementById('student-distribution-chart');
        if (!ctx) return;

        const students = Storage.get('students') || [];
        const activeBranchId = window.Permissions?.getActiveBranchId();
        const filtered = activeBranchId ? students.filter(s => s.branch == activeBranchId) : students;

        const distribution = {};
        filtered.forEach(s => {
            const group = s.group || 'غير محدد';
            distribution[group] = (distribution[group] || 0) + 1;
        });

        const labels = Object.keys(distribution);
        const data = Object.values(distribution);

        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#00eaff', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: this._getTextColor(), font: { family: 'Tajawal' } } }
                },
                cutout: '70%'
            }
        });
    }

    initializeAttendanceChart() {
        const ctx = document.getElementById('attendance-trends-chart');
        if (!ctx) return;

        const attendance = Storage.get('attendance') || {};
        const activeBranchId = window.Permissions?.getActiveBranchId();
        const groups = Storage.get('study_groups') || [];
        const branchGroupIds = activeBranchId ? groups.filter(g => g.branch == activeBranchId).map(g => g.id.toString()) : null;

        // Get last 7 sessions
        const sortedKeys = Object.keys(attendance).sort().reverse().slice(0, 7).reverse();
        const labels = sortedKeys.map(k => k.split('_')[0].split('-').slice(1).join('/')); // Show MM/DD
        const data = sortedKeys.map(key => {
            const records = Object.values(attendance[key]);
            const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
            return records.length > 0 ? Math.round((present / records.length) * 100) : 0;
        });

        this.charts.attendance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['سجل خالي'],
                datasets: [{
                    label: 'نسبة الحضور %',
                    data: data.length ? data : [0],
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderRadius: 8
                }]
            },
            options: this._getCommonChartOptions(document.body.classList.contains('dark-mode'))
        });
    }

    initializeBranchPerformanceChart() {
        const ctx = document.getElementById('branch-performance-chart');
        const container = document.getElementById('branch-performance-container');
        if (!ctx) return;

        const branches = Storage.get('branches') || [];
        const activeBranchId = window.Permissions?.getActiveBranchId();

        // If specific branch is selected, hide the branch comparison and show something else (e.g., categories)
        if (activeBranchId) {
            if (container) container.style.display = 'none';
            return;
        }

        const data = branches.map(b => {
            const stats = AccountingCore.getBranchBalance(b.id);
            return { name: b.name, revenue: stats.totalIncome || 0 };
        });

        this.charts.performance = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    data: data.map(d => d.revenue),
                    backgroundColor: ['rgba(0, 234, 255, 0.5)', 'rgba(99, 102, 241, 0.5)', 'rgba(16, 185, 129, 0.5)', 'rgba(245, 158, 11, 0.5)']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: this._getTextColor(), font: { family: 'Tajawal' } } }
                },
                scales: {
                    r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } }
                }
            }
        });
    }

    loadRecentActivity() {
        const tableBody = document.querySelector('#recent-activity-table tbody');
        if (!tableBody) return;

        const auditLogs = Storage.get('audit_logs') || [];
        const displayLogs = auditLogs.slice(0, 8);

        if (displayLogs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد أنشطة مسجلة بعد</td></tr>';
            return;
        }

        tableBody.innerHTML = displayLogs.map(log => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:35px; height:35px; background:rgba(0,234,255,0.1); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--accent-teal)">
                            <i class="${this._getActionIcon(log.action)}"></i>
                        </div>
                        <div>
                            <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${this._translateAction(log.action)}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${log.details}</div>
                        </div>
                    </div>
                </td>
                <td style="font-size:0.85rem; font-weight:600; color:var(--text-muted); font-family:'Inter'">${this._formatTime(log.timestamp)}</td>
                <td><span class="status-badge" style="background:var(--accent-teal-soft); color:var(--accent-teal); font-weight:800; font-size:0.75rem;">${log.user}</span></td>
            </tr>
        `).join('');
    }

    _getCommonChartOptions(isDark) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: this._getTextColor() } },
                x: { grid: { display: false }, ticks: { color: this._getTextColor() } }
            }
        };
    }

    _getTextColor() {
        return document.body.classList.contains('dark-mode') ? '#94a3b8' : '#475569';
    }

    _getActionIcon(action) {
        const icons = {
            'INCOME_RECORDED': 'fa-solid fa-hand-holding-dollar',
            'EXPENSE_RECORDED': 'fa-solid fa-money-bill-transfer',
            'LOGIN_SUCCESS': 'fa-solid fa-shield-check',
            'RECORD_DELETED': 'fa-solid fa-trash-can',
            'STUDENT_ADDED': 'fa-solid fa-user-plus'
        };
        return icons[action] || 'fa-solid fa-circle-dot';
    }

    _translateAction(action) {
        const map = {
            'INCOME_RECORDED': 'تسجيل إيراد مالي',
            'EXPENSE_RECORDED': 'تسجيل مصروفات',
            'LOGIN_SUCCESS': 'دخول للنظام',
            'RECORD_DELETED': 'حذف بيانات',
            'DAY_CLOSED': 'إغلاق اليومية',
            'OPENING_BALANCE_SET': 'رصيد افتتاحي'
        };
        return map[action] || action;
    }

    _formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' });
    }

    // 🧠 AI ENGINE: Update Insights UI
    updateAIInsights() {
        const container = document.getElementById('at-risk-students-container');
        const summaryEl = document.getElementById('ai-stats-summary');
        if (!container || !window.AIEngine) return;

        const report = window.AIEngine.getRiskReport();
        const stats = window.AIEngine.getGlobalStats();

        // 1. Update Stats Bar
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; font-weight: 900; color: #ef4444; line-height: 1;">${stats.highRiskCount}</div>
                    <div style="font-size: 0.7rem; color: var(--text-main); font-weight: 800; margin-top: 5px;">خطر مرتفع</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; font-weight: 900; color: #f59e0b; line-height: 1;">${stats.mediumRiskCount}</div>
                    <div style="font-size: 0.7rem; color: var(--text-main); font-weight: 800; margin-top: 5px;">خطر متوسط</div>
                </div>
            `;
        }

        // 2. Update Risk Cards
        if (report.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-main); font-weight: 700;">
                    <i class="fa-solid fa-circle-check" style="font-size: 2.5rem; color: #10b981; margin-bottom: 15px; display: block;"></i>
                    جميع الطلاب في حالة مستقرة حالياً. لا توجد مخاطر مكتشفة.
                </div>
            `;
            return;
        }

        container.innerHTML = report.slice(0, 4).map(r => `
            <div style="background: var(--bg-main); border: 1px solid var(--border-soft); border-radius: 15px; padding: 18px; transition: 0.3s; border-right: 4px solid ${r.color};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="font-weight: 900; color: var(--text-main); font-size: 1rem;">${r.studentName}</div>
                    <span style="font-size: 0.65rem; background: ${r.color}20; color: ${r.color}; padding: 3px 8px; border-radius: 50px; font-weight: 900;">${r.level}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); filter: brightness(1.2); font-weight: 600; margin-bottom: 15px;">
                    ${r.reasons.map(reason => `<div style="margin-bottom: 6px;"><i class="fa-solid fa-triangle-exclamation" style="margin-left:7px; color:${r.color}"></i> ${reason}</div>`).join('')}
                </div>
                <button class="app-btn-secondary" style="width: 100%; font-size: 0.75rem; padding: 8px; border-radius: 8px;" onclick="window.location.href='students.html?search=${encodeURIComponent(r.studentName)}'">
                    <i class="fa-solid fa-user-gear"></i> اتخاذ إجراء سريع
                </button>
            </div>
        `).join('');
    }

    // 🏆 GAMIFICATION: Update Leaderboard UI
    updateLeaderboard() {
        const container = document.getElementById('leaderboard-container');
        if (!container || !window.Gamification) return;

        const winners = window.Gamification.getLeaderboard(5);

        if (winners.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">لا توجد بيانات نقاط كافية لبناء لوحة المتصدرين.</div>';
            return;
        }

        container.innerHTML = winners.map((s, index) => `
            <div style="background: var(--bg-main); border: 1px solid var(--border-soft); border-radius: 20px; padding: 15px; text-align: center; position: relative; transition: 0.3s;">
                ${index < 3 ? `<div style="position: absolute; top: -10px; right: -10px; width: 35px; height: 35px; background: #f59e0b; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; box-shadow: 0 5px 15px rgba(245, 158, 11, 0.4); border: 2px solid #fff;">${index + 1}</div>` : ''}
                <div style="width: 50px; height: 50px; background: ${s.color}20; color: ${s.color}; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 900; overflow: hidden;">
                    ${s.photo ? `<img src="${s.photo}" style="width:100%; height:100%; object-fit:cover;">` : `<img src="education.png" style="width:70%; height:70%; opacity:0.6; object-fit:contain;">`}
                </div>
                <div style="font-weight: 900; color: var(--text-main); font-size: 0.95rem; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                <div style="font-size: 0.75rem; color: ${s.color}; font-weight: 800; margin-bottom: 8px;">${s.rank}</div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-soft); padding: 8px; border-radius: 12px; font-weight: 900; color: var(--accent-teal); font-size: 1rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${s.points} <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">نقطة</span>
                </div>
            </div>
        `).join('');
    }
}

// Global start
window.dashboard = new DashboardController();
