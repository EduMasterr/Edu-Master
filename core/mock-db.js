/**
 * Mock Database Adapter - Extended for Phase 2
 * Simulates SQL database operations with in-memory storage
 */

class MockDatabase {
    constructor() {
        // In-memory storage
        this.users = [];
        this.studentProfiles = [];
        this.courses = [];
        this.groups = [];
        this.enrollments = [];
        this.attendance = [];
        this.payments = [];
        this.branches = [];
        this.systemConfig = {
            systemName: "EduMaster Pro",
            masterLogo: "assets/logo-main.png",
            primaryColor: "#00eaff",
            allowBranchManagement: true
        };

        this.nextUserId = 1;
        this.nextCourseId = 1;
        this.nextGroupId = 1;
        this.nextEnrollmentId = 1;
        this.nextBranchId = 1;

        // Load initial placeholder data
        this.loadPlaceholderData();

        // Add core admin user (admin/admin)
        this.users.push(
            {
                user_id: 1000,
                username: 'admin',
                password_hash: 'admin',
                role: 'SuperAdmin',
                full_name: 'المدير العام',
                email: 'admin@edumaster.com',
                phone: '01011111111',
                branch_id: null,
                status: 'Active'
            }
        );
    }

    loadPlaceholderData() {
        // Add branches first
        this.branches = [
            {
                branch_id: this.nextBranchId++,
                name: 'Main Branch - Cairo',
                location: 'Cairo',
                manager: 'Ahmed Khalil',
                phone: '01012345678',
                email: 'cairo@edumaster.com',
                address: '123 Tahrir Square, Cairo',
                capacity: 500,
                status: 'Active',
                created_at: '2025-01-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Alexandria Branch',
                location: 'Alexandria',
                manager: 'Sara Ali',
                phone: '01023456789',
                email: 'alex@edumaster.com',
                address: '45 Corniche Road, Alexandria',
                capacity: 400,
                status: 'Active',
                created_at: '2025-02-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'October Branch',
                location: '6th October City',
                manager: 'Mohamed Hassan',
                phone: '01034567890',
                email: 'october@edumaster.com',
                address: '78 Central Axis, 6th October',
                capacity: 350,
                status: 'Active',
                created_at: '2025-03-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Nasr City Branch',
                location: 'Nasr City',
                manager: 'Khaled Fawzy',
                phone: '01045678901',
                email: 'nasr@edumaster.com',
                address: '12 Abbas El Akkad, Nasr City',
                capacity: 300,
                status: 'Active',
                created_at: '2025-04-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Maadi Branch',
                location: 'Maadi',
                manager: 'Nourhan Ahmed',
                phone: '01056789012',
                email: 'maadi@edumaster.com',
                address: '34 Road 9, Maadi',
                capacity: 250,
                status: 'Active',
                created_at: '2025-05-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Mansoura Branch',
                location: 'Mansoura',
                manager: 'Omar Hossam',
                phone: '01067890123',
                email: 'mansoura@edumaster.com',
                address: '56 El Gomhoreya St, Mansoura',
                capacity: 200,
                status: 'Active',
                created_at: '2025-06-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Tanta Branch',
                location: 'Tanta',
                manager: 'Yasmin Mohamed',
                phone: '01078901234',
                email: 'tanta@edumaster.com',
                address: '89 El Bahr St, Tanta',
                capacity: 180,
                status: 'Active',
                created_at: '2025-07-01'
            },
            {
                branch_id: this.nextBranchId++,
                name: 'Online Hub',
                location: 'Virtual',
                manager: 'System Admin',
                phone: '01089012345',
                email: 'online@edumaster.com',
                address: 'Virtual Platform',
                capacity: 1000,
                status: 'Active',
                created_at: '2025-01-15',
                config: {
                    logo: 'assets/online-logo.png',
                    accentColor: '#a855f7'
                }
            }
        ];

        // Add BranchAdmin users for each branch
        this.branches.forEach(branch => {
            const branchNameLower = branch.name.split(' ')[0].toLowerCase();
            this.users.push({
                user_id: 2000 + branch.branch_id,
                username: `admin_${branchNameLower}`,
                password_hash: '123',
                role: 'BranchAdmin',
                full_name: `مدير فرع ${branch.name}`,
                email: `admin.${branchNameLower}@edumaster.com`,
                phone: branch.phone,
                branch_id: branch.branch_id,
                status: 'Active'
            });
        });

        // Add sample students
        for (let i = 1; i <= 50; i++) {
            const userId = this.nextUserId++;
            this.users.push({
                user_id: userId,
                username: `student_${String(i).padStart(4, '0')}`,
                password_hash: 'pass',
                role: 'Student',
                full_name: `طالب نموذج ${i}`,
                email: `student${String(i).padStart(4, '0')}@edu.com`,
                phone: `0110000${String(i).padStart(4, '0')}`,
                branch_id: (i % 8) + 1,
                status: i % 10 === 0 ? 'Inactive' : 'Active'
            });

            this.studentProfiles.push({
                user_id: userId,
                parent_name: `ولي أمر ${i}`,
                parent_phone: `0120000${String(i).padStart(4, '0')}`,
                address: 'Cairo, Egypt',
                date_of_birth: '2005-01-01',
                enrollment_date: '2026-02-01'
            });
        }

        // Add sample teachers (42 teachers)
        const teacherNames = [
            'أحمد محمود الشافعي', 'سارة علي حسن', 'محمد خالد فوزي', 'نورهان عبد الرحمن',
            'عمر حسام الدين', 'ياسمين محمد علي', 'كريم أحمد سعيد', 'دينا خالد محمود',
            'طارق عبد الله', 'منى سامي حسن', 'يوسف علي محمد', 'هدى حسن أحمد',
            'زياد محمود خالد', 'ريم سعيد علي', 'عبد الله أحمد', 'لينا محمد حسن'
        ];

        for (let i = 1; i <= 42; i++) {
            const userId = this.nextUserId++;
            this.users.push({
                user_id: userId,
                username: `teacher_${String(i).padStart(3, '0')}`,
                password_hash: 'pass',
                role: 'Teacher',
                full_name: teacherNames[i % teacherNames.length] + ` (${i})`,
                email: `teacher${String(i).padStart(3, '0')}@edumaster.com`,
                phone: `0120000${String(i).padStart(4, '0')}`,
                branch_id: (i % 8) + 1,
                status: 'Active'
            });
        }

        // Add sample courses (20 courses)
        const courseNames = [
            'English Level 1', 'English Level 2', 'English Level 3', 'IELTS Preparation',
            'TOEFL Preparation', 'Business English', 'Conversation Skills', 'Grammar Mastery',
            'French Level 1', 'French Level 2', 'German Level 1', 'Spanish Level 1',
            'Arabic for Non-Natives', 'Kids English (Ages 6-8)', 'Kids English (Ages 9-12)',
            'SAT Preparation', 'Academic Writing', 'Phonics & Pronunciation',
            'Literature & Reading', 'Online IELTS Bootcamp'
        ];

        for (let i = 0; i < courseNames.length; i++) {
            this.courses.push({
                course_id: this.nextCourseId++,
                course_name: courseNames[i],
                description: `دورة ${courseNames[i]} - مستوى احترافي`,
                level: i < 3 ? 'Beginner' : i < 8 ? 'Intermediate' : 'Advanced',
                branch_id: (i % 8) + 1,
                base_price: 1000 + (i * 100)
            });
        }

        // Add sample groups (115 groups)
        for (let i = 1; i <= 115; i++) {
            this.groups.push({
                group_id: this.nextGroupId++,
                group_name: `Group ${String.fromCharCode(65 + (i % 26))} - ${this.courses[i % this.courses.length].course_name}`,
                course_id: (i % this.courses.length) + 1,
                branch_id: (i % 8) + 1,
                teacher_id: 51 + (i % 42), // Teacher IDs start from 51
                schedule: i % 2 === 0 ? 'Sat/Mon 4:00 PM' : 'Sun/Tue 5:00 PM',
                start_date: '2026-02-01',
                end_date: '2026-05-01',
                max_students: 15 + (i % 10),
                current_enrollment: 10 + (i % 15),
                status: i % 20 === 0 ? 'Completed' : 'Active'
            });
        }

        // Add sample enrollments (extended)
        for (let i = 1; i <= 50; i++) {
            this.enrollments.push({
                enrollment_id: this.nextEnrollmentId++,
                student_id: i,
                group_id: (i % 115) + 1,
                enrollment_date: `2026-02-${String(Math.min(i % 28 + 1, 28)).padStart(2, '0')}`,
                status: 'Active',
                payment_status: i % 3 === 0 ? 'Paid' : 'Pending',
                fee: 1200 + (i % 5) * 100
            });
        }

        // Add sample attendance records (200 records)
        for (let i = 1; i <= 200; i++) {
            const daysAgo = i % 30;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            this.attendance.push({
                attendance_id: i,
                enrollment_id: (i % 50) + 1,
                session_date: date.toISOString().split('T')[0],
                status: i % 5 === 0 ? 'Absent' : (i % 10 === 0 ? 'Late' : 'Present'),
                notes: i % 5 === 0 ? 'غياب بعذر' : '',
                recorded_by: 1
            });
        }

        // Add sample payments (100 payments)
        for (let i = 1; i <= 100; i++) {
            const daysAgo = i % 60;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            this.payments.push({
                payment_id: i,
                student_id: (i % 50) + 1,
                amount: 500 + (i % 10) * 100,
                payment_method: i % 3 === 0 ? 'Cash' : (i % 3 === 1 ? 'Card' : 'Bank Transfer'),
                payment_date: date.toISOString().split('T')[0],
                transaction_type: 'Tuition Fee',
                collected_by: 1,
                branch_id: (i % 8) + 1,
                notes: `دفعة ${i}`
            });
        }
    }

