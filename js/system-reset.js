/**
 * 🧹 EduMaster Pro - System Reset Tool
 * Complete system wipe and factory reset
 */

window.SystemReset = {
    /**
     * Complete System Wipe
     */
    factoryReset() {
        if (window.AudioCore) AudioCore.playScare();

        Modal.confirm({
            title: '⚠️ تحذير خطير جداً!',
            message: 'هذا الإجراء سيحذف كل شيء وسيعيد النظام لحالة المصنع بالكامل (سيتم مسح الفروع والطلاب والمحاسبة والمستخدمين).\nهل أنت متأكد تماماً من المتابعة؟',
            confirmText: 'نعم، مسح شامل لجميع البيانات',
            cancelText: 'إلغاء العملية',
            type: 'danger',
            icon: 'fa-radiation',
            onConfirm: () => {
                Modal.confirm({
                    title: '⚠️ تأكيد نهائي (مرحلة اللاعودة)',
                    message: 'لن تتمكن من استرجاع البيانات بعد الحذف بأي شكل من الأشكال. سيتم خروجك من النظام وإعادة تهيئته.\nهل أنت متأكد حقاً؟',
                    confirmText: 'أنا متأكد، استمر',
                    cancelText: 'تراجع فوراً',
                    type: 'danger',
                    icon: 'fa-skull-crossbones',
                    onConfirm: () => {
                        this._promptAuth((isValid) => {
                            if (isValid) this._executeFactoryReset();
                        });
                    }
                });
            }
        });
    },

    async _executeFactoryReset() {
        console.log('🧹 بدء عملية تصفير النظام...\n');
        try {
            await this.wipeAllData();
            await this.reinitializeSystem();

            console.log('\n✅ تم تصفير النظام بنجاح!');
            Modal.success({
                title: 'تصفير ناجح',
                message: 'تم تصفير النظام بالكامل والعودة لحالة المصنع. سيتم إعادة تشغيل النظام الآن.\n\nبيانات الدخول الافتراضية:\nاسم المستخدم: admin\nكلمة المرور: admin123',
                onComplete: () => { location.href = 'index.html'; }
            });
        } catch (error) {
            console.error('❌ خطأ أثناء التصفير:', error);
            Toast.show('حدث خطأ أثناء تصفير النظام', 'error');
        }
    },

    /**
     * Wipe all data from Storage (both localStorage and IDB)
     */
    async wipeAllData() {
        const dataKeys = [
            // Core Data
            'students',
            'study_groups', // Fix: match groups.js key
            'trainers',     // Missing
            'branches',
            // 'books',     // Keep books as requested

            // Financial
            'transactions',
            'journal_entries',
            'coa',
            'invoices',
            'sales_invoices',
            'purchase_invoices',
            'payroll_settings',
            'expenses',

            // Inventory & Operations
            'inventory_movements',
            'suppliers',
            'attendance',
            'attendance_records',
            'staff_attendance',
            'trainer_attendance',
            'qr_mappings',
            'audit_logs',

            // Users (keep only admin)
            'users',
            'roles'
        ];

        console.log('🗑️  حذف البيانات...');

        for (const key of dataKeys) {
            await Storage.remove(key);
            console.log(`   ✓ تم حذف: ${key}`);
        }

        // Clear any other edumaster-prefixed keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('edumaster_') && !dataKeys.includes(key.replace('edumaster_', ''))) {
                Storage.remove(key.replace('edumaster_', ''));
                console.log(`   ✓ تم حذف: ${key}`);
            }
        });

        // Flag to prevent demo data from re-seeding after restart
        localStorage.setItem('edumaster_skip_demo', 'true');

        // Brief pause to allow IDB to delete
        await new Promise(r => setTimeout(r, 500));
    },

    /**
     * Reinitialize system with minimal data
     */
    async reinitializeSystem() {
        console.log('\n🔄 إعادة تهيئة النظام...');

        // 1. Create default admin user only
        const users = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                name: 'المدير العام',
                role_id: 1, // SuperAdmin
                branch: null, // Global access
                is_active: true,
                created_at: new Date().toISOString()
            }
        ];
        await Storage.save('users', users);
        console.log('   ✓ تم إنشاء حساب المدير');

        // 2. Initialize roles
        const roles = [
            { id: 1, name: 'مدير النظام', level: 'superadmin' },
            { id: 2, name: 'مدير فرع', level: 'manager' },
            { id: 3, name: 'محاسب', level: 'accountant' },
            { id: 4, name: 'سكرتارية', level: 'secretary' }
        ];
        await Storage.save('roles', roles);
        console.log('   ✓ تم إنشاء الأدوار');

        // 3. Initialize Chart of Accounts (Essential Only)
        const coa = [
            // Assets
            { id: 1001, code: '1001', name: 'الصندوق', category: 'Asset', balance: 0 },
            { id: 1030, code: '1030', name: 'المخزون', category: 'Asset', balance: 0 },
            { id: 1040, code: '1040', name: 'العملاء', category: 'Asset', balance: 0 },

            // Liabilities
            { id: 2010, code: '2010', name: 'الموردون', category: 'Liability', balance: 0 },

            // Revenue
            { id: 4001, code: '4001', name: 'إيرادات الدورات', category: 'Revenue', balance: 0 },
            { id: 4020, code: '4020', name: 'إيرادات الكتب', category: 'Revenue', balance: 0 },

            // Expenses
            { id: 5001, code: '5001', name: 'المصروفات العامة', category: 'Expense', balance: 0 },
            { id: 5010, code: '5010', name: 'تكلفة البضاعة المباعة', category: 'Expense', balance: 0 }
        ];
        await Storage.save('coa', coa);
        console.log('   ✓ تم إنشاء الدليل المحاسبي');

        // 4. Initialize empty arrays for other data
        await Storage.save('students', []);
        await Storage.save('study_groups', []);
        await Storage.save('trainers', []);
        await Storage.save('branches', []);

        // Keep books if they exist, otherwise they will be seeded by core.js

        await Storage.save('transactions', []);
        await Storage.save('journal_entries', []);
        await Storage.save('attendance', []);
        await Storage.save('attendance_records', []);
        await Storage.save('audit_logs', []);
        console.log('   ✓ تم تهيئة الجداول الفارغة');

        // 5. Clear session
        localStorage.removeItem('edumaster_session');
        localStorage.removeItem('edumaster_view_branch');
        console.log('   ✓ تم مسح الجلسة الحالية');
    },

    /**
     * Soft reset - Keep structure, remove data only
     */
    softReset() {
        if (window.AudioCore) AudioCore.playWarning();

        Modal.confirm({
            title: '⚠️ تصفير البيانات التشغيلية فقط',
            message: 'سيتم حذف (الطلاب، المجموعات، المعاملات، والمخزون).\nسيتم الاحتفاظ بـ (المستخدمين، الفروع، والدليل المحاسبي).\nهل تريد المتابعة؟',
            confirmText: 'نعم، تهيئة البيانات',
            cancelText: 'إلغاء العملية',
            type: 'warning',
            icon: 'fa-eraser',
            onConfirm: () => {
                this._promptAuth((isValid) => {
                    if (isValid) this._executeSoftReset();
                });
            }
        });
    },

    _executeSoftReset() {
        console.log('🧹 بدء التصفير الجزئي...\n');

        // Clear only operational data
        Storage.save('students', []);
        Storage.save('groups', []);
        Storage.save('books', []);
        Storage.save('transactions', []);
        Storage.save('journal_entries', []);
        Storage.save('attendance', []);
        Storage.save('invoices', []);
        Storage.save('sales_invoices', []);
        Storage.save('purchase_invoices', []);

        // Reset COA balances to zero
        const coa = Storage.get('coa') || [];
        coa.forEach(account => account.balance = 0);
        Storage.save('coa', coa);

        console.log('✅ تم التصفير الجزئي بنجاح');

        Modal.success({
            title: 'مرحلة جديدة',
            message: 'تم تصفير البيانات التشغيلية بنجاح وتم الإبقاء على الهيكل الأساسي والموظفين للفروع.',
            onComplete: () => { location.reload(); }
        });
    },

    /**
     * Auth Prompt UI Master Code
     */
    _promptAuth(callback) {
        let modal = document.getElementById('system-reset-auth-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'system-reset-auth-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container" style="max-width: 480px; border-top: 5px solid #ef4444; border-radius: 18px;">
                    <button class="close-modal" onclick="Modal.close('system-reset-auth-modal')" style="position:absolute; left:20px; top:20px; background:transparent; border:none; font-size:1.5rem; color:var(--text-muted); cursor:pointer;">&times;</button>
                    <div class="modal-icon-wrapper" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; margin-bottom: 15px;">
                        <i class="fa-solid fa-shield-virus"></i>
                    </div>
                    <h2 class="modal-title" style="color:#ef4444; font-size: 1.4rem; margin-bottom: 10px;">إجراء أمني حرج</h2>
                    <p class="modal-message" style="margin-bottom: 25px;">يرجى إدخال <strong>كلمة مرور النظام الرئيسية</strong> للمتابعة وإتمام هذا الإجراء الخطير.</p>
                    <div style="position: relative; margin: 25px 0;">
                        <input type="password" id="reset-auth-pass" class="oval-input" placeholder="كلمة المرور الرئيسية..." autocomplete="off" style="width: 100%; padding: 18px 25px 18px 45px; font-size: 1.25rem; border: 2.5px solid rgba(239, 68, 68, 0.5); text-align: center; border-radius: 12px; font-weight: 900; background: var(--bg-main); letter-spacing: 4px; color: #ef4444; z-index: 10; position: relative; pointer-events: auto; user-select: text;">
                        <i class="fa-solid fa-eye" style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #ef4444; font-size: 1.3rem; padding: 5px; transition: 0.3s; z-index: 20;" onclick="const inp=document.getElementById('reset-auth-pass'); if(inp.type==='password'){inp.type='text';this.className='fa-solid fa-eye-slash';}else{inp.type='password';this.className='fa-solid fa-eye';}"></i>
                    </div>
                    <div class="modal-actions" style="margin-top: 30px;">
                        <button id="reset-auth-cancel" class="modal-btn modal-btn-cancel" style="flex:1;">إلغاء وإغلاق</button>
                        <button id="reset-auth-confirm" class="modal-btn modal-btn-confirm" style="background: #ef4444; flex:1.5;">تصريح الحذف (متابعة)</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const input = document.getElementById('reset-auth-pass');
        input.value = '';
        Modal.open('system-reset-auth-modal');

        // Auto-focus the password field so it's instantly active for typing
        setTimeout(() => {
            input.focus();
        }, 150);

        document.getElementById('reset-auth-cancel').onclick = () => {
            Modal.close('system-reset-auth-modal');
            callback(false);
        };

        const executeVerify = () => {
            const pass = input.value;
            if (pass !== 'admin135') {
                if (window.AudioCore) AudioCore.playWarning();
                Toast.show('كلمة المرور غير صحيحة! تم الرفض وتجميد العملية.', 'error');
                input.style.borderColor = 'red';
            } else {
                Modal.close('system-reset-auth-modal');
                callback(true);
            }
        };

        input.onkeydown = (e) => { if (e.key === 'Enter') executeVerify(); };
        document.getElementById('reset-auth-confirm').onclick = executeVerify;
    },

    /**
     * Get system statistics
     */
    getSystemStats() {
        const stats = {
            students: (Storage.get('students') || []).length,
            groups: (Storage.get('groups') || []).length,
            branches: (Storage.get('branches') || []).length,
            books: (Storage.get('books') || []).length,
            transactions: (Storage.get('transactions') || []).length,
            journalEntries: (Storage.get('journal_entries') || []).length,
            users: (Storage.get('users') || []).length
        };

        console.log('📊 إحصائيات النظام الحالية:');
        console.log(`   • الطلاب: ${stats.students}`);
        console.log(`   • المجموعات: ${stats.groups}`);
        console.log(`   • الفروع: ${stats.branches}`);
        console.log(`   • الكتب: ${stats.books}`);
        console.log(`   • المعاملات المالية: ${stats.transactions}`);
        console.log(`   • القيود المحاسبية: ${stats.journalEntries}`);
        console.log(`   • المستخدمين: ${stats.users}`);

        return stats;
    },

    /**
     * Export data before reset (optional)
     */
    exportBeforeReset() {
        const data = {
            students: Storage.get('students'),
            groups: Storage.get('groups'),
            branches: Storage.get('branches'),
            books: Storage.get('books'),
            transactions: Storage.get('transactions'),
            users: Storage.get('users'),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edumaster-backup-${Date.now()}.json`;
        a.click();

        console.log('✅ تم تصدير نسخة احتياطية');
        Toast.show('تم حفظ نسخة احتياطية', 'success');
    }
};

console.log('✅ System Reset Tool Loaded');
console.log('Commands:');
console.log('  SystemReset.factoryReset()     - تصفير كامل');
console.log('  SystemReset.softReset()        - تصفير البيانات فقط');
console.log('  SystemReset.getSystemStats()   - عرض الإحصائيات');
console.log('  SystemReset.exportBeforeReset() - تصدير نسخة احتياطية');
