/**
 * 🏆 EduMaster Pro - Gamification Engine
 * 
 * Manages student points, levels, ranks, and leaderboard.
 */

window.Gamification = {
    // ⚙️ Points Configuration
    POINTS_RULES: {
        ATTENDANCE_PRESENT: 10,
        ATTENDANCE_LATE: 5,
        EXAM_FULL_MARK: 50,
        EXAM_PASS: 20,
        EARLY_PAYMENT: 30
    },

    // 🎖️ Rank Definitions
    RANKS: [
        { min: 0, label: 'مبتدئ (Newbie)', color: '#94a3b8' },
        { min: 100, label: 'طالب مجتهد (Scholar)', color: '#10b981' },
        { min: 500, label: 'بطل المركز (Champion)', color: '#f59e0b' },
        { min: 1000, label: 'الأسطورة (Legend)', color: '#8b5cf6' }
    ],

    /**
     * Calculate total points for a student
     */
    calculateStudentPoints(studentId) {
        let total = 0;

        // 1. Points from Attendance
        const attendance = Storage.get('attendance') || {};
        Object.values(attendance).forEach(session => {
            if (session[studentId]) {
                const status = session[studentId].status;
                if (status === 'present') total += this.POINTS_RULES.ATTENDANCE_PRESENT;
                if (status === 'late') total += this.POINTS_RULES.ATTENDANCE_LATE;
            }
        });

        // 2. Points from Grades
        const gradesData = Storage.get('student_grades') || {};
        const studentGrades = gradesData[studentId] || [];
        studentGrades.forEach(g => {
            if (g.grade >= 100) total += this.POINTS_RULES.EXAM_FULL_MARK;
            else if (g.grade >= 50) total += this.POINTS_RULES.EXAM_PASS;
        });

        return total;
    },

    /**
     * Get Rank Details based on points
     */
    getRank(points) {
        return [...this.RANKS].reverse().find(r => points >= r.min) || this.RANKS[0];
    },

    /**
     * Build Leaderboard data
     */
    getLeaderboard(limit = 5) {
        const students = Storage.get('students') || [];
        const board = students.map(s => {
            const points = this.calculateStudentPoints(s.id);
            const rank = this.getRank(points);
            return {
                id: s.id,
                name: s.name,
                points: points,
                rank: rank.label,
                color: rank.color,
                photo: s.photo || null
            };
        });

        return board.sort((a, b) => b.points - a.points).slice(0, limit);
    },

    /**
     * Get Level Progress
     */
    getLevelInfo(points) {
        const currentRank = this.getRank(points);
        const nextRankIdx = this.RANKS.findIndex(r => r.min === currentRank.min) + 1;
        const nextRank = this.RANKS[nextRankIdx];

        if (!nextRank) return { current: 'MAX', percent: 100, next: '---' };

        const progress = points - currentRank.min;
        const totalNeeded = nextRank.min - currentRank.min;
        const percent = Math.min(Math.round((progress / totalNeeded) * 100), 100);

        return {
            current: currentRank.label,
            next: nextRank.label,
            percent: percent,
            pointsToNext: nextRank.min - points
        };
    }
};

console.log('🏆 Gamification Engine Loaded: Competition Mode ON');
