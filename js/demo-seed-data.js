/**
 * 🎯 EduMaster Pro - Advanced Demo Data Generator
 * Target: Branch 4 (فرع 4 - مصر الجديدة)
 *
 * Uses the SAME data structure as the rest of the app so that
 * students, trainers and study_groups all appear correctly.
 */

window.DemoSeeder = {
    settings: {
        branchId: 4,
        branchName: 'فرع 4 - مصر الجديدة'
    },

    /* ──────────────────────────────────────────────────────────────
       MAIN ENTRY POINT
    ────────────────────────────────────────────────────────────── */
    async seed() {
        console.clear();
        console.log(`🚀 Starting Seeder for ${this.settings.branchName}...`);

        try {
            this.ensureBranch();

            const trainers = this.seedTrainers();
            console.log('✅ Trainers seeded:', trainers.length);

            const groups = this.seedGroups(trainers);
            console.log('✅ Groups seeded:', groups.length);

            const students = this.seedStudents(groups);
            console.log('✅ Students seeded:', students.length);

            this.seedPayments(students, groups);
            console.log('✅ Payments recorded');

            this.seedAttendance(students, groups);
            console.log('✅ Attendance simulated');

            this.printFinalReport();

            if (typeof Toast !== 'undefined')
                Toast.show('✔ تمت عملية ملء بيانات فرع 4 بنجاح', 'success');

            return true;
        } catch (error) {
            console.error('❌ Seeding Failed:', error);
            if (typeof Toast !== 'undefined')
                Toast.show('حدث خطأ أثناء توليد البيانات: ' + error.message, 'error');
            return false;
        }
    },

    /* ──────────────────────────────────────────────────────────────
       1. BRANCH
    ────────────────────────────────────────────────────────────── */
    ensureBranch() {
        const branches = Storage.get('branches') || [];
        if (!branches.find(b => b.id === this.settings.branchId)) {
            branches.push({
                id: this.settings.branchId,
                name: this.settings.branchName,
                address: 'مصر الجديدة - ميدان الكربة',
                phone: '01098765432',
                manager: 'أ. منى عبد العزيز',
                is_active: true,
                is_demo: true,
                created_at: new Date().toISOString()
            });
            Storage.save('branches', branches);
        }
    },

    /* ──────────────────────────────────────────────────────────────
       2. TRAINERS  (same structure as trainers.js seed)
    ────────────────────────────────────────────────────────────── */
    seedTrainers() {
        const existing = Storage.get('trainers') || [];
        const base = Date.now();

        const newTrainers = [
            {
                id: base + 1,
                name: 'أ. منى عبد العزيز',
                phone: '01001122334',
                specialty: 'رياضيات - تفاضل وتكامل',
                trainerCode: 'T-B4-01',
                contractType: 'full-time',
                status: 'Active',
                paymentMode: 'fixed',
                paymentValue: 6500,
                paymentRatio: 0,
                branch_id: this.settings.branchId,
                is_demo: true
            },
            {
                id: base + 2,
                name: 'د. أحمد سامي',
                phone: '01112233445',
                specialty: 'General English',
                trainerCode: 'T-B4-02',
                contractType: 'part-time',
                status: 'Active',
                paymentMode: 'ratio',
                paymentValue: 0,
                paymentRatio: 25,
                branch_id: this.settings.branchId,
                is_demo: true
            },
            {
                id: base + 3,
                name: 'أ. سارة محمود',
                phone: '01223344556',
                specialty: 'كيمياء وأحياء',
                trainerCode: 'T-B4-03',
                contractType: 'freelance',
                status: 'Active',
                paymentMode: 'fixed_ratio',
                paymentValue: 2000,
                paymentRatio: 15,
                branch_id: this.settings.branchId,
                is_demo: true
            }
        ];

        existing.push(...newTrainers);
        Storage.save('trainers', existing);
        return newTrainers;
    },

    /* ──────────────────────────────────────────────────────────────
       3. STUDY GROUPS  (same structure as groups.js seed → 'study_groups')
    ────────────────────────────────────────────────────────────── */
    seedGroups(trainers) {
        const existing = Storage.get('study_groups') || [];
        const base = Date.now() + 500;

        const newGroups = [
            {
                id: base + 1,
                name: 'مجموعة منى - رياضيات المستوى الأول',
                trainerId: trainers[0].id,
                day: 'Saturday',
                time: '10:00',
                startDate: '2026-03-15',
                students: [],
                branch_id: this.settings.branchId,
                is_demo: true
            },
            {
                id: base + 2,
                name: 'مجموعة منى - رياضيات المستوى الثاني',
                trainerId: trainers[0].id,
                day: 'Monday',
                time: '12:00',
                startDate: '2026-03-17',
                students: [],
                branch_id: this.settings.branchId,
                is_demo: true
            },
            {
                id: base + 3,
                name: 'جروب الإنجليزي العام - د. أحمد',
                trainerId: trainers[1].id,
                day: 'Sunday',
                time: '16:00',
                startDate: '2026-03-16',
                students: [],
                branch_id: this.settings.branchId,
                is_demo: true
            },
            {
                id: base + 4,
                name: 'كيمياء وأحياء - أ. سارة',
                trainerId: trainers[2].id,
                day: 'Wednesday',
                time: '14:00',
                startDate: '2026-03-18',
                students: [],
                branch_id: this.settings.branchId,
                is_demo: true
            }
        ];

        existing.push(...newGroups);
        Storage.save('study_groups', existing);
        return newGroups;
    },

    /* ──────────────────────────────────────────────────────────────
       4. STUDENTS  (same structure as add-student → 'students')
         — assigns them to groups and enrolls them in study_groups
    ────────────────────────────────────────────────────────────── */
    seedStudents(groups) {
        const existing = Storage.get('students') || [];
        const base = Date.now() + 2000;

        const raw = [
            // مجموعة منى 1 (4 طلاب)
            { name: 'عمر خالد عبد العزيز', phone: '01001234567', groupIdx: 0 },
            { name: 'ليلى محمود حسن', phone: '01098765432', groupIdx: 0 },
            { name: 'ياسمين سمير علي', phone: '01287654321', groupIdx: 0 },
            { name: 'كريم طارق فوزي', phone: '01156789012', groupIdx: 0 },
            // مجموعة منى 2 (3 طلاب)
            { name: 'دينا أحمد مصطفى', phone: '01212345678', groupIdx: 1 },
            { name: 'مصطفى سعد إبراهيم', phone: '01334455667', groupIdx: 1 },
            { name: 'هبة الله عبد الرحمن', phone: '01009988776', groupIdx: 1 },
            // جروب الإنجليزي (5 طلاب)
            { name: 'يوسف أحمد كمال', phone: '01112345678', groupIdx: 2 },
            { name: 'نور الدين علي حسين', phone: '01551234567', groupIdx: 2 },
            { name: 'رنا وليد شاكر', phone: '01011223344', groupIdx: 2 },
            { name: 'أحمد مجدي رضا', phone: '01566778899', groupIdx: 2 },
            { name: 'منار إبراهيم الشافعي', phone: '01223344512', groupIdx: 2 },
            // كيمياء وأحياء (3 طلاب)
            { name: 'سارة محمد الحسين', phone: '01223456789', groupIdx: 3 },
            { name: 'عبد الرحمن فاروق', phone: '01445566778', groupIdx: 3 },
            { name: 'مريم جمال الدين', phone: '01188990011', groupIdx: 3 }
        ];

        const newStudents = raw.map((s, i) => ({
            id: base + i,
            name: s.name,
            phone: s.phone,
            branch_id: this.settings.branchId,
            group: groups[s.groupIdx]?.name || '',
            group_id: groups[s.groupIdx]?.id || null,
            group_ids: [groups[s.groupIdx]?.id].filter(Boolean),
            status: 'Active',
            enrollmentDate: new Date().toISOString().split('T')[0],
            balance: 0,
            is_demo: true
        }));

        existing.push(...newStudents);
        Storage.save('students', existing);

        // ── Enroll students into study_groups ──
        const allGroups = Storage.get('study_groups') || [];
        newStudents.forEach(s => {
            const grp = allGroups.find(g => g.id === s.group_id);
            if (grp) {
                if (!grp.students) grp.students = [];
                if (!grp.students.includes(s.id.toString()))
                    grp.students.push(s.id.toString());
            }
        });
        Storage.save('study_groups', allGroups);

        return newStudents;
    },

    /* ──────────────────────────────────────────────────────────────
       5. PAYMENTS  (via AccountingCore)
    ────────────────────────────────────────────────────────────── */
    seedPayments(students, groups) {
        const prices = [1200, 1200, 1000, 900]; // per group
        const partialPay = [0.5, 1, 0.75, 1]; // fraction paid

        students.forEach(s => {
            const gIdx = groups.findIndex(g => g.id === s.group_id);
            if (gIdx === -1) return;
            const amount = Math.round(prices[gIdx] * partialPay[gIdx]);
            if (amount <= 0) return;

            AccountingCore.recordIncome({
                category: 'student_fees',
                amount,
                description: `رسوم دراسية: ${s.name} - ${s.group}`,
                student_id: s.id,
                student_name: s.name,
                branch_id: this.settings.branchId,
                account_type: 'cash',
                is_demo: true
            });

            // Update student balance
            const allStudents = Storage.get('students') || [];
            const rec = allStudents.find(x => x.id === s.id);
            if (rec) { rec.balance = (rec.balance || 0) + amount; }
            Storage.save('students', allStudents);
        });
    },

    /* ──────────────────────────────────────────────────────────────
       6. ATTENDANCE  (via 'attendance_records')
    ────────────────────────────────────────────────────────────── */
    seedAttendance(students, groups) {
        const records = Storage.get('attendance_records') || [];
        const today = new Date();

        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
            const d = new Date(today);
            d.setDate(today.getDate() - dayOffset);
            const dateStr = d.toISOString().split('T')[0];

            students.forEach(s => {
                const rand = Math.random();
                const status = rand > 0.15 ? 'present' : (rand > 0.08 ? 'late' : 'absent');
                records.push({
                    id: Date.now() + Math.random() * 1000,
                    student_id: s.id,
                    student_name: s.name,
                    group_id: s.group_id,
                    group_name: s.group,
                    branch_id: this.settings.branchId,
                    date: dateStr,
                    time: status !== 'absent' ? `${9 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : '--:--',
                    status,
                    scan_method: 'Manual',
                    is_demo: true
                });
            });
        }

        Storage.save('attendance_records', records);
    },

    /* ──────────────────────────────────────────────────────────────
       7. CLEANUP
    ────────────────────────────────────────────────────────────── */
    cleanup() {
        if (!confirm('هل تريد حذف جميع البيانات التجريبية لفرع 4؟')) return;

        const keys = ['students', 'trainers', 'study_groups', 'transactions',
            'journal_entries', 'attendance_records', 'invoices'];

        keys.forEach(key => {
            const data = Storage.get(key) || [];
            Storage.save(key, data.filter(item => !item.is_demo));
        });

        const branches = Storage.get('branches') || [];
        Storage.save('branches', branches.filter(b => !(b.id === 4 && b.is_demo)));

        if (typeof Toast !== 'undefined')
            Toast.show('تم تنظيف بيانات فرع 4 بنجاح', 'success');

        setTimeout(() => location.reload(), 1200);
    },

    /* ──────────────────────────────────────────────────────────────
       8. STATS (for the generator page)
    ────────────────────────────────────────────────────────────── */
    getStats() {
        const bid = this.settings.branchId;
        return {
            students: (Storage.get('students') || []).filter(s => s.branch_id === bid && s.is_demo).length,
            trainers: (Storage.get('trainers') || []).filter(t => t.branch_id === bid && t.is_demo).length,
            groups: (Storage.get('study_groups') || []).filter(g => g.branch_id === bid && g.is_demo).length,
            transactions: (Storage.get('transactions') || []).filter(t => t.branch_id === bid && t.is_demo).length,
            books: 0 // kept for backward compat with the HTML
        };
    },

    /* ──────────────────────────────────────────────────────────────
       9. REPORT
    ────────────────────────────────────────────────────────────── */
    printFinalReport() {
        const bid = this.settings.branchId;
        const students = (Storage.get('students') || []).filter(s => s.branch_id === bid && s.is_demo);
        const groups = (Storage.get('study_groups') || []).filter(g => g.branch_id === bid && g.is_demo);
        const trainers = (Storage.get('trainers') || []).filter(t => t.branch_id === bid && t.is_demo);
        const txns = (Storage.get('transactions') || []).filter(t => t.branch_id === bid && t.is_demo);
        const revenue = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

        console.log(`
============================================
📊 تقرير توليد البيانات (فرع 4)
============================================
✔ مدرسين:   ${trainers.length}
✔ مجموعات:  ${groups.length}
✔ طلاب:     ${students.length}
✔ إيرادات:  ${revenue.toLocaleString()} ج.م
============================================
        `);
    }
};

console.log('✅ DemoSeeder loaded — call DemoSeeder.seed() to populate Branch 4');
