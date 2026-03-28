/**
 * Books Page UI Controller (Global Version)
 * Manages CRUD operations and UI state for books.html.
 */
window.BooksUI = {
    init() {
        this.renderBooks();
        this.setupEventListeners();
        this.applyPermissions();
    },

    setupEventListeners() {
        const form = document.getElementById('book-form');
        if (form) {
            form.onsubmit = (e) => this.handleSave(e);
        }
    },

    applyPermissions() {
        if (window.Permissions && !Permissions.hasPermission('manage_inventory')) {
            const addBtn = document.querySelector('[onclick*="openAddModal"]');
            if (addBtn) addBtn.remove();
        }
    },

    renderBooks() {
        const books = Storage.get('books') || [];
        const activeBooks = books.filter(b => b.is_active !== false);
        const tableBody = document.querySelector('#books-table tbody');

        if (!tableBody) return;

        const catLabels = {
            'book': '<i class="fa-solid fa-book" style="margin-left:5px; color:var(--accent-teal);"></i> كتاب / منهج',
            'stationery': '<i class="fa-solid fa-pen-nib" style="margin-left:5px; color:var(--accent-purple);"></i> أدوات مكتبية',
            'printer': '<i class="fa-solid fa-print" style="margin-left:5px; color:var(--accent-brick);"></i> أحبار وورق',
            'other': '<i class="fa-solid fa-box" style="margin-left:5px; color:gray;"></i> مستلزمات أخرى'
        };

        tableBody.innerHTML = activeBooks.map(book => `
            <tr>
                <td><code>${book.barcode || book.book_code || '---'}</code></td>
                <td><strong>${book.name}</strong></td>
                <td><small style="font-weight:700; color:var(--text-secondary);">${catLabels[book.category] || catLabels['book']}</small></td>
                <td>${(book.cost_price || 0).toLocaleString()} ج.م</td>
                <td>${(book.selling_price || 0).toLocaleString()} ج.م</td>
                <td>
                    <span class="status-badge ${book.current_stock <= (book.min_stock || 5) ? 'status-pending' : 'status-confirmed'}">
                        ${book.current_stock}
                    </span>
                    ${book.current_stock <= (book.min_stock || 5) ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red); margin-right:5px;"></i>' : ''}
                </td>
                <td>
                    <div class="action-group" style="display:flex; gap:8px;">
                        <button class="app-btn-secondary" onclick="window.editBook(${book.id})" style="padding: 6px 12px; font-size: 0.8rem; height: 32px; border-radius: 8px;">
                            <i class="fa-solid fa-edit"></i> تعديل
                        </button>
                        <button class="app-btn-secondary" onclick="window.deleteBook(${book.id})" style="padding: 6px 12px; font-size: 0.8rem; height: 32px; border-radius: 8px; color: #ef4444; border-color: #fee2e2;">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center; padding:30px;">لا يوجد أصناف مسجلة حالياً</td></tr>';
    },

    handleSave(e) {
        e.preventDefault();
        const form = document.getElementById('book-form');
        const fd = new FormData(form);
        const data = {
            id: fd.get('book_id'),
            name: fd.get('name'),
            category: fd.get('category') || 'book', // Capture category
            barcode: fd.get('barcode'),
            cost_price: parseFloat(fd.get('cost_price')),
            selling_price: parseFloat(fd.get('selling_price')),
            initial_stock: parseInt(fd.get('initial_stock') || 0),
            min_stock: parseInt(fd.get('min_stock') || 5),
            branch_id: 1 // Default branch
        };

        if (data.selling_price < data.cost_price) {
            if (!confirm('سعر البيع أقل من سعر الشراء، هل تريد الاستمرار؟')) return;
        }

        try {
            if (window.InventoryEngine) {
                InventoryEngine.saveBook(data);
                Toast.show('تم حفظ البيانات بنجاح', 'success');
                Modal.close('book-modal');
                this.renderBooks();
                form.reset();
            }
        } catch (err) {
            Toast.show('خطأ في الحفظ: ' + err.message, 'error');
        }
    }
};

// Global Exposure for HTML onclicks
window.editBook = (id) => {
    const books = Storage.get('books') || [];
    const book = books.find(b => b.id === id);
    if (!book) return;

    const form = document.getElementById('book-form');
    form.querySelector('[name="book_id"]').value = book.id;
    form.querySelector('[name="name"]').value = book.name;
    form.querySelector('[name="category"]').value = book.category || 'book';
    form.querySelector('[name="barcode"]').value = book.barcode || '';
    form.querySelector('[name="cost_price"]').value = book.cost_price;
    form.querySelector('[name="selling_price"]').value = book.selling_price;
    form.querySelector('[name="min_stock"]').value = book.min_stock || 5;

    const delBtn = document.getElementById('delete-book-modal-btn');
    if (delBtn) {
        delBtn.style.display = 'flex';
        delBtn.onclick = () => window.deleteBook(book.id);
    }

    const stockField = form.querySelector('[name="initial_stock"]');
    if (stockField) stockField.parentElement.style.display = 'none';

    document.querySelector('.modal-title').innerText = 'تعديل بيانات الصنف';
    Modal.open('book-modal');
};

window.deleteBook = (id) => {
    const books = Storage.get('books') || [];
    const book = books.find(b => b.id === id);
    if (!book) return;

    Modal.secureDelete(`الصنف: ${book.name}`, () => {
        if (window.InventoryEngine) {
            InventoryEngine.softDeleteBook(id);
            Toast.show('تم حذف الصنف بنجاح', 'info');
            Modal.close('book-modal');
            BooksUI.renderBooks();
        }
    });
};

window.openAddModal = () => {
    const form = document.getElementById('book-form');
    form.reset();
    form.querySelector('[name="book_id"]').value = '';

    const delBtn = document.getElementById('delete-book-modal-btn');
    if (delBtn) delBtn.style.display = 'none';

    const stockField = form.querySelector('[name="initial_stock"]');
    if (stockField) stockField.parentElement.style.display = 'block';

    document.querySelector('.modal-title').innerText = 'إضافة صنف جديد للمخزن';
    Modal.open('book-modal');
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (window.location.pathname.includes('books.html')) BooksUI.init(); });
} else {
    if (window.location.pathname.includes('books.html')) BooksUI.init();
}
