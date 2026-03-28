/**
 * Enterprise Accounting Core Engine (Global Version)
 * Enhanced with Budgeting & Running Balances
 */
window.AccountingCore = {
    // --- UNIFIED FINANCIAL CORE (GENIUS ACCOUNTING ENGINE) ---

    _syncPost(type, data) {
        const timestamp = Date.now();
        const date = this._normalizeDate(data.date || new Date().toISOString().split('T')[0]);
        const branchId = parseInt(data.branch_id || (window.Permissions ? Permissions.getActiveBranchId() : 1) || 1);

        const transaction = {
            id: timestamp,
            type: type,
            category: data.category,
            amount: parseFloat(data.amount),
            description: data.description,
            receipt_no: data.receipt_no || '',
            student_id: data.student_id || null,
            student_name: data.student_name || '',
            branch_id: branchId,
            account_type: data.account_type || 'cash',
            date: date,
            created_by: (window.Permissions && Permissions.getCurrentUser()) ? Permissions.getCurrentUser().name : 'admin',
            linked_je: 'JE-' + timestamp
        };

        const mainAccountId = transaction.account_type === 'bank' ? 1002 : 1001;
        const offsetAccountId = type === 'income' ? 4001 : 5001;

        const lines = type === 'income'
            ? [
                { account_id: mainAccountId, debit: transaction.amount, credit: 0 },
                { account_id: offsetAccountId, debit: 0, credit: transaction.amount }
            ]
            : [
                { account_id: offsetAccountId, debit: transaction.amount, credit: 0 },
                { account_id: mainAccountId, debit: 0, credit: transaction.amount }
            ];

        try {
            const transactions = Storage.get('transactions') || [];
            const journal = Storage.get('journal_entries') || [];

            transactions.push(transaction);
            journal.unshift({
                id: 'JE-' + timestamp,
                date: date,
                description: (type === 'income' ? 'وارد: ' : 'منصرف: ') + data.description,
                branchId: branchId,
                status: 'Posted',
                created_by: transaction.created_by,
                lines: lines,
                linked_t: timestamp
            });

            Storage.save('transactions', transactions);
            Storage.save('journal_entries', journal);
            this.updateBalances(lines);

            // Non-critical background tasks
            setTimeout(() => {
                if (typeof InvoiceGenerator !== 'undefined' && type === 'income') {
                    InvoiceGenerator.autoGenerateForTransaction(transaction);
                }
            }, 100);

            const actionLabel = type === 'income' ? 'تسجيل إيراد' : 'تسجيل مصروف';
            const detailLabel = (type === 'income' ? 'إيراد: ' : 'مصروف: ') + transaction.amount;
            this.logAudit(actionLabel, timestamp, detailLabel);

            // ☁️ CLOUD SYNC: Push financial pulse to Firebase
            if (window.Cloud && window.Cloud.pushFinancialRecord) {
                setTimeout(() => {
                    try {
                        window.Cloud.pushFinancialRecord(branchId, {
                            ...transaction,
                            id: timestamp,
                            syncTime: new Date().toISOString()
                        });
                    } catch (e) {
                        console.warn("Cloud Sync Pulse (Financial) Failed:", e);
                    }
                }, 500);
            }

            return transaction;
        } catch (e) {
            console.error("Critical Sync Failure:", e);
            throw e;
        }
    },

    /**
     * EMERGENCY RECOVERY: Pull missing transactions from Journal
     */
    syncFromJournal() {
        const transactions = Storage.get('transactions') || [];
        const journal = Storage.get('journal_entries') || [];
        let count = 0;

        journal.forEach(entry => {
            const tId = entry.linked_t;
            if (tId && !transactions.find(t => t.id == tId)) {
                // Recover basic transaction data from JE
                const type = entry.description.startsWith('وارد') ? 'income' : 'expense';
                const mainLine = entry.lines.find(l => (type === 'income' ? l.debit > 0 : l.credit > 0) && [1001, 1002].includes(l.account_id));

                if (mainLine) {
                    transactions.push({
                        id: tId,
                        type: type,
                        category: 'مسترجع من النظام',
                        amount: Math.abs(mainLine.debit || mainLine.credit),
                        description: entry.description.replace('وارد: ', '').replace('منصرف: ', ''),
                        branch_id: entry.branchId,
                        account_type: mainLine.account_id === 1002 ? 'bank' : 'cash',
                        date: entry.date,
                        linked_je: entry.id
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
            Storage.save('transactions', transactions);
            console.log(`✅ Recovered ${count} transactions from Journal`);
        }
        return count;
    },

    /**
     * Record income transaction
     */
    recordIncome(data) { return this._syncPost('income', data); },

    /**
     * Record expense transaction
     */
    recordExpense(data) { return this._syncPost('expense', data); },

    /**
     * The Master Stats Function (Period-Aware & Robust)
     */
    getUnifiedStats(branchId = null, year = null, month = null) {
        const now = new Date();
        const targetYear = (year || now.getFullYear()).toString();
        let targetMonth = (month || (now.getMonth() + 1)).toString();
        if (targetMonth.length === 1) targetMonth = '0' + targetMonth;

        const periodKeyPart = `-${targetYear}-${targetMonth}-`; // Match Year-Month

        // 1. Get Transactions for the period
        const startDate = `${targetYear}-${targetMonth}-01`;
        const lastDay = new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate();
        const endDate = `${targetYear}-${targetMonth}-${String(lastDay).padStart(2, '0')}`;

        const transactions = this.getTransactions({
            branchId,
            startDate,
            endDate
        });

        // 2. Robust Opening Balance Lookup (The Nuclear Fix)
        const openingBalances = Storage.get('opening_balances') || {};
        let totalOB = 0;

        // Convert branchId to string for comparison, handle null/SuperAdmin
        const bid = (branchId && branchId !== 'null' && branchId !== '') ? String(branchId) : null;

        Object.keys(openingBalances).forEach(key => {
            // Logic: Key must contain Year-Month and 'cash'
            const isMatch = key.includes(periodKeyPart) && key.includes('cash');

            if (isMatch) {
                if (bid) {
                    // If we have a specific branch, it must start with that branch ID
                    if (key.startsWith(bid + '-')) {
                        totalOB = parseFloat(openingBalances[key] || 0);
                    }
                } else {
                    // SuperAdmin: Sum all branches for this period
                    totalOB += parseFloat(openingBalances[key] || 0);
                }
            }
        });

        // 3. Totals
        let income = 0, expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += (parseFloat(t.amount) || 0);
            else expense += (parseFloat(t.amount) || 0);
        });

        const net = income - expense;
        return {
            opening: totalOB,
            income: income,
            expense: expense,
            net: net,
            balance: totalOB + net
        };
    },

    /**
     * Generate Profit/Loss report (now uses unified stats)
     */
    generateProfitLoss(branchId = null, year = null, month = null) {
        const stats = this.getUnifiedStats(branchId, year, month);
        return {
            summary: {
                totalOpening: stats.opening,
                totalRevenue: stats.income,
                totalExpense: stats.expense,
                netProfit: stats.net,
                currentBalance: stats.balance,
                margin: stats.income > 0 ? (stats.net / stats.income) * 100 : 0
            }
        };
    },

    /**
     * Get opening balance for a specific context
     */
    getOpeningBalance(branchId, year, month, accountType = 'cash') {
        const balances = Storage.get('opening_balances') || {};
        const m = String(month).padStart(2, '0');
        const key = `${branchId}-${year}-${m}-${accountType}`;
        return parseFloat(balances[key] || 0);
    },

    /**
     * Set opening balance (Robust Version)
     */
    setOpeningBalance(branchId, year, month, accountType, amount) {
        const balances = Storage.get('opening_balances') || {};
        const m = String(month).padStart(2, '0');
        const key = `${branchId}-${year}-${m}-${accountType}`;
        balances[key] = parseFloat(amount);
        Storage.save('opening_balances', balances);
        this.logAudit('OPENING_BALANCE_SET', key, `رصيد افتتاح للفرع: ${amount} (شهر ${m}/${year})`);
        return true;
    },

    /**
     * Delete a transaction and handle recalculations if needed
     */
    deleteTransaction(id) {
        const transactions = Storage.get('transactions') || [];
        const journal = Storage.get('journal_entries') || [];

        const tIdx = transactions.findIndex(t => t.id == id);
        if (tIdx === -1) return false;

        const linkedJE = transactions[tIdx].linked_je;

        // Reverse Balances before deleting
        const je = journal.find(e => e.id === linkedJE);
        if (je) {
            const reverseLines = je.lines.map(l => ({
                account_id: l.account_id,
                debit: l.credit,
                credit: l.debit
            }));
            this.updateBalances(reverseLines);
        }

        // Filter out both
        const newT = transactions.filter(t => t.id != id);
        const newJ = journal.filter(e => e.id !== linkedJE);

        Storage.save('transactions', newT);
        Storage.save('journal_entries', newJ);

        this.logAudit('RECORD_DELETED', id, 'حذف معاملة وقيدها المرتبط');
        return true;
    },

    /**
     * Normalize date string to ensure consistent YYYY-MM-DD format
     */
    _normalizeDate(d) {
        if (!d) return '';
        const parts = d.split('-');
        if (parts.length < 3) return d;
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    },

    /**
     * Get all transactions with robust filtering
     */
    getTransactions(filters = {}) {
        let transactions = Storage.get('transactions') || [];
        const fStart = filters.startDate ? this._normalizeDate(filters.startDate) : null;
        const fEnd = filters.endDate ? this._normalizeDate(filters.endDate) : null;

        // 1. Filter by Branch
        if (filters.branchId !== undefined && filters.branchId !== null && filters.branchId !== 'null' && filters.branchId !== '') {
            const targetId = parseInt(filters.branchId);
            transactions = transactions.filter(t => parseInt(t.branch_id || t.branchId) === targetId);
        }

        // 2. Filter by Account Type
        if (filters.accountType) {
            transactions = transactions.filter(t => (t.account_type || 'cash') === filters.accountType);
        }

        // 3. Filter by Date Range (Normalized)
        if (fStart) {
            transactions = transactions.filter(t => this._normalizeDate(t.date) >= fStart);
        }
        if (fEnd) {
            transactions = transactions.filter(t => this._normalizeDate(t.date) <= fEnd);
        }
        if (filters.type) {
            transactions = transactions.filter(t => t.type === filters.type);
        }

        // 4. Filter by Student ID
        if (filters.studentId || filters.student_id) {
            const sid = filters.studentId || filters.student_id;
            transactions = transactions.filter(t => t.student_id == sid || t.studentId == sid);
        }

        // Sort by date then by ID to ensure stable chronological order
        transactions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA - dateB !== 0) return dateA - dateB;
            // If same date, sort by ID (which is timestamp) to maintain entry order
            return (a.id || 0) - (b.id || 0);
        });

        // Calculate Running Balance if requested
        if (filters.calculateBalance) {
            const year = filters.year || new Date().getFullYear();
            const month = filters.month || (new Date().getMonth() + 1);
            let currentBalance = this.getOpeningBalance(filters.branchId, year, month, filters.accountType || 'cash');

            transactions = transactions.map(t => {
                if (t.type === 'income') {
                    currentBalance += t.amount;
                } else {
                    currentBalance -= t.amount;
                }
                return { ...t, running_balance: currentBalance };
            });

        }

        // Only reverse if explicitly requested (usually for "Recent Activity" lists)
        if (filters.reverse) {
            transactions.reverse();
        }

        return transactions;
    },

    /**
     * Generate monthly P&L report
     */
    generateMonthlyPL(year, month, branchId = null) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const transactions = this.getTransactions({ startDate, endDate, branchId });
        const openingBalance = this.getOpeningBalance(branchId, year, month, 'cash'); // Default to cash for now

        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        const currentBalance = openingBalance + netProfit;

        return {
            period: `${year}-${String(month).padStart(2, '0')}`,
            branchId: branchId,
            openingBalance,
            currentBalance,
            income: {
                total: totalIncome,
                byCategory: this.groupByCategory(income),
                transactions: income
            },
            expenses: {
                total: totalExpenses,
                byCategory: this.groupByCategory(expenses),
                transactions: expenses
            },
            netProfit: netProfit,
            profitMargin: totalIncome > 0 ? (netProfit / totalIncome * 100).toFixed(2) : 0
        };
    },

    /**
     * Generate yearly P&L report
     */
    generateYearlyPL(year, branchId = null) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const transactions = this.getTransactions({ startDate, endDate, branchId });

        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        // Monthly breakdown
        const monthlyData = [];
        for (let month = 1; month <= 12; month++) {
            const monthlyPL = this.generateMonthlyPL(year, month, branchId);
            monthlyData.push({
                month: month,
                income: monthlyPL.income.total,
                expenses: monthlyPL.expenses.total,
                netProfit: monthlyPL.netProfit,
                balance: monthlyPL.currentBalance
            });
        }

        return {
            year: year,
            branchId: branchId,
            income: {
                total: totalIncome,
                byCategory: this.groupByCategory(income),
                transactions: income
            },
            expenses: {
                total: totalExpenses,
                byCategory: this.groupByCategory(expenses),
                transactions: expenses
            },
            netProfit: netProfit,
            profitMargin: totalIncome > 0 ? (netProfit / totalIncome * 100).toFixed(2) : 0,
            monthlyBreakdown: monthlyData
        };
    },

    /**
     * Get branch balance
     */
    getBranchBalance(branchId) {
        const transactions = this.getTransactions({ branchId });

        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;

        return {
            branchId: branchId,
            totalIncome: totalIncome,
            totalExpenses: totalExpenses,
            balance: balance,
            transactionCount: transactions.length
        };
    },

    /**
     * Group transactions by category
     */
    groupByCategory(transactions) {
        const grouped = {};
        transactions.forEach(t => {
            if (!grouped[t.category]) {
                grouped[t.category] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            grouped[t.category].total += t.amount;
            grouped[t.category].count++;
            grouped[t.category].transactions.push(t);
        });
        return grouped;
    },

    /**
     * Get financial dashboard data
     */
    getDashboardData(branchId = null) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const monthlyPL = this.generateMonthlyPL(currentYear, currentMonth, branchId);
        const yearlyPL = this.generateYearlyPL(currentYear, branchId);

        return {
            currentMonth: monthlyPL,
            currentYear: yearlyPL,
            branchBalance: branchId ? this.getBranchBalance(branchId) : null
        };
    },

    postJournal(description, lines, branchId = null) {
        // Manual journal entry (for advanced users)
        const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`القيد غير متوازن! مجموع المدين: ${totalDebit}, مجموع الدائن: ${totalCredit}`);
        }

        const finalBranchId = branchId || (window.Permissions ? Permissions.getActiveBranchId() : 1) || 1;
        const journal = Storage.get('journal_entries') || [];
        const entryId = 'JE-' + Date.now();

        const newEntry = {
            id: entryId,
            date: new Date().toISOString().split('T')[0],
            description,
            branchId: parseInt(finalBranchId),
            created_by: (window.Permissions && Permissions.getCurrentUser()) ? Permissions.getCurrentUser().name : 'admin',
            status: 'Posted',
            lines: lines.map(l => ({
                account_id: parseInt(l.account_id),
                debit: parseFloat(l.debit) || 0,
                credit: parseFloat(l.credit) || 0
            }))
        };

        this.updateBalances(newEntry.lines);
        journal.unshift(newEntry);
        Storage.save('journal_entries', journal);
        this.logAudit('POST_JOURNAL', entryId, `قيد: ${description} (الفرع: ${finalBranchId})`);
        return entryId;
    },

    resetFinancials() {
        Storage.save('journal_entries', []);
        Storage.save('transactions', []);
        Storage.save('opening_balances', {});
        Storage.save('invoices', []);

        const coa = Storage.get('coa') || [];
        coa.forEach(a => {
            a.balance = 0;
            // Ensure core accounts exist and are clean
            if (a.id == 1001) a.name = "الخزينة";
            if (a.id == 1002) a.name = "البنك";
        });
        Storage.save('coa', coa);
        this.logAudit('FINANCIALS_RESET', 'ALL', 'تصفير كافة السجلات المالية والقيود والحسابات');
        return true;
    },

    /**
     * Self-Repairing COA Initialization
     */
    _checkAndInitCOA() {
        const coa = Storage.get('coa') || [];
        const required = [
            { id: 1001, name: 'الخزينة', category: 'Asset' },
            { id: 1002, name: 'البنك', category: 'Asset' },
            { id: 4001, name: 'الإيرادات العامة', category: 'Revenue' },
            { id: 5001, name: 'المصروفات العامة', category: 'Expense' }
        ];

        let changed = false;
        required.forEach(req => {
            if (!coa.find(a => a.id == req.id)) {
                coa.push({ ...req, balance: 0 });
                changed = true;
            }
        });

        if (changed || coa.length === 0) {
            Storage.save('coa', coa);
        }
    },

    updateBalances(lines) {
        this._checkAndInitCOA();
        const coa = Storage.get('coa') || [];
        lines.forEach(line => {
            const acc = coa.find(a => a.id == line.account_id);
            if (acc) {
                const debit = parseFloat(line.debit) || 0;
                const credit = parseFloat(line.credit) || 0;
                if (['Asset', 'Expense'].includes(acc.category)) {
                    acc.balance = (parseFloat(acc.balance) || 0) + (debit - credit);
                } else {
                    acc.balance = (parseFloat(acc.balance) || 0) + (credit - debit);
                }
            }
        });
        Storage.save('coa', coa);
    },

    generateBalanceSheet() {
        const coa = Storage.get('coa') || [];
        return {
            assets: coa.filter(a => a.category === 'Asset'),
            liabilities: coa.filter(a => a.category === 'Liability'),
            equity: coa.filter(a => a.category === 'Equity'),
            totals: {
                assets: coa.filter(a => a.category === 'Asset').reduce((s, a) => s + parseFloat(a.balance || 0), 0),
                liabilities: coa.filter(a => a.category === 'Liability').reduce((s, a) => s + parseFloat(a.balance || 0), 0),
                equity: coa.filter(a => a.category === 'Equity').reduce((s, a) => s + parseFloat(a.balance || 0), 0)
            }
        };
    },

    // Unified P&L calculation used by all UI components
    // generateProfitLoss is defined above at line 113

    logAudit(action, recordId, details) {
        const audit = Storage.get('audit_logs') || [];
        audit.unshift({
            id: Date.now(),
            user: (window.Permissions && Permissions.getCurrentUser()) ? Permissions.getCurrentUser().name : 'admin',
            action,
            recordId,
            details,
            timestamp: new Date().toISOString()
        });
        Storage.save('audit_logs', audit.slice(0, 100)); // Keep only recent 100 logs
    },

    getCategoryLabel(category) {
        const customLabels = Storage.get('accounting_categories') || {};
        const labels = {
            'student_fees': 'رسوم طلاب', 'books': 'كتب', 'subscriptions': 'اشتراكات',
            'salaries': 'رواتب', 'suppliers': 'موردين', 'rent': 'إيجار',
            'utilities': 'مرافق', 'gas': 'غاز', 'book_purchase': 'شراء كتب',
            'other': 'أخرى', ...customLabels
        };
        return labels[category] || category;
    },

    /**
     * Get Daily Summary for a specific branch and date
     */
    getDailySummary(branchId, date) {
        const transactions = this.getTransactions({
            branchId,
            startDate: date,
            endDate: date
        });

        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        // Calculate opening balance for this specific day
        const openingBalance = this.getDailyOpeningBalance(branchId, date);

        return {
            date,
            branchId,
            openingBalance,
            income,
            expense,
            net: income - expense,
            expectedClosing: openingBalance + (income - expense),
            transactions
        };
    },

    /**
     * Calculate opening balance for a specific day
     * Rule: Monthly OB + Net transactions from start of month until (date - 1)
     */
    getDailyOpeningBalance(branchId, date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;

        // Get target date minus 1 day
        const targetDate = new Date(d);
        targetDate.setDate(d.getDate() - 1);
        const yesterdayStr = targetDate.toISOString().split('T')[0];

        // 1. Initial Monthly Opening Balance
        const monthlyOB = this.getOpeningBalance(branchId, year, month, 'cash');

        // 2. If it's the 1st of the month, the daily OB is the monthly OB
        if (date === startOfMonth) return monthlyOB;

        // 3. Sum all transactions from 1st to yesterday
        const transactions = this.getTransactions({
            branchId,
            startDate: startOfMonth,
            endDate: yesterdayStr,
            accountType: 'cash'
        });

        const monthNetUntilToday = transactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);

        return monthlyOB + monthNetUntilToday;
    },

    /**
     * Record a Closing Session
     */
    recordClosing(branchId, date, expected, actual, notes) {
        const sessions = Storage.get('closing_sessions') || [];
        const diff = actual - expected;
        const sessionId = Date.now();

        const session = {
            id: sessionId,
            branchId,
            date,
            expected,
            actual,
            difference: diff,
            notes,
            status: 'Closed',
            timestamp: new Date().toISOString(),
            user: (window.Permissions && Permissions.getCurrentUser()) ? Permissions.getCurrentUser().name : 'admin'
        };

        sessions.unshift(session);
        Storage.save('closing_sessions', sessions);

        // If there's a difference, record an adjustment journal entry
        if (Math.abs(diff) > 0) {
            const adjType = diff > 0 ? 'Shortage/Overage' : 'Shortage/Overage';
            const lines = diff > 0
                ? [
                    { account_id: 1001, debit: diff, credit: 0 }, // Cash increase
                    { account_id: 4001, debit: 0, credit: diff }  // Miscellaneous Revenue
                ]
                : [
                    { account_id: 5001, debit: Math.abs(diff), credit: 0 }, // Miscellaneous Expense
                    { account_id: 1001, debit: 0, credit: Math.abs(diff) }  // Cash decrease
                ];

            this.postJournal(`تسوية فرق إغلاق يومية (${date}): ${notes}`, lines, branchId);
        }

        this.logAudit('DAY_CLOSED', sessionId, `إغلاق يومية ${date} بفرع ${branchId}. الفرق: ${diff}`);
        return session;
    },

    /**
     * Transfer Funds from Branch Cash to Main Safe/Bank
     */
    transferFunds(branchId, amount, destination = 'bank') {
        const sourceAcc = 1001; // Branch Cash
        const destAcc = destination === 'bank' ? 1002 : 1003; // Bank or Main Safe

        // Ensure Destination Account Exists in COA
        if (destination === 'safe') {
            const coa = Storage.get('coa') || [];
            if (!coa.find(a => a.id == 1003)) {
                coa.push({ id: 1003, name: 'الخزينة الرئيسية (الخزنة)', category: 'Asset', balance: 0 });
                Storage.save('coa', coa);
            }
        }

        const lines = [
            { account_id: destAcc, debit: amount, credit: 0 },
            { account_id: sourceAcc, debit: 0, credit: amount }
        ];

        const jeId = this.postJournal(`تحويل نقدية من الفرع (${branchId}) إلى ${destination === 'bank' ? 'البنك' : 'الخزنة الرئيسية'}`, lines, branchId);
        this.logAudit('FUNDS_TRANSFERRED', jeId, `تحويل ${amount} إلى ${destination}`);
        return jeId;
    },

    /**
     * Get real-time balance for a specific student
     * Calculates: Invoices (Debt) - Payments (Credit)
     */
    getStudentBalance(studentId) {
        const transactions = Storage.get('transactions') || [];
        const studentTransactions = transactions.filter(t => t.student_id == studentId);

        let totalPaid = 0;
        studentTransactions.forEach(t => {
            if (t.type === 'income') totalPaid += (parseFloat(t.amount) || 0);
        });

        // Sum up invoices (from a potential invoices store)
        const invoices = Storage.get('invoices') || [];
        let totalDebt = 0;
        invoices.filter(inv => inv.student_id == studentId).forEach(inv => {
            totalDebt += (parseFloat(inv.total) || 0);
        });

        return {
            paid: totalPaid,
            debt: totalDebt,
            balance: totalDebt - totalPaid // Positive means they owe money
        };
    }
};

console.log('💎 Genius Accounting Core (Unified) Active');
