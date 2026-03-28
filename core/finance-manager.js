/**
 * Logic for Finance (Payments, Fees, Salaries)
 */
export class FinanceManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Record a Payment
     * @param {Object} paymentData : { studentId, amount, paymentMethod, transactionType, collectedBy, branchId }
     */
    async processPayment(paymentData) {
        console.log(`[Finance] Processing ${paymentData.amount} from student ${paymentData.studentId}`);

        // Business Rules
        if (paymentData.amount <= 0) {
            console.error('[Finance] Invalid amount.');
            return { error: 'Amount must be positive' };
        }

        // Check if student exists
        const student = await this.db.findUserById(paymentData.studentId);
        if (!student) {
            return { error: 'Student not found' };
        }

        const transactionId = await this.db.insertPayment(paymentData);

        // Update balance (if tracking ledger)
        await this.db.updateStudentBalance(paymentData.studentId, -paymentData.amount);

        console.log(`[Finance] Created Tx: ${transactionId} for ${student.full_name}`);
        return { success: true, transactionId, timestamp: new Date() };
    }

    /**
     * Get Student Outstanding Balance
     */
    async getStudentBalance(studentId) {
        console.log(`[Finance] Fetching balance for ${studentId}`);
        // Placeholder total - paid
        const totalFees = await this.db.getTotalFeesForStudent(studentId);
        const totalPaid = await this.db.getTotalPaidByStudent(studentId);

        return {
            studentId,
            totalFees,
            totalPaid,
            balance: totalFees - totalPaid
        };
    }

    /**
     * Branch Revenue Report
     */
    async getBranchRevenue(branchId, month, year) {
        console.log(`[Finance] Generating revenue report for Branch ${branchId} (${month}/${year})`);
        // Aggregate payment table by branch_id and date
        return await this.db.aggregateRevenue(branchId, month, year);
    }
}
