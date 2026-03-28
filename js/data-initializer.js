/**
 * Data Initialization Script
 * Seeds the system with sample data for demonstration
 */

window.DataInitializer = {
    initialize: function () {
        // Check if already initialized
        if (Storage.get('data_initialized')) {
            console.log('✅ Data already initialized');
            return;
        }

        console.log('🔄 Initializing sample data...');

        this.initializeBranches();
        this.initializeStudents();
        this.initializeClasses();
        this.initializeChartOfAccounts();
        this.initializeSampleTransactions();
        this.initializeUsers();

        Storage.set('data_initialized', true);
        console.log('✅ Sample data initialized successfully');
    },

    initializeBranches: function () {
        const branches = [
            { id: 1, name: 'الفرع الرئيسي', location: 'القاهرة', manager: 'أحمد محمد', phone: '01012345678', status: 'active' },
            { id: 2, name: 'فرع الجيزة', location: 'الجيزة', manager: 'محمد علي', phone: '01112345678', status: 'active' },
            { id: 3, name: 'فرع الإسكندرية', location: 'الإسكندرية', manager: 'علي حسن', phone: '01212345678', status: 'active' },
            { id: 4, name: 'فرع المنصورة', location: 'المنصورة', manager: 'حسن محمود', phone: '01312345678', status: 'active' },
            { id: 5, name: 'فرع طنطا', location: 'طنطا', manager: 'محمود سعيد', phone: '01412345678', status: 'active' },
            { id: 6, name: 'فرع أسيوط', location: 'أسيوط', manager: 'سعيد أحمد', phone: '01512345678', status: 'active' },
            { id: 7, name: 'فرع الأقصر', location: 'الأقصر', manager: 'أحمد سعيد', phone: '01612345678', status: 'active' },
            { id: 8, name: 'فرع أسوان', location: 'أسوان', manager: 'سعيد محمد', phone: '01712345678', status: 'active' }
        ];
        Storage.set('branches', branches);
    },

    initializeStudents: function () {
        const students = [
            { id: 1, name: 'أحمد محمد علي', email: 'ahmed@example.com', phone: '01001234567', branch_id: 1, status: 'active', enrollment_date: '2024-01-15' },
            { id: 2, name: 'محمد حسن محمود', email: 'mohamed@example.com', phone: '01101234567', branch_id: 1, status: 'active', enrollment_date: '2024-01-20' },
            { id: 3, name: 'فاطمة أحمد سعيد', email: 'fatma@example.com', phone: '01201234567', branch_id: 2, status: 'active', enrollment_date: '2024-02-01' },
            { id: 4, name: 'علي محمود حسن', email: 'ali@example.com', phone: '01301234567', branch_id: 2, status: 'active', enrollment_date: '2024-02-05' },
            { id: 5, name: 'سارة محمد أحمد', email: 'sara@example.com', phone: '01401234567', branch_id: 3, status: 'active', enrollment_date: '2024-02-10' },
            { id: 6, name: 'خالد علي محمد', email: 'khaled@example.com', phone: '01501234567', branch_id: 3, status: 'active', enrollment_date: '2024-03-01' },
            { id: 7, name: 'نور الدين حسن', email: 'nour@example.com', phone: '01601234567', branch_id: 4, status: 'active', enrollment_date: '2024-03-05' },
            { id: 8, name: 'ياسمين محمود', email: 'yasmin@example.com', phone: '01701234567', branch_id: 4, status: 'active', enrollment_date: '2024-03-10' },
            { id: 9, name: 'عمر سعيد أحمد', email: 'omar@example.com', phone: '01801234567', branch_id: 5, status: 'active', enrollment_date: '2024-04-01' },
            { id: 10, name: 'مريم علي حسن', email: 'mariam@example.com', phone: '01901234567', branch_id: 5, status: 'active', enrollment_date: '2024-04-05' }
        ];
        Storage.set('students', students);
    },

    initializeClasses: function () {
        const classes = [
            { id: 1, name: 'الصف الأول الثانوي - أ', teacher_id: 1, branch_id: 1, start_time: '09:00', capacity: 30 },
            { id: 2, name: 'الصف الأول الثانوي - ب', teacher_id: 2, branch_id: 1, start_time: '11:00', capacity: 30 },
            { id: 3, name: 'الصف الثاني الثانوي - أ', teacher_id: 3, branch_id: 2, start_time: '09:00', capacity: 25 },
            { id: 4, name: 'الصف الثاني الثانوي - ب', teacher_id: 4, branch_id: 2, start_time: '11:00', capacity: 25 },
            { id: 5, name: 'الصف الثالث الثانوي - أ', teacher_id: 5, branch_id: 3, start_time: '09:00', capacity: 20 }
        ];
        Storage.set('classes', classes);
    },

    initializeChartOfAccounts: function () {
        const coa = [
            // Assets
            { id: 1001, code: '1001', name: 'النقدية', category: 'Asset', balance: 100000 },
            { id: 1002, code: '1002', name: 'البنك', category: 'Asset', balance: 500000 },
            { id: 1003, code: '1003', name: 'المخزون', category: 'Asset', balance: 50000 },

            // Liabilities
            { id: 2001, code: '2001', name: 'الموردين', category: 'Liability', balance: 30000 },
            { id: 2002, code: '2002', name: 'قروض', category: 'Liability', balance: 100000 },

            // Equity
            { id: 3001, code: '3001', name: 'رأس المال', category: 'Equity', balance: 500000 },

            // Revenue
            { id: 4001, code: '4001', name: 'إيرادات الرسوم الدراسية', category: 'Revenue', balance: 0 },
            { id: 4002, code: '4002', name: 'إيرادات الكتب', category: 'Revenue', balance: 0 },

            // Expenses
            { id: 5001, code: '5001', name: 'الرواتب', category: 'Expense', balance: 0 },
            { id: 5002, code: '5002', name: 'الإيجار', category: 'Expense', balance: 0 },
            { id: 5003, code: '5003', name: 'المرافق', category: 'Expense', balance: 0 }
        ];
        Storage.set('coa', coa);
    },

    initializeSampleTransactions: function () {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Generate sample transactions for the last 3 months
        const transactions = [];

        for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
            const month = currentMonth - monthOffset;
            const year = month > 0 ? currentYear : currentYear - 1;
            const adjustedMonth = month > 0 ? month : 12 + month;

            // Income transactions
            for (let i = 1; i <= 5; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = `${year}-${String(adjustedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                transactions.push({
                    id: Date.now() + transactions.length,
                    type: 'income',
                    category: ['student_fees', 'books', 'subscriptions'][Math.floor(Math.random() * 3)],
                    amount: Math.floor(Math.random() * 5000) + 1000,
                    description: `رسوم دراسية - طالب ${i}`,
                    student_name: `طالب ${i}`,
                    branch_id: Math.floor(Math.random() * 8) + 1,
                    branch_name: `الفرع ${Math.floor(Math.random() * 8) + 1}`,
                    payment_method: 'cash',
                    date: date,
                    created_at: new Date(date).toISOString()
                });
            }

            // Expense transactions
            for (let i = 1; i <= 3; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = `${year}-${String(adjustedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                transactions.push({
                    id: Date.now() + transactions.length,
                    type: 'expense',
                    category: ['salaries', 'rent', 'utilities'][Math.floor(Math.random() * 3)],
                    amount: Math.floor(Math.random() * 3000) + 500,
                    description: `مصروف ${i}`,
                    vendor_name: `مورد ${i}`,
                    branch_id: Math.floor(Math.random() * 8) + 1,
                    branch_name: `الفرع ${Math.floor(Math.random() * 8) + 1}`,
                    payment_method: 'cash',
                    date: date,
                    created_at: new Date(date).toISOString()
                });
            }
        }

        Storage.set('transactions', transactions);
    },

    initializeUsers: function () {
        const users = [
            { id: 1, username: 'admin', password: 'admin', name: 'المدير العام', role_id: 1, role_name: 'Admin', email: 'admin@edumaster.com' },
            { id: 2, username: 'manager', password: 'manager', name: 'مدير الفرع', role_id: 2, role_name: 'Manager', email: 'manager@edumaster.com' },
            { id: 3, username: 'accountant', password: 'accountant', name: 'المحاسب', role_id: 3, role_name: 'Accountant', email: 'accountant@edumaster.com' },
            { id: 4, username: 'staff', password: 'staff', name: 'موظف الاستقبال', role_id: 4, role_name: 'Staff', email: 'staff@edumaster.com' },
            { id: 5, username: 'teacher', password: 'teacher', name: 'المعلم', role_id: 5, role_name: 'Teacher', email: 'teacher@edumaster.com' }
        ];
        Storage.set('users', users);
    },

    reset: function () {
        if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟')) {
            Storage.clear();
            this.initialize();
            window.location.reload();
        }
    }
};

// Auto-initialize on first load
if (typeof Storage !== 'undefined') {
    DataInitializer.initialize();
}

console.log('✅ Data Initializer loaded');
