/**
 * Branch Management Core Logic - Full CRUD System
 * Phase 2 - EduMaster Pro
 */

export class BranchManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Get All Branches with Statistics
     */
    async getAllBranches() {
        console.log('[BranchManager] Loading all branches...');

        const branches = await this.db.findAllBranches();
        const branchesWithStats = [];

        for (const branch of branches) {
            const stats = await this.getBranchStatistics(branch.branch_id);
            branchesWithStats.push({
                ...branch,
                stats
            });
        }

        return branchesWithStats;
    }

    /**
     * Get Branch by ID with Full Details
     * @param {number} branchId 
     */
    async getBranchDetails(branchId) {
        console.log(`[BranchManager] Loading branch ${branchId} details...`);

        const branch = await this.db.findBranchById(branchId);
        if (!branch) {
            return { success: false, error: 'Branch not found' };
        }

        const stats = await this.getBranchStatistics(branchId);
        const students = await this.db.getAllStudents();
        const branchStudents = students.filter(s => s.branch_id === branchId);
        const teachers = await this.db.getAllTeachers();
        const branchTeachers = teachers.filter(t => t.branch_id === branchId);
        const groups = await this.db.getAllGroups();
        const branchGroups = groups.filter(g => g.branch_id === branchId);

        return {
            success: true,
            branch: {
                ...branch,
                stats,
                students: branchStudents,
                teachers: branchTeachers,
                groups: branchGroups
            }
        };
    }

    /**
     * Get Branch Statistics
     * @param {number} branchId 
     */
    async getBranchStatistics(branchId) {
        const students = await this.db.getAllStudents();
        const teachers = await this.db.getAllTeachers();
        const groups = await this.db.getAllGroups();
        const payments = await this.db.getAllPayments();

        const branchStudents = students.filter(s => s.branch_id === branchId);
        const branchTeachers = teachers.filter(t => t.branch_id === branchId);
        const branchGroups = groups.filter(g => g.branch_id === branchId);
        const branchPayments = payments.filter(p => p.branch_id === branchId);

        const totalStudents = branchStudents.length;
        const activeStudents = branchStudents.filter(s => s.status === 'Active').length;
        const totalTeachers = branchTeachers.length;
        const activeGroups = branchGroups.filter(g => g.status === 'Active').length;
        const monthlyRevenue = branchPayments
            .filter(p => {
                const paymentDate = new Date(p.payment_date);
                const now = new Date();
                return paymentDate.getMonth() === now.getMonth() &&
                    paymentDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            totalStudents,
            activeStudents,
            totalTeachers,
            activeGroups,
            monthlyRevenue,
            capacity: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0
        };
    }

    /**
     * Add New Branch
     * @param {Object} branchData - {name, location, manager, phone, email, address, capacity}
     */
    async addBranch(branchData) {
        console.log('[BranchManager] Adding new branch:', branchData.name);

        // Validation
        const validation = this.validateBranchData(branchData);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // Check if branch name already exists
        const branches = await this.db.findAllBranches();
        const existingBranch = branches.find(b =>
            b.name.toLowerCase() === branchData.name.toLowerCase()
        );

        if (existingBranch) {
            return { success: false, errors: ['Branch name already exists'] };
        }

        // Insert branch
        const branchId = await this.db.insertBranch({
            name: branchData.name,
            location: branchData.location,
            manager: branchData.manager,
            phone: branchData.phone || null,
            email: branchData.email || null,
            address: branchData.address || null,
            capacity: branchData.capacity || 500,
            status: 'Active',
            created_at: new Date().toISOString()
        });

        console.log(`[BranchManager] Branch added successfully with ID: ${branchId}`);
        return { success: true, branchId };
    }

    /**
     * Update Branch
     * @param {number} branchId 
     * @param {Object} updatedData 
     */
    async updateBranch(branchId, updatedData) {
        console.log(`[BranchManager] Updating branch ${branchId}`);

        const validation = this.validateBranchData(updatedData, true);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // Check if branch exists
        const branch = await this.db.findBranchById(branchId);
        if (!branch) {
            return { success: false, error: 'Branch not found' };
        }

        // Update branch
        await this.db.updateBranch(branchId, {
            name: updatedData.name,
            location: updatedData.location,
            manager: updatedData.manager,
            phone: updatedData.phone,
            email: updatedData.email,
            address: updatedData.address,
            capacity: updatedData.capacity,
            status: updatedData.status || 'Active'
        });

        return { success: true };
    }

    /**
     * Delete Branch (Soft Delete)
     * @param {number} branchId 
     */
    async deleteBranch(branchId) {
        console.log(`[BranchManager] Deleting branch ${branchId}`);

        // Check if branch has active students or groups
        const students = await this.db.getAllStudents();
        const groups = await this.db.getAllGroups();

        const branchStudents = students.filter(s => s.branch_id === branchId && s.status === 'Active');
        const branchGroups = groups.filter(g => g.branch_id === branchId && g.status === 'Active');

        if (branchStudents.length > 0 || branchGroups.length > 0) {
            return {
                success: false,
                error: `Cannot delete branch with ${branchStudents.length} active students and ${branchGroups.length} active groups. Please transfer them first.`
            };
        }

        // Soft delete (change status to Inactive)
        await this.db.updateBranch(branchId, { status: 'Inactive' });

        return { success: true };
    }

    /**
     * Transfer Students to Another Branch
     * @param {number} fromBranchId 
     * @param {number} toBranchId 
     */
    async transferStudents(fromBranchId, toBranchId) {
        console.log(`[BranchManager] Transferring students from ${fromBranchId} to ${toBranchId}`);

        const students = await this.db.getAllStudents();
        const branchStudents = students.filter(s => s.branch_id === fromBranchId);

        for (const student of branchStudents) {
            await this.db.updateUser(student.user_id, { branch_id: toBranchId });
        }

        return { success: true, transferredCount: branchStudents.length };
    }

    /**
     * Get Monthly Revenue Report for Branch
     * @param {number} branchId 
     * @param {number} months - Number of months to include
     */
    async getMonthlyRevenueReport(branchId, months = 6) {
        console.log(`[BranchManager] Generating revenue report for branch ${branchId}`);

        const payments = await this.db.getAllPayments();
        const branchPayments = payments.filter(p => p.branch_id === branchId);

        const report = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            const monthPayments = branchPayments.filter(p => {
                const paymentDate = new Date(p.payment_date);
                return paymentDate.getMonth() === date.getMonth() &&
                    paymentDate.getFullYear() === date.getFullYear();
            });

            const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

            report.push({
                month: date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
                revenue,
                transactionCount: monthPayments.length
            });
        }

        return report;
    }

    /**
     * Validate Branch Data
     */
    validateBranchData(data, isUpdate = false) {
        const errors = [];

        if (!data.name || data.name.length < 3) {
            errors.push('Branch name must be at least 3 characters');
        }

        if (!data.location || data.location.length < 3) {
            errors.push('Location must be at least 3 characters');
        }

        if (!data.manager || data.manager.length < 3) {
            errors.push('Manager name must be at least 3 characters');
        }

        if (data.phone && !this.isValidPhone(data.phone)) {
            errors.push('Invalid phone number format');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Invalid email format');
        }

        if (data.capacity && (data.capacity < 10 || data.capacity > 5000)) {
            errors.push('Capacity must be between 10 and 5000');
        }

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
     * Get Branch Performance Metrics
     * @param {number} branchId 
     */
    async getBranchPerformance(branchId) {
        const stats = await this.getBranchStatistics(branchId);
        const revenueReport = await this.getMonthlyRevenueReport(branchId, 3);

        const avgRevenue = revenueReport.reduce((sum, r) => sum + r.revenue, 0) / revenueReport.length;
        const currentRevenue = revenueReport[revenueReport.length - 1].revenue;
        const growth = avgRevenue > 0 ? ((currentRevenue - avgRevenue) / avgRevenue) * 100 : 0;

        return {
            ...stats,
            avgMonthlyRevenue: Math.round(avgRevenue),
            currentMonthRevenue: currentRevenue,
            growthRate: Math.round(growth),
            performance: growth > 10 ? 'Excellent' : growth > 0 ? 'Good' : 'Needs Improvement'
        };
    }
}