    // ===== User Operations =====
    async findUserByUsername(username) {
        return this.users.find(u => u.username === username) || null;
    }

    async findUserById(id) {
        return this.users.find(u => u.user_id === id) || null;
    }

    async getAllStudents() {
        return this.users.filter(u => u.role === 'Student');
    }

    async insertUser(userData) {
        const userId = this.nextUserId++;
        const newUser = { user_id: userId, ...userData };
        this.users.push(newUser);
        return userId;
    }

    async updateUser(userId, updates) {
        const user = this.users.find(u => u.user_id === userId);
        if (user) {
            Object.assign(user, updates);
        }
        return true;
    }

    // ===== Student Profile Operations =====
    async getStudentProfile(userId) {
        return this.studentProfiles.find(p => p.user_id === userId) || null;
    }

    async insertStudentProfile(profileData) {
        this.studentProfiles.push(profileData);
        return true;
    }

    async updateStudentProfile(userId, updates) {
        const profile = this.studentProfiles.find(p => p.user_id === userId);
        if (profile) {
            Object.assign(profile, updates);
        }
        return true;
    }

    // ===== Enrollment Operations =====
    async findEnrollmentsForStudent(studentId) {
        return this.enrollments.filter(e => e.student_id === studentId);
    }

    async findEnrollmentsByGroup(groupId) {
        return this.enrollments.filter(e => e.group_id === groupId);
    }

