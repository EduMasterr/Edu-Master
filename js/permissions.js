/**
 * RBAC System & Permission Manager (Global Version)
 * Enhanced with 5 roles: Admin, Manager, Accountant, Staff, Teacher
 */
window.Permissions = {
    _currentUser: null,
    _activeBranchId: null,

    // Define roles and their permissions
    ROLES: {
        ADMIN: {
            id: 1,
            name: 'Admin',
            label: 'مدير النظام',
            permissions: ['*'] // All permissions
        },
        MANAGER: {
            id: 2,
            name: 'Manager',
            label: 'مدير',
            permissions: [
                'view_dashboard',
                'view_students',
                'add_student',
                'edit_student',
                'view_attendance',
                'mark_attendance',
                'view_financial_reports',
                'view_invoices',
                'print_invoice',
                'view_users',
                'generate_reports'
            ]
        },
        ACCOUNTANT: {
            id: 3,
            name: 'Accountant',
            label: 'محاسب',
            permissions: [
                'view_dashboard',
                'view_financial_reports',
                'record_income',
                'record_expense',
                'view_invoices',
                'generate_invoice',
                'print_invoice',
                'view_pl_reports',
                'export_financial_data'
            ]
        },
        STAFF: {
            id: 4,
            name: 'Staff',
            label: 'موظف',
            permissions: [
                'view_dashboard',
                'view_students',
                'add_student',
                'view_attendance',
                'mark_attendance',
                'scan_qr',
                'view_invoices'
            ]
        },
        TEACHER: {
            id: 5,
            name: 'Teacher',
            label: 'معلم',
            permissions: [
                'view_dashboard',
                'view_students',
                'view_attendance',
                'mark_attendance',
                'scan_qr',
                'view_my_classes'
            ]
        }
    },

    // Permission definitions
    PERMISSIONS: {
        // Dashboard
        'view_dashboard': { label: 'عرض لوحة التحكم', category: 'dashboard' },

        // Students
        'view_students': { label: 'عرض الطلاب', category: 'students' },
        'add_student': { label: 'إضافة طالب', category: 'students' },
        'edit_student': { label: 'تعديل طالب', category: 'students' },
        'delete_student': { label: 'حذف طالب', category: 'students' },

        // Attendance
        'view_attendance': { label: 'عرض الحضور', category: 'attendance' },
        'mark_attendance': { label: 'تسجيل الحضور', category: 'attendance' },
        'scan_qr': { label: 'مسح QR', category: 'attendance' },
        'generate_qr': { label: 'توليد QR', category: 'attendance' },

        // Financial
        'view_financial_reports': { label: 'عرض التقارير المالية', category: 'financial' },
        'record_income': { label: 'تسجيل دخل', category: 'financial' },
        'record_expense': { label: 'تسجيل مصروف', category: 'financial' },
        'view_pl_reports': { label: 'عرض تقارير الأرباح والخسائر', category: 'financial' },
        'export_financial_data': { label: 'تصدير البيانات المالية', category: 'financial' },

        // Invoices
        'view_invoices': { label: 'عرض الفواتير', category: 'invoices' },
        'generate_invoice': { label: 'إنشاء فاتورة', category: 'invoices' },
        'print_invoice': { label: 'طباعة فاتورة', category: 'invoices' },

        // Branches
        'view_branches': { label: 'عرض الفروع', category: 'branches' },
        'add_branch': { label: 'إضافة فرع', category: 'branches' },
        'edit_branch': { label: 'تعديل فرع', category: 'branches' },

        // Users
        'view_users': { label: 'عرض المستخدمين', category: 'users' },
        'add_user': { label: 'إضافة مستخدم', category: 'users' },
        'edit_user': { label: 'تعديل مستخدم', category: 'users' },
        'delete_user': { label: 'حذف مستخدم', category: 'users' },

        // Reports
        'generate_reports': { label: 'إنشاء التقارير', category: 'reports' },

        // Classes
        'view_my_classes': { label: 'عرض صفوفي', category: 'classes' }
    },

    init() {
        const saved = localStorage.getItem('edumaster_session');
        const isLogoutActive = localStorage.getItem('edumaster_logout_active') === 'true';

        if (saved && !isLogoutActive) {
            this._currentUser = JSON.parse(saved);

            // Persist the view branch for SuperAdmin
            const persistedViewBranch = localStorage.getItem('edumaster_view_branch');
            if (this._currentUser.role_id === 1 && persistedViewBranch !== null) {
                this._activeBranchId = persistedViewBranch === "" ? null : parseInt(persistedViewBranch);
            } else {
                this._activeBranchId = this._currentUser.branch || null;
            }
        } else {
            // 🔒 SECURITY ENFORCEMENT (v8.0): Mandatory Login Redirect
            // No session found and not on login page -> Redirect to login
            const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('Edu-Master/');
            
            if (!isLoginPage) {
                console.warn("🚫 Unauthenticated Access Attempt | Redirecting to login...");
                const prefix = (window.location.pathname.includes('/modules/') || window.location.pathname.includes('/admin-console/')) ? '../' : '';
                window.location.href = prefix + 'index.html';
                return;
            }

            this._currentUser = null;
            this._activeBranchId = null;
            return;
        }
        this.applyUIPermissions();
    },

    logout() {
        localStorage.setItem('edumaster_logout_active', 'true');
        localStorage.removeItem('edumaster_session');
        window.location.href = 'index.html';
    },

    getActiveBranchId() {
        return this._activeBranchId;
    },

    isAdmin() {
        return this._currentUser && this._currentUser.role_id === 1;
    },

    getActiveBranchName() {
        const id = this.getActiveBranchId();
        if (!id) return 'المركز الرئيسي';
        const branches = (window.Storage ? Storage.get('branches') : []) || [];
        const branch = branches.find(b => b.id === id);
        return branch ? branch.name : `فرع ${id}`;
    },

    setViewBranch(branchId) {
        // Always allow
        this._activeBranchId = branchId === "" ? null : parseInt(branchId);
        localStorage.setItem('edumaster_view_branch', branchId === "" ? "" : branchId.toString());
        // Notify controllers to reload data
        window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId: this._activeBranchId } }));
        return true;
    },

    getCurrentUser() {
        return this._currentUser;
    },

    getUserRole() {
        if (!this._currentUser) return null; // Return null if no user is logged in

        const roleKey = Object.keys(this.ROLES).find(k => this.ROLES[k].id === this._currentUser.role_id);
        return roleKey ? this.ROLES[roleKey] : null; // Return null if role_id not found
    },

    hasPermission(permName) {
        if (!this._currentUser) return false;
        const role = this.getUserRole();
        
        // Admin has all permissions
        if (role.permissions.includes('*')) return true;
        
        return role.permissions.includes(permName);
    },

    hasAnyPermission(permNames) {
        return permNames.some(perm => this.hasPermission(perm));
    },

    hasAllPermissions(permNames) {
        return permNames.every(perm => this.hasPermission(perm));
    },

    applyUIPermissions() {
        // Hide elements based on permissions
        const elements = document.querySelectorAll('[data-permission]');
        elements.forEach(el => {
            const requiredPerm = el.getAttribute('data-permission');
            if (!this.hasPermission(requiredPerm)) {
                el.style.display = 'none';
            }
        });

        // 🔒 ADMIN-ONLY RESTRICTION
        const user = this.getCurrentUser();
        const isSuperAdmin = user && user.role_id === 1;
        if (!isSuperAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        }

        // Hide navigation items based on role
        this.applyNavigationPermissions();
    },

    applyNavigationPermissions() {
        const userRole = this.getUserRole();
        if (!userRole) return;

        // Define which pages each role can access
        const pageAccess = {
            'dashboard.html': ['view_dashboard'],
            'students.html': ['view_students'],
            'attendance.html': ['view_attendance'],
            'accounting.html': ['view_financial_reports'],
            'financial-dashboard.html': ['view_financial_reports'],
            'branches.html': ['view_branches'],
            'users-management.html': ['view_users'],
            'books.html': ['view_students'], // Staff can manage books
            'suppliers.html': ['record_expense']
        };

        // Hide nav items user doesn't have access to
        document.querySelectorAll('.nav-item').forEach(navItem => {
            const href = navItem.getAttribute('href');
            if (href && pageAccess[href]) {
                const requiredPerms = pageAccess[href];
                if (!this.hasAnyPermission(requiredPerms)) {
                    navItem.style.display = 'none';
                }
            }
        });
    },

    canAccessPage(pageName) {
        const pagePermissions = {
            'dashboard': ['view_dashboard'],
            'students': ['view_students'],
            'attendance': ['view_attendance'],
            'accounting': ['view_financial_reports'],
            'financial-dashboard': ['view_financial_reports'],
            'branches': ['view_branches'],
            'users': ['view_users'],
            'invoices': ['view_invoices']
        };

        const required = pagePermissions[pageName];
        if (!required) return true; // No restrictions

        return this.hasAnyPermission(required);
    },

    // Check if user can perform action on specific resource
    canPerformAction(action, resource, resourceData = {}) {
        const userRole = this.getUserRole();

        // Admin can do everything
        if (userRole.id === 1) return true;

        // Teachers can only view/edit their own classes
        if (userRole.id === 5 && resource === 'class') {
            if (action === 'view' || action === 'edit') {
                return resourceData.teacher_id === this._currentUser.id;
            }
            return false;
        }

        // Check general permission
        const permissionMap = {
            'student': {
                'view': 'view_students',
                'add': 'add_student',
                'edit': 'edit_student',
                'delete': 'delete_student'
            },
            'attendance': {
                'view': 'view_attendance',
                'mark': 'mark_attendance',
                'scan': 'scan_qr'
            },
            'financial': {
                'view': 'view_financial_reports',
                'income': 'record_income',
                'expense': 'record_expense'
            },
            'invoice': {
                'view': 'view_invoices',
                'generate': 'generate_invoice',
                'print': 'print_invoice'
            }
        };

        const perm = permissionMap[resource]?.[action];
        return perm ? this.hasPermission(perm) : false;
    },

    // Get role label in Arabic
    getRoleLabel(roleId) {
        for (let roleKey in this.ROLES) {
            if (this.ROLES[roleKey].id === roleId) {
                return this.ROLES[roleKey].label;
            }
        }
        return 'غير معروف';
    },

    // Get all roles for user management
    getAllRoles() {
        return Object.values(this.ROLES);
    },

    logout() {
        localStorage.removeItem('edumaster_session');
        window.location.href = 'index.html';
    },

    // Initialize default roles in storage
    initializeRoles() {
        const roles = Storage.get('roles') || [];
        if (roles.length === 0) {
            Storage.set('roles', Object.values(this.ROLES));
        }
    }
};

// Auto-init
Permissions.init();
Permissions.initializeRoles();

console.log('✅ Enhanced Permissions System loaded');

