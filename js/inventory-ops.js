/**
 * Purchase and Delivery UI Handlers
 */
import { Storage, Toast } from './core.js';
import { Accounting, Inventory } from './inventory.js';

export class PurchaseUI {
    constructor() {
        this.form = document.getElementById('purchase-form');
        this.bookList = document.getElementById('purchase-items');
        this.init();
    }

    init() {
        this.populateSelects();
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPurchase();
            });
        }
    }

    populateSelects() {
        const suppliers = Storage.get('suppliers') || [];
        const books = Storage.get('books') || [];

        const supplierSelect = document.querySelector('[name="supplier_id"]');
        const bookSelect = document.querySelector('[name="book_id"]');

        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">-- اختر المورد --</option>' +
                suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        if (bookSelect) {
            bookSelect.innerHTML = '<option value="">-- اختر الكتاب --</option>' +
                books.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }
    }

    processPurchase() {
        const formData = new FormData(this.form);
        const supplierId = formData.get('supplier_id');
        const bookId = formData.get('book_id');
        const qty = parseInt(formData.get('quantity'));
        const cost = parseFloat(formData.get('cost_price'));
        const total = qty * cost;

        const books = Storage.get('books') || [];
        const book = books.find(b => b.id === parseInt(bookId));
        const suppliers = Storage.get('suppliers') || [];
        const supplier = suppliers.find(s => s.id === parseInt(supplierId));

        // 1. Update Stock
        Inventory.updateStock(bookId, qty, 'add');

        // 2. Update Supplier Balance (Liability)
        Accounting.updateSupplierBalance(supplierId, total);

        // 3. Record Accounting Entry (Expense/Purchase)
        Accounting.recordTransaction(`شراء كمية (${qty}) من كتاب: ${book.name} - مورد: ${supplier.name}`, -total, 'Purchase');

        Toast.show('تم تسجيل فاتورة المشتريات وتحديث المخزون', 'success');
        this.form.reset();
    }
}

export class DeliveryUI {
    constructor() {
        this.form = document.getElementById('delivery-form');
        this.init();
    }

    init() {
        this.populateSelects();
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processDelivery();
            });
        }
    }

    populateSelects() {
        const students = Storage.get('students') || [];
        const books = Storage.get('books') || [];

        const studentSelect = document.querySelector('[name="student_id"]');
        const bookSelect = document.querySelector('[name="book_id"]');

        if (studentSelect) {
            studentSelect.innerHTML = '<option value="">-- اختر الطالب --</option>' +
                students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        if (bookSelect) {
            bookSelect.innerHTML = '<option value="">-- اختر الكتاب --</option>' +
                books.map(b => `<option value="${b.id}">${b.name} (المخزون: ${b.current_stock})</option>`).join('');
        }
    }

    processDelivery() {
        const formData = new FormData(this.form);
        const studentId = formData.get('student_id');
        const bookId = formData.get('book_id');
        const type = formData.get('delivery_type');

        const books = Storage.get('books') || [];
        const book = books.find(b => b.id === parseInt(bookId));
        const students = Storage.get('students') || [];
        const student = students.find(s => s.id === parseInt(studentId));

        if (book.current_stock <= 0) {
            Toast.show('عفواً، لا يوجد مخزون كافي!', 'error');
            return;
        }

        // 1. Reduce Stock
        Inventory.updateStock(bookId, 1, 'reduce');

        // 2. Financial Entry if Sold
        if (type === 'sold') {
            const price = book.selling_price;
            Accounting.recordTransaction(`بيع كتاب: ${book.name} للطالب: ${student.name}`, price, 'Sale');
            Toast.show(`تم التسليم وتسجيل إيراد بقيمة ${price} ج.م`, 'success');
        } else {
            Accounting.recordTransaction(`تسليم كتاب (مجاني/كورس): ${book.name} للطالب: ${student.name}`, 0, 'Delivery');
            Toast.show('تم التسليم بنجاح (بدون رسوم إضافية)', 'success');
        }

        this.form.reset();
        this.populateSelects(); // Refresh stock labels
    }
}
