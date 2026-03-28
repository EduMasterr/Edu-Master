/**
 * Base JavaScript for EduMaster Pro Frontend
 * Connects UI events to Core Logic (Mocked in Phase 3)
 */

import { system } from '../../core/main.js';

class EduMasterUI {
    constructor() {
        this.currentUser = null;
        this.currentBranch = null;
    }

    /**
     * Handle Login Form Submission
     */
    async handleLogin(username, password) {
        console.log('UI: Attempting login...');
        const result = await system.auth.login(username, password);

        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('edumaster_token', result.token);
            localStorage.setItem('edumaster_user', JSON.stringify(result.user));
            return { success: true };
        } else {
            return { success: false, message: result.message };
        }
    }

    /**
     * Load Dashboard Data based on User Role
     */
    async loadDashboard() {
        if (!this.currentUser) return;

        console.log('UI: Loading dashboard data...');

        // 1. Fetch Branches for Selector
        const branches = await system.branch.getAllBranches();
        this.renderBranchSelector(branches);

        // 2. Fetch Stats (Mock for now)
        const stats = await system.branch.getBranchStats(this.currentUser.branchId || 1);
        this.renderStats(stats);
    }

    /**
     * Render Branch Selector Dropdown
     */
    renderBranchSelector(branches) {
        const selector = document.getElementById('branch-selector');
        if (!selector) return;

        selector.innerHTML = branches.map(b =>
            `<option value="${b.branch_id}">${b.name}</option>`
        ).join('');

        // Set default selection
        if (this.currentUser.branchId) {
            selector.value = this.currentUser.branchId;
        }
    }

    /**
     * Render Dashboard Statistics
     */
    renderStats(stats) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('stat-students', stats.studentCount);
        setVal('stat-teachers', stats.teacherCount);
        setVal('stat-groups', stats.activeGroups);
        // Revenue is mocked in core logic but not returned in basic stats
        setVal('stat-revenue', '50,000 EGP');
    }

    /**
     * Logout
     */
    logout() {
        system.auth.logout();
        localStorage.removeItem('edumaster_token');
        localStorage.removeItem('edumaster_user');
        window.location.href = 'index.html';
    }
}

// Initialize UI
export const ui = new EduMasterUI();

// Attach to window for HTML access
window.edumasterUI = ui;
