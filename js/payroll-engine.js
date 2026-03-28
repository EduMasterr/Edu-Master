/**
 * 💰 EduMaster Pro - Teacher Payroll & Commission Engine
 * 
 * Automatically calculates teacher earnings based on student attendance and group rates.
 */

window.PayrollEngine = {
    // ⚙️ Configurations
    DEFAULT_COMMISSION: 50, // 50% fixed by default

    /**
     * Get commission settings for a teacher
     */
    getTeacherSettings(trainerId) {
        const settings = Storage.get('payroll_settings') || {};
        return settings[trainerId] || { type: 'percentage', value: this.DEFAULT_COMMISSION };
    },

    /**
     * Save commission settings
     */
    setTeacherSettings(trainerId, type, value) {
        const settings = Storage.get('payroll_settings') || {};
        settings[trainerId] = { type, value: parseFloat(value) };
        Storage.save('payroll_settings', settings);
        return true;
    },

    /**
     * Calculate Teacher Earnings for a specific period
     */
    calculateEarnings(trainerId, startDate, endDate) {
        const groups = (Storage.get('study_groups') || []).filter(g => g.trainerId == trainerId);
        const attendance = Storage.get('attendance') || {};
        const transactions = Storage.get('transactions') || [];
        const settings = this.getTeacherSettings(trainerId);

        let report = {
            totalStudents: 0,
            sessionsCount: 0,
            grossIncome: 0,
            teacherShare: 0,
            details: []
        };

        // Loop through all attendance records
        Object.entries(attendance).forEach(([date_groupId, studentsMap]) => {
            const [date, groupId] = date_groupId.split('_');

            // Check if date is within range
            if (date >= startDate && date <= endDate) {
                const group = groups.find(g => g.id == groupId);
                if (group) {
                    let groupPresentCount = 0;
                    let groupIncome = 0;

                    Object.entries(studentsMap).forEach(([sid, record]) => {
                        if (record.status === 'present') {
                            groupPresentCount++;
                            // Simple income simulation based on group price if available
                            // Usually tied to payment transactions
                            const price = parseFloat(group.price || 100); // Default 100 if not set
                            groupIncome += price;
                        }
                    });

                    let share = 0;
                    if (settings.type === 'percentage') {
                        share = (groupIncome * settings.value) / 100;
                    } else {
                        share = groupPresentCount * settings.value;
                    }

                    report.sessionsCount++;
                    report.totalStudents += groupPresentCount;
                    report.grossIncome += groupIncome;
                    report.teacherShare += share;

                    report.details.push({
                        date,
                        groupName: group.name,
                        students: groupPresentCount,
                        income: groupIncome,
                        share: share
                    });
                }
            }
        });

        return report;
    },

    /**
     * Record a Payout to a teacher (Integration with Accounting)
     */
    processPayout(trainerId, amount, details) {
        if (amount <= 0) return false;

        const trainers = Storage.get('trainers') || [];
        const trainer = trainers.find(t => t.id == trainerId);

        // Record as an expense to accounting
        const expense = {
            id: Date.now(),
            date: new Date().toISOString(),
            description: `صرف مستحقات المحاضر: ${trainer?.name || trainerId} - ${details}`,
            amount: amount,
            category: 'Payroll',
            addedBy: 'System'
        };

        const expenses = Storage.get('expenses') || [];
        expenses.unshift(expense);
        Storage.save('expenses', expenses);

        // Log to Ledger
        if (window.AccountingCore) {
            window.AccountingCore.postJournal(expense.description, [
                { account_id: 5020, debit: amount, credit: 0 }, // Staff Salary Account
                { account_id: 1010, debit: 0, credit: amount }  // Cash Account
            ]);
        }

        return true;
    }
};

console.log('💰 Payroll Engine Loaded: Financial Integrity Ready.');
