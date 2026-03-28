/**
 * Enterprise Inventory Engine (Global Version)
 * Handles stock logic, accounting integration, and audit logging.
 */
window.InventoryEngine = {
    // CRUD Operations
    saveBook(bookData) {
        const books = Storage.get('books') || [];
        const isEdit = !!bookData.id;

        if (isEdit) {
            const index = books.findIndex(b => b.id === parseInt(bookData.id));
            if (index !== -1) {
                const oldBook = { ...books[index] };
                books[index] = { ...books[index], ...bookData, updated_at: new Date().toISOString() };
                this.logAudit('UPDATE_BOOK', bookData.id, `تعديل بيانات الكتاب: ${bookData.name}`, oldBook, books[index]);
            }
        } else {
            const newBook = {
                ...bookData,
                id: Date.now(),
                created_at: new Date().toISOString(),
                is_active: true,
                current_stock: parseInt(bookData.initial_stock) || 0
            };
            books.push(newBook);
            this.logAudit('CREATE_BOOK', newBook.id, `إضافة كتاب جديد: ${newBook.name}`);

            // Initial stock accounting if > 0
            if (newBook.current_stock > 0) {
                this.recordPurchase(newBook.id, newBook.current_stock, newBook.cost_price, 'رصيد أول المدة');
            }
        }

        Storage.save('books', books);
        return true;
    },

    softDeleteBook(id) {
        const books = Storage.get('books') || [];
        const index = books.findIndex(b => b.id === parseInt(id));
        if (index !== -1) {
            books[index].is_active = false;
            Storage.save('books', books);
            this.logAudit('DELETE_BOOK', id, `حذف (مؤقت) للكتاب: ${books[index].name}`);
            return true;
        }
        return false;
    },

    // --- Accounting Helper ---
    recordPurchase(bookId, qty, price, method = 'Cash') {
        const total = qty * price;
        const journalLines = [
            { account_id: 1030, debit: total, credit: 0 }, // Inventory
            { account_id: method === 'Cash' ? 1010 : 2010, debit: 0, credit: total }
        ];
        if (window.AccountingCore) {
            AccountingCore.postJournal(`شراء مخزون كتاب id:${bookId}`, journalLines);
        }
    },

    // --- Bulk Transactional Logic (Invoices) ---
    recordBulkPurchase(invoice) {
        const books = Storage.get('books') || [];
        const purchases = Storage.get('purchase_invoices') || [];
        let grandTotal = 0;
        const journalLines = [];

        invoice.items.forEach(item => {
            const bookId = parseInt(item.book_id);
            const book = books.find(b => b.id === bookId);
            if (book) {
                const itemTotal = item.qty * item.price;
                book.current_stock += item.qty;
                grandTotal += itemTotal;
                journalLines.push({ account_id: 1030, debit: itemTotal, credit: 0 }); // Inventory
            }
        });

        const creditAccount = invoice.payment_method === 'credit' ? 2010 : 1010;
        journalLines.push({ account_id: creditAccount, debit: 0, credit: grandTotal });

        Storage.save('books', books);
        if (window.AccountingCore) {
            AccountingCore.postJournal(`فاتورة شراء رقم ${invoice.invoice_no}`, journalLines);
        }

        purchases.unshift({ ...invoice, total: grandTotal });
        Storage.save('purchase_invoices', purchases);
        this.logAudit('PURCHASE_INVOICE', invoice.id, `تسجيل فاتورة شراء: ${invoice.invoice_no}`);
    },

    recordBulkSale(invoice) {
        const books = Storage.get('books') || [];
        const sales = Storage.get('sales_invoices') || [];
        let grandTotal = 0;
        let totalCOGS = 0;
        const revenueLines = [];
        const cogsLines = [];

        invoice.items.forEach(item => {
            const bookId = parseInt(item.book_id);
            const book = books.find(b => b.id === bookId);

            if (!book || book.current_stock < item.qty) {
                throw new Error(`المخزون غير كافي للكتاب: ${book?.name || bookId}`);
            }

            const itemSaleTotal = item.qty * item.price;
            const itemCostTotal = item.qty * (book.cost_price || 0);

            book.current_stock -= item.qty;
            grandTotal += itemSaleTotal;
            totalCOGS += itemCostTotal;

            revenueLines.push({ account_id: 4020, debit: 0, credit: itemSaleTotal });
        });

        const debitAccount = 1040;
        revenueLines.push({ account_id: debitAccount, debit: grandTotal, credit: 0 });

        cogsLines.push({ account_id: 5010, debit: totalCOGS, credit: 0 });
        cogsLines.push({ account_id: 1030, debit: 0, credit: totalCOGS });

        Storage.save('books', books);
        if (window.AccountingCore) {
            AccountingCore.postJournal(`فاتورة مبيعات كتب للفرع/الطالب`, revenueLines);
            AccountingCore.postJournal(`إثبات تكلفة البضاعة المباعة (فهرس مبيعات)`, cogsLines);
        }

        sales.unshift({ ...invoice, total: grandTotal, cogs: totalCOGS });
        Storage.save('sales_invoices', sales);
        this.logAudit('SALES_INVOICE', invoice.id, `تسجيل فاتورة مبيعات بمبلغ ${grandTotal}`);
    },

    logAudit(action, recordId, details, oldVal = null, newVal = null) {
        const logs = Storage.get('audit_logs') || [];
        logs.unshift({
            id: Date.now(),
            user: 'admin',
            action,
            recordId,
            details,
            old_value: oldVal,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        Storage.save('audit_logs', logs);
    },

    // --- 📦 SMART DELIVERY ALERT ---
    checkLowStock() {
        const books = Storage.get('books') || [];
        const lowStock = books.filter(b => b.is_active && b.current_stock <= (b.min_limit || 5));
        if (lowStock.length > 0 && window.Toast) {
            Toast.show(`⚠️ تنبيه: لديك ${lowStock.length} مذكرات اقترب مخزونها من النفاذ!`, 'warning');
        }
    }
};

window.SchedulerEngine = {
    /**
     * Check if a teacher or room has a conflict
     */
    checkConflict(teacherId, day, time) {
        const groups = (Storage.get('study_groups') || []).filter(g => g.day === day && g.time === time);

        // 1. Teacher Conflict
        const teacherConflict = groups.find(g => g.trainerId == teacherId);
        if (teacherConflict) {
            return { hasConflict: true, msg: `⚠️ تعارض! المحاضر لديه مجموعة "${teacherConflict.name}" في نفس الموعد.` };
        }

        // 2. Room Conflict (Optional if room_id exists)
        return { hasConflict: false };
    }
};

console.log('📅 Inventory & Scheduler Engine Enhanced.');
