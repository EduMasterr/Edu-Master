/**
 * Enterprise Double-Entry Accounting Engine
 */
import { Storage, Toast } from './core.js';

export const AccountingEngine = {
    /**
     * Post a Journal Entry
     * @param {string} description Transaction reason
     * @param {Array} debits [{ account_id, amount }]
     * @param {Array} credits [{ account_id, amount }]
     * @param {Object} metadata { ref_type, ref_id }
     */
    postEntry(description, debits, credits, metadata = {}) {
        // Validation: Sum Debits == Sum Credits
        const sumDebits = debits.reduce((sum, item) => sum + item.amount, 0);
        const sumCredits = credits.reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(sumDebits - sumCredits) > 0.01) {
            console.error('[AccountingEngine] Journal mismatch!', { debits, credits });
            throw new Error('قيد غير متوازن: مجموع المدين لا يساوي مجموع الدائن');
        }

        const journal = Storage.get('journal') || [];
        const entry = {
            id: 'JE-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            description,
            items: [
                ...debits.map(d => ({ account_id: d.account_id, debit: d.amount, credit: 0 })),
                ...credits.map(c => ({ account_id: c.account_id, debit: 0, credit: c.amount }))
            ],
            ...metadata
        };

        journal.unshift(entry);
        Storage.save('journal', journal);

        // Update COA Balances
        this.updateBalances(debits, credits);

        console.log(`[AccountingEngine] Entry Posted: ${description}`);
        return entry.id;
    },

    updateBalances(debits, credits) {
        const coa = Storage.get('coa') || [];

        debits.forEach(d => {
            const acc = coa.find(a => a.id === d.account_id);
            if (acc) {
                // Assets & Expenses increase with Debit
                if (['Assets', 'Expenses'].includes(acc.category)) acc.balance += d.amount;
                else acc.balance -= d.amount;
            }
        });

        credits.forEach(c => {
            const acc = coa.find(a => a.id === c.account_id);
            if (acc) {
                // Liabilities, Revenue, Equity increase with Credit
                if (['Liabilities', 'Revenue', 'Equity'].includes(acc.category)) acc.balance += c.amount;
                else acc.balance -= c.amount;
            }
        });

        Storage.save('coa', coa);
    },

    // Get Account current balance
    getAccountBalance(accountId) {
        const coa = Storage.get('coa') || [];
        const acc = coa.find(a => a.id === accountId);
        return acc ? acc.balance : 0;
    }
};

/**
 * Enterprise Inventory Logic
 */
export const InventoryEngine = {
    // Process Purchase Invoice
    receiveStock(invoiceData) {
        const { supplier_id, branch_id, items, payment_methods } = invoiceData;
        const books = Storage.get('books') || [];
        let totalValuation = 0;

        items.forEach(item => {
            const bookIndex = books.findIndex(b => b.id === parseInt(item.book_id));
            if (bookIndex !== -1) {
                books[bookIndex].current_stock += parseInt(item.qty);
                // Optional: Update cost price using weighted average
                totalValuation += item.qty * item.cost;
            }
        });

        Storage.save('books', books);

        // Accounting Posting
        // Debit: Inventory (1030)
        // Credit: Accounts Payable (2010) or Cash (1010)

        const totalPaid = payment_methods.reduce((sum, p) => sum + p.amount, 0);
        const remaining = totalValuation - totalPaid;

        const debits = [{ account_id: 1030, amount: totalValuation }];
        const credits = [];

        if (totalPaid > 0) credits.push({ account_id: 1010, amount: totalPaid });
        if (remaining > 0) credits.push({ account_id: 2010, amount: remaining });

        AccountingEngine.postEntry(
            `شراء كتب - فاتورة توريد من مورد id:${supplier_id}`,
            debits,
            credits,
            { ref_type: 'Purchase', ref_id: supplier_id }
        );

        Toast.show('تم حفظ الفاتورة وتحديث المخزون والقيود المحاسبية', 'success');
    },

    // Process Sale / Distribution
    deliverBook(studentId, bookId, type) {
        const books = Storage.get('books') || [];
        const book = books.find(b => b.id === parseInt(bookId));

        if (!book || book.current_stock <= 0) {
            Toast.show('المخزون غير كافي للعملية', 'error');
            return false;
        }

        book.current_stock -= 1;
        Storage.save('books', books);

        if (type === 'sold') {
            // Posting Sales
            // Debit: Students Receivable (1040)
            // Credit: Revenue (4010)
            AccountingEngine.postEntry(
                `بيع كتاب: ${book.name} لطالب id:${studentId}`,
                [{ account_id: 1040, amount: book.selling_price }],
                [{ account_id: 4010, amount: book.selling_price }],
                { ref_type: 'Sale', ref_id: studentId }
            );

            // Cost of Goods Sold Posting
            // Debit: COGS (5010)
            // Credit: Inventory (1030)
            AccountingEngine.postEntry(
                `تكلفة مبيعات: ${book.name}`,
                [{ account_id: 5010, amount: book.cost_price }],
                [{ account_id: 1030, amount: book.cost_price }]
            );
        }

        return true;
    }
};