    async getEnrollmentById(enrollmentId) {
        return this.enrollments.find(e => e.enrollment_id === enrollmentId) || null;
    }

    async performEnrollment(studentId, groupId) {
        const enrollmentId = this.nextEnrollmentId++;
        const newEnrollment = {
            enrollment_id: enrollmentId,
            student_id: studentId,
            group_id: groupId,
            enrollment_date: new Date().toISOString().split('T')[0],
            status: 'Active',
            payment_status: 'Pending',
            fee: 1200
        };
        this.enrollments.push(newEnrollment);
        return newEnrollment;
    }

    // ===== Payment Operations =====
    async getPaymentsByStudent(studentId) {
        return this.payments.filter(p => p.student_id === studentId);
    }

    async insertPayment(paymentData) {
        const paymentId = this.payments.length + 1;
        this.payments.push({ payment_id: paymentId, ...paymentData });
        return paymentId;
    }

    // ===== Group Operations =====
    async findGroupById(groupId) {
        return this.groups.find(g => g.group_id === groupId) || null;
    }

    async getAllGroups() {
        return this.groups;
    }

    // ===== Branch Operations =====
    async findAllBranches() {
        return this.branches;
    }

    async findBranchById(branchId) {
        const branches = await this.findAllBranches();
        return branches.find(b => b.branch_id === branchId) || null;
    }

    // ===== Statistics =====
    async userCountByBranch(branchId, role) {
        return this.users.filter(u => u.branch_id === branchId && u.role === role).length;
    }

    async activeGroupsByBranch(branchId) {
        return this.groups.filter(g => g.branch_id === branchId).length;
    }

    // ===== Teacher Operations =====
    async getAllTeachers() {
        return this.users.filter(u => u.role === 'Teacher');
    }

    // ===== Course Operations =====
    async getAllCourses() {
        return this.courses;
    }

    // ===== Attendance Operations =====
    async getAllAttendance() {
        return this.attendance;
    }

    // ===== Payment Operations (Extended) =====
    async getAllPayments() {
        return this.payments;
    }

    // ===== Enrollment Operations (Extended) =====
    async getAllEnrollments() {
        return this.enrollments;
    }
}

// Export singleton instance
export const mockDb = new MockDatabase();
