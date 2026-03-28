/**
 * 🧠 EduMaster Pro - Predictive AI Engine
 * 
 * Analyzes student behavior (attendance, grades, finance) 
 * to predict potential dropouts (At-Risk prediction).
 */

window.AIEngine = {
    RISK_LEVELS: {
        HIGH: { label: 'خطر مرتفع', color: '#ef4444', score: 70 },
        MEDIUM: { label: 'خطر متوسط', color: '#f59e0b', score: 40 },
        LOW: { label: 'مستقر', color: '#10b981', score: 0 }
    },

    /**
     * Analyze a single student and return their risk profile
     */
    analyzeStudent(studentId) {
        const attendance = Storage.get('attendance') || {};
        const students = Storage.get('students') || [];
        const student = students.find(s => s.id == studentId);
        if (!student) return null;

        let riskScore = 0;
        const reasons = [];

        // 1. Analyze Attendance (Consecutive Absences)
        const entries = Object.entries(attendance).sort((a,b) => b[0].localeCompare(a[0]));
        let consecutiveAbsences = 0;
        let lastSessionDate = null;
        
        for (const [key, records] of entries) {
            const att = records[studentId];
            if (att) {
                if (att.status === 'absent') {
                    consecutiveAbsences++;
                } else {
                    break; // Stop at first presence
                }
                if (!lastSessionDate) lastSessionDate = key.split('_')[0];
            }
        }

        if (consecutiveAbsences >= 3) {
            riskScore += 60;
            reasons.push(`انقطاع مقلق: غياب ${consecutiveAbsences} حصص متتالية`);
        } else if (consecutiveAbsences > 0) {
            riskScore += (consecutiveAbsences * 15);
            reasons.push(`تنبيه: غياب آخر ${consecutiveAbsences} حصص`);
        }

        // 2. Inactivity Period (Days since last seen)
        let lastSeenDate = null;
        for (const [key, records] of entries) {
            if (records[studentId] && records[studentId].status !== 'absent') {
                lastSeenDate = new Date(key.split('_')[0]);
                break;
            }
        }

        if (lastSeenDate) {
            const diffDays = Math.floor((new Date() - lastSeenDate) / (1000 * 60 * 60 * 24));
            if (diffDays > 14) {
                riskScore += 40;
                reasons.push(`غياب طويل: لم يظهر في المركز منذ ${diffDays} يومًا`);
            }
        }

        // 3. Analyze Grades (If available)
        const grades = Storage.get('student_grades') || {};
        const studentGrades = grades[studentId] || [];
        if (studentGrades.length > 0) {
            const recentGrades = studentGrades.slice(-3);
            const avg = recentGrades.reduce((a, b) => a + (Number(b.grade) || 0), 0) / recentGrades.length;
            if (avg < 50) {
                riskScore += 30;
                reasons.push('تراجع أكاديمي: متوسط آخر الاختبارات أقل من 50%');
            }
        }

        // 4. Analyze Payment Status
        const transactions = Storage.get('transactions') || [];
        const studentIncomes = transactions.filter(t => t.student_id == studentId && t.type === 'income');
        if (studentIncomes.length > 0) {
            const lastPay = new Date(Math.max(...studentIncomes.map(t => new Date(t.date))));
            const payDiff = Math.floor((new Date() - lastPay) / (1000 * 60 * 60 * 24));
            if (payDiff > 40) {
                riskScore += 25;
                reasons.push(`متأخرات مالية: آخر دفعة كانت منذ ${payDiff} يومًا`);
            }
        } else {
            riskScore += 15;
            reasons.push('لم يتم تسجيل أي مدفوعات سابقة');
        }

        // Determine Risk Level
        let level = this.RISK_LEVELS.LOW;
        if (riskScore >= 70) level = this.RISK_LEVELS.HIGH;
        else if (riskScore >= 40) level = this.RISK_LEVELS.MEDIUM;

        return {
            studentId,
            studentName: student.name,
            score: riskScore,
            level: level.label,
            color: level.color,
            reasons: reasons
        };
    },

    /**
     * Get a list of all students sorted by risk
     */
    getRiskReport() {
        const students = Storage.get('students') || [];
        const report = students
            .map(s => this.analyzeStudent(s.id))
            .filter(r => r && r.score > 10)
            .sort((a, b) => b.score - a.score);

        return report;
    },

    /**
     * Summarize risk statistics for dashboard
     */
    getGlobalStats() {
        const report = this.getRiskReport();
        return {
            highRiskCount: report.filter(r => r.score >= 70).length,
            mediumRiskCount: report.filter(r => r.score >= 40 && r.score < 70).length,
            totalAnalyzed: (Storage.get('students') || []).length
        };
    }
};

console.log('🧠 AI Engine Loaded: Predictive Analytics Ready');
