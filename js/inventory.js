/**
 * Inventory & Ledger UI Controller (Global Version)
 */
window.InventoryUI = class InventoryUI {
    constructor() {
        this.container = document.querySelector('#books-table tbody');
        this.init();
    }
    init() {
        if (!this.container) return;
        this.renderBooks();
        this.attachEvents();
    }
    renderBooks() {
        const books = Storage.get('books') || [];
        this.container.innerHTML = books.map(book => `
            <tr>
                <td>${book.id}</td>
                <td>${book.name}</td>
                <td style="text-align:center;">${book.current_stock}</td>
                <td><span class="status-badge status-confirmed">نشط</span></td>
            </tr>
        `).join('');
    }
    attachEvents() { }
};

window.LedgerUI = class LedgerUI {
    constructor() {
        this.table = document.querySelector('#ledger-table tbody');
        this.init();
    }
    init() {
        if (!this.table) return;
        this.renderJournal();
    }
    renderJournal() {
        const journal = Storage.get('journal_entries') || [];
        const activeBranchId = window.Permissions?.getActiveBranchId();

        // Use core for stats
        const pl = AccountingCore.generateProfitLoss(activeBranchId);
        const OB = pl.summary.totalOpening;

        // Filter by branch
        let filteredJournal = journal;
        if (activeBranchId) {
            filteredJournal = journal.filter(entry => !entry.branchId || parseInt(entry.branchId) === parseInt(activeBranchId));
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        let html = `
            <tr class="opening-row" style="background: rgba(0, 234, 255, 0.05); border-right: 4px solid var(--accent-teal);">
                <td style="font-family: 'Inter', sans-serif; font-size: 0.9rem; color: var(--cyan-accent);">
                    <div style="font-weight: 900;">${year}-${month}-01</div>
                    <code style="font-size: 0.7rem; opacity: 0.6;">OPENING</code>
                </td>
                <td style="font-weight: 800; color: #fff; font-size: 1.1rem;">الرصيد الافتتاحي (أول الشهر)</td>
                <td style="text-align:center; color: #64748b;">-</td>
                <td style="color: #94a3b8; font-weight: 700;">رصيد أول المدة</td>
                <td style="text-align:center; color: var(--cyan-accent); font-weight: 900; font-size: 1.2rem;">${OB > 0 ? OB.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                <td style="text-align:center; color: #64748b;">-</td>
            </tr>
        `;

        html += filteredJournal.map(entry => {
            return (entry.lines || []).map((line, idx) => `
                <tr class="je-group-row" style="${idx === 0 ? 'border-top: 2px solid rgba(255,255,255,0.08)' : ''}">
                    <td style="font-family: 'Inter', sans-serif; font-size: 0.85rem; vertical-align: top; padding-top: 20px;">
                        ${idx === 0 ? `
                            <div style="font-weight: 800; color: var(--text-main);">${entry.date}</div>
                            <code style="font-size: 0.7rem; color: var(--cyan-accent); background: rgba(0, 234, 255, 0.05); padding: 2px 5px; border-radius: 4px;">JE-${entry.id.toString().slice(-6)}</code>
                        ` : ''}
                    </td>
                    <td style="vertical-align: top; padding-top: 20px;">
                        ${idx === 0 ? `<div style="font-weight: 800; color: var(--text-main); font-size: 1.15rem;">${entry.description}</div>` : ''}
                    </td>
                    <td style="vertical-align: top; padding-top: 20px; font-weight: 700; color: var(--text-muted); font-size: 0.85rem;">
                        ${idx === 0 ? (entry.created_by || '-') : ''}
                    </td>
                    <td style="font-weight: 700; color: var(--text-main); font-size: 1.05rem; padding: 15px 10px;">
                        <i class="fa-solid fa-caret-left" style="font-size: 0.7rem; color: var(--cyan-accent); margin-left:8px;"></i>${this.getAccountName(line.account_id)}
                    </td>
                    <td style="text-align:center; color: #10b981; font-weight: 900; font-size: 1.2rem; background: rgba(16, 185, 129, 0.02); border-left: 1px solid rgba(16, 185, 129, 0.1);">
                        ${line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td style="text-align:center; color: #ef4444; font-weight: 900; font-size: 1.2rem; background: rgba(239, 68, 68, 0.02); border-left: 1px solid rgba(239, 68, 68, 0.1);">
                        ${line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                </tr>
            `).join('');
        }).join('');

        this.table.innerHTML = html;
    }

    deleteJournalEntry(id) {
        if (window.Modal) {
            Modal.secureDelete(`القيد رقم ${id}`, () => {
                const journal = Storage.get('journal_entries') || [];
                const filtered = journal.filter(e => e.id != id);
                Storage.save('journal_entries', filtered);
                Toast.show('تم حذف القيد وتعديل الموقف المالي بنجاح', 'success');
                setTimeout(() => location.reload(), 1000);
            });
        }
    }

    getAccountName(id) {
        const coa = Storage.get('coa') || [];
        const acc = coa.find(a => a.id == id);
        return acc ? acc.name : id;
    }
};

window.deleteJournalEntry = (id) => {
    // Disabled from UI as per user request to maintain audit trail.
    console.warn("Delete journal entry is disabled for integrity.");
};

window.DeliveryUI = class DeliveryUI {
    constructor() {
        this.form = document.getElementById('delivery-form');
        this.init();
    }
    init() {
        this.populateDDs();
        if (this.form) {
            this.form.onsubmit = (e) => {
                e.preventDefault();
                this.handleDelivery();
            };
        }
    }
    populateDDs() {
        const students = Storage.get('students') || [];
        const books = Storage.get('books') || [];
        const studSel = document.querySelector('[name="student_id"]');
        const bookSel = document.querySelector('[name="book_id"]');
        if (studSel) studSel.innerHTML = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (bookSel) bookSel.innerHTML = books.map(b => `<option value="${b.id}">${b.name} (المخزون: ${b.current_stock})</option>`).join('');
    }
    handleDelivery() {
        Toast.show('تمت عملية المحاكاة بنجاح', 'success');
    }
};
