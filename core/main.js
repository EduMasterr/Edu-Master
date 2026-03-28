/**
 * Main Core Entry Point - Bringing it all together
 * 
 * This file acts as the System Initialization & API layer.
 * In a real backend (Express/NestJS), this logic would be in controllers/services.
 * Here, it simulates the core business logic flow.
 */

import { AuthManager } from './auth-manager.js';
import { BranchManager } from './branch-manager.js';
import { CourseManager } from './course-manager.js';
import { AttendanceManager } from './attendance-manager.js';
import { FinanceManager } from './finance-manager.js';
import { ReportGenerator } from './report-generator.js';
import { StudentManager } from './student-manager.js';
import { DashboardManager } from './dashboard-manager.js';
import { mockDb } from './mock-db.js';

// System Initialization
class EduMasterSystem {
    constructor() {
        console.log('Initializing EduMaster Pro System Core (Phase 2 - Dashboard)...');

        this.db = mockDb; // Use Mock Database

        // Initialize Managers
        this.auth = new AuthManager(this.db);
        this.branch = new BranchManager(this.db);
        this.course = new CourseManager(this.db);
        this.attendance = new AttendanceManager(this.db);
        this.finance = new FinanceManager(this.db);
        this.reports = new ReportGenerator(this.db);
        this.students = new StudentManager(this.db);
        this.dashboard = new DashboardManager(this.db); // New Dashboard Manager

        console.log('System Core Ready (Phase 2 - Dashboard).');
    }
}

// Export Singleton Instance
export const system = new EduMasterSystem();
