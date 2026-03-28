/**
 * Student Management Core Logic (Phase 2)
 * Full CRUD Operations with Validation
 */

export class StudentManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Add New Student
     * @param {Object} studentData - {username, fullName, email, phone, branchId, parentName, parentPhone, address, dateOfBirth}
     */
    async addStudent(studentData) {
        console.log('[StudentManager] Adding new student:', studentData.fullName);

        // Validation
        const validation = this.validateStudentData(studentData);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // Check if username already exists
        const existingUser = await this.db.findUserByUsername(studentData.username);
        if (existingUser) {
            return { success: false, errors: ['Username already exists'] };
        }

        // Insert into users table
        const userId = await this.db.insertUser({
            username: studentData.username,
            password_hash: 'default_pass', // Should be hashed in production
            role: 'Student',
            full_name: studentData.fullName,
            email: studentData.email,
            phone: studentData.phone,
            branch_id: studentData.branchId,
            status: 'Active'
        });

        // Insert into student_profiles table
        await this.db.insertStudentProfile({
            user_id: userId,
            parent_name: studentData.parentName,
            parent_phone: studentData.parentPhone,
            address: studentData.address,
            date_of_birth: studentData.dateOfBirth,
            enrollment_date: new Date().toISOString().split('T')[0]
        });

        console.log(`[StudentManager] Student added successfully with ID: ${userId}`);
        return { success: true, studentId: userId };
    }

    /**
     * Update Student Data
     * @param {number} studentId 
     * @param {Object} updatedData 
     */
    async updateStudent(studentId, updatedData) {
        console.log(`[StudentManager] Updating student ${studentId}`);

        const validation = this.validateStudentData(updatedData, true);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // Update users table
        await this.db.updateUser(studentId, {
            full_name: updatedData.fullName,
            email: updatedData.email,
            phone: updatedData.phone,
            status: updatedData.status || 'Active'
        });

        // Update student_profiles table
        await this.db.updateStudentProfile(studentId, {
            parent_name: updatedData.parentName,
            parent_phone: updatedData.parentPhone,
            address: updatedData.address
        });

        return { success: true };
    }

    /**
     * Delete Student (Soft Delete - Change Status)
     * @param {number} studentId 
     */
    async deleteStudent(studentId) {
        console.log(`[StudentManager] Deleting student ${studentId}`);

        // Check if student has active enrollments
        const enrollments = await this.db.findEnrollmentsForStudent(studentId);
        const activeEnrollments = enrollments.filter(e => e.status === 'Active');

        if (activeEnrollments.length > 0) {
            return {
                success: false,
                error: 'Cannot delete student with active enrollments. Please withdraw first.'
            };
        }

        // Soft delete (change status to Inactive)
        await this.db.updateUser(studentId, { status: 'Inactive' });

        return { success: true };
    }

    /**
     * Search & Filter Students
     * @param {Object} filters - {searchTerm, groupId, status, branchId}
     */
    async searchStudents(filters = {}) {
        console.log('[StudentManager] Searching students with filters:', filters);

        let students = await this.db.getAllStudents();

        // Apply filters
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            students = students.filter(s =>
                s.full_name.toLowerCase().includes(term) ||
                s.username.toLowerCase().includes(term) ||
                (s.email && s.email.toLowerCase().includes(term))
            );
        }

        if (filters.groupId) {
            const enrollments = await this.db.findEnrollmentsByGroup(filters.groupId);
            const studentIds = enrollments.map(e => e.student_id);
            students = students.filter(s => studentIds.includes(s.user_id));
        }

        if (filters.status) {
            students = students.filter(s => s.status === filters.status);
        }

        if (filters.branchId) {
            students = students.filter(s => s.branch_id === filters.branchId);
        }

        return students;
    }

    /**
     * Get Student Details with Enrollments & Payment Status
     * @param {number} studentId 
     */
    async getStudentDetails(studentId) {
        const user = await this.db.findUserById(studentId);
        const profile = await this.db.getStudentProfile(studentId);
        const enrollments = await this.db.findEnrollmentsForStudent(studentId);
        const payments = await this.db.getPaymentsByStudent(studentId);

        const totalFees = enrollments.reduce((sum, e) => sum + (e.fee || 0), 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        return {
            ...user,
            ...profile,
            enrollments,
            financialStatus: {
                totalFees,
                totalPaid,
                balance: totalFees - totalPaid
            }
        };
    }

    /**
     * Validate Student Data
     */
    validateStudentData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.username) errors.push('Username is required');
        if (!data.fullName || data.fullName.length < 3) errors.push('Full name must be at least 3 characters');
        if (data.email && !this.isValidEmail(data.email)) errors.push('Invalid email format');
        if (data.phone && !this.isValidPhone(data.phone)) errors.push('Invalid phone number');
        if (!isUpdate && !data.branchId) errors.push('Branch is required');

        return {
            valid: errors.length === 0,
            errors
        };
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^01[0-9]{9}$/.test(phone);
    }

    /**
     * Export Students to CSV/Excel Format
     */
    async exportStudents(filters = {}) {
        const students = await this.searchStudents(filters);

        // Generate CSV content
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Branch', 'Status', 'Enrollment Date'];
        const rows = students.map(s => [
            s.user_id,
            s.full_name,
            s.email || 'N/A',
            s.phone || 'N/A',
            s.branch_id,
            s.status,
            s.enrollment_date || 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return {
            content: csvContent,
            filename: `students_export_${new Date().toISOString().split('T')[0]}.csv`
        };
    }
}
