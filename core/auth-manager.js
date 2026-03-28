/**
 * User Roles
 */
export const ROLES = {
    SUPER_ADMIN: 'SuperAdmin',
    BRANCH_ADMIN: 'BranchAdmin',
    TEACHER: 'Teacher',
    EMPLOYEE: 'Employee',
    STUDENT: 'Student',
    PARENT: 'Parent',
};

/**
 * Authentication & Authorization Module
 * Handles Login, Logout, and Role-Based Access Control (RBAC).
 */
export class AuthManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
        this.currentUser = null;
        this.sessionToken = null;
    }

    /**
     * Login User
     * @param {string} username 
     * @param {string} password 
     * @returns {Object} Session object or error
     */
    async login(username, password) {
        console.log(`[Auth] Attempting login for: ${username}`);

        const user = await this.db.findUserByUsername(username);

        if (!user) {
            console.error('[Auth] User not found.');
            return { success: false, message: "Invalid credentials" };
        }

        if (user.password_hash !== password) {
            console.error('[Auth] Invalid password.');
            return { success: false, message: "Invalid credentials" };
        }

        if (user.status !== 'Active') {
            return { success: false, message: "Account is inactive or suspended" };
        }

        // Map role string to role ID for frontend compatibility
        const roleMap = {
            'SuperAdmin': 1,
            'BranchAdmin': 2,
            'Manager': 2,
            'Accountant': 3,
            'Staff': 4,
            'Teacher': 5,
            'Student': 6
        };

        this.currentUser = {
            ...user,
            role_id: roleMap[user.role] || 4,
            role_name: user.role
        };

        this.sessionToken = this._generateToken();

        console.log(`[Auth] Login successful for ${user.role}: ${user.full_name}`);
        return {
            success: true,
            token: this.sessionToken,
            user: {
                id: user.user_id,
                username: user.username,
                name: user.full_name,
                role_id: this.currentUser.role_id,
                role_name: user.role,
                branchId: user.branch_id
            }
        };
    }

    /**
     * Logout User
     */
    logout() {
        if (this.currentUser) {
            console.log(`[Auth] User ${this.currentUser.username} logged out.`);
        }
        this.currentUser = null;
        this.sessionToken = null;
        return { success: true };
    }

    /**
     * Check if current user has permission for an action
     * @param {string} requiredRole 
     */
    hasPermission(requiredRole) {
        if (!this.currentUser) return false;

        // SuperAdmin has all permissions
        if (this.currentUser.role === ROLES.SUPER_ADMIN) return true;

        // Simple hierarchy check could be added here
        if (requiredRole === this.currentUser.role) return true;

        return false;
    }

    _generateToken() {
        return Math.random().toString(36).substr(2) + Date.now().toString(36);
    }
}
