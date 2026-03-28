/**
 * PDF Invoice Generator System
 * Auto-generates PDF invoices for all transactions
 * Uses jsPDF library for client-side PDF generation
 */

window.InvoiceGenerator = {
    /**
     * Generate invoice for a transaction
     */
    generateInvoice: function (transactionData) {
        const invoice = {
            id: `INV-${Date.now()}`,
            invoice_number: this.generateInvoiceNumber(),
            transaction_id: transactionData.id,
            date: new Date().toISOString(),
            student_name: transactionData.student_name || transactionData.customerName,
            student_id: transactionData.student_id,
            items: transactionData.items || [{
                name: transactionData.description || transactionData.item,
                quantity: transactionData.quantity || 1,
                price: transactionData.amount,
                total: transactionData.amount
            }],
            subtotal: transactionData.amount,
            tax: transactionData.tax || 0,
            total: transactionData.amount + (transactionData.tax || 0),
            employee_name: transactionData.created_by || (window.Permissions && Permissions.getCurrentUser() ? Permissions.getCurrentUser().name : 'الموظف'),
            employee_id: transactionData.employee_id || (window.Permissions && Permissions.getCurrentUser() ? Permissions.getCurrentUser().id : null),
            branch_name: transactionData.branch_name || 'الفرع الرئيسي',
            branch_id: transactionData.branch_id,
            receipt_no: transactionData.receipt_no || '',
            payment_method: transactionData.payment_method || 'نقدي',
            notes: transactionData.notes || '',
            created_at: new Date().toISOString()
        };

        // Save invoice to storage
        this.saveInvoice(invoice);

        return invoice;
    },

    /**
     * Generate unique invoice number
     */
    generateInvoiceNumber: function () {
        const invoices = Storage.get('invoices') || [];
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const count = invoices.filter(inv => inv.invoice_number.startsWith(`${year}${month}`)).length + 1;

        return `${year}${month}${String(count).padStart(4, '0')}`;
    },

    /**
     * Save invoice to storage
     */
    saveInvoice: function (invoice) {
        const invoices = Storage.get('invoices') || [];
        invoices.push(invoice);
        Storage.save('invoices', invoices);
        return invoice;
    },

    /**
     * Get invoice by ID
     */
    getInvoice: function (invoiceId) {
        const invoices = Storage.get('invoices') || [];
        return invoices.find(inv => inv.id === invoiceId);
    },

    /**
     * Get all invoices
     */
    getAllInvoices: function (filters = {}) {
        let invoices = Storage.get('invoices') || [];

        if (filters.startDate) {
            invoices = invoices.filter(inv => inv.date >= filters.startDate);
        }
        if (filters.endDate) {
            invoices = invoices.filter(inv => inv.date <= filters.endDate);
        }
        if (filters.branchId) {
            invoices = invoices.filter(inv => inv.branch_id === filters.branchId);
        }
        if (filters.studentId) {
            invoices = invoices.filter(inv => inv.student_id === filters.studentId);
        }

        return invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Generate PDF invoice (HTML-based for printing)
     */
    generatePDFHTML: function (invoice) {
        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>فاتورة ${invoice.invoice_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Tajawal', Arial, sans-serif;
            padding: 40px;
            background: #fff;
            color: #000;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 30px;
        }
        .invoice-header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .invoice-header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            color: #0ea5e9;
        }
        .invoice-header p {
            font-size: 14px;
            color: #666;
        }
        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-block {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .info-block h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        .info-block p {
            font-size: 16px;
            font-weight: 600;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .invoice-table th {
            background: #0ea5e9;
            color: #fff;
            padding: 12px;
            text-align: right;
            font-size: 14px;
        }
        .invoice-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            text-align: right;
        }
        .invoice-table tr:last-child td {
            border-bottom: none;
        }
        .invoice-totals {
            text-align: left;
            margin-bottom: 30px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .total-row.grand-total {
            border-top: 2px solid #000;
            padding-top: 12px;
            margin-top: 12px;
            font-size: 20px;
            font-weight: 700;
            color: #0ea5e9;
        }
        .invoice-footer {
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #000;
            color: #666;
            font-size: 12px;
        }
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-line {
            border-top: 2px solid #000;
            margin-top: 60px;
            padding-top: 10px;
        }
        @media print {
            body {
                padding: 0;
            }
            .invoice-container {
                border: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
            <h1>🎓 EduMaster Pro</h1>
            <p>نظام إدارة المعاهد التعليمية المتكامل</p>
            <div style="display: flex; justify-content: center; gap: 20px; align-items: center; margin-top: 15px;">
                <p style="font-size: 16px; font-weight: 600; background: #0ea5e9; color: #fff; padding: 5px 15px; border-radius: 5px;">فاتورة رقم: ${invoice.invoice_number}</p>
                ${invoice.receipt_no ? `<p style="font-size: 16px; font-weight: 600; background: #10b981; color: #fff; padding: 5px 15px; border-radius: 5px;">إيصال يدوي: ${invoice.receipt_no}</p>` : ''}
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
            <div class="invoice-info" style="flex: 1; margin-bottom: 0;">
                <div class="info-block">
                    <h3>التاريخ</h3>
                    <p>${new Date(invoice.date).toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="info-block">
                    <h3>الفرع</h3>
                    <p>${invoice.branch_name}</p>
                </div>
                <div class="info-block">
                    <h3>اسم الطالب</h3>
                    <p>${invoice.student_name}</p>
                </div>
                <div class="info-block">
                    <h3>الموظف المسؤول</h3>
                    <p>${invoice.employee_name}</p>
                </div>
            </div>
            
            <div style="width: 150px; text-align: center;">
                <div style="border: 2px solid #000; padding: 10px; border-radius: 10px; background: #fff;">
                    <div style="width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; background: #f9f9f9;">
                         <i class="fa-solid fa-qrcode" style="font-size: 60px; color: #333; opacity: 0.2;"></i>
                    </div>
                    <p style="font-size: 10px; color: #666; margin-top: 5px; font-weight: 700;">QR VERIFICATION</p>
                </div>
                <div style="margin-top: 15px; border: 2px double #10b981; color: #10b981; padding: 5px; border-radius: 50%; font-size: 10px; font-weight: 900; transform: rotate(-15deg);">
                    OFFICIAL STAMP<br>${invoice.branch_name}
                </div>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th>البند</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${Formatter.formatCurrency(item.price)} ج.م</td>
                        <td>${Formatter.formatCurrency(item.total)} ج.م</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="invoice-totals">
            <div class="total-row">
                <span>المجموع الفرعي:</span>
                <span>${Formatter.formatCurrency(invoice.subtotal)} ج.م</span>
            </div>
            ${invoice.tax > 0 ? `
            <div class="total-row">
                <span>الضريبة:</span>
                <span>${Formatter.formatCurrency(invoice.tax)} ج.م</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
                <span>الإجمالي الكلي:</span>
                <span>${Formatter.formatCurrency(invoice.total)} ج.م</span>
            </div>
        </div>

        ${invoice.notes ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">ملاحظات:</h3>
            <p>${invoice.notes}</p>
        </div>
        ` : ''}

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">توقيع الموظف</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">توقيع العميل</div>
            </div>
        </div>

        <div class="invoice-footer">
            <p>شكراً لتعاملكم معنا</p>
            <p style="margin-top: 5px;">تم الإنشاء بواسطة EduMaster Pro - ${new Date(invoice.created_at).toLocaleString('ar-EG')}</p>
        </div>
    </div>
</body>
</html>
        `;

        return html;
    },

    /**
     * Print invoice
     */
    printInvoice: function (invoice) {
        const html = this.generatePDFHTML(invoice);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = function () {
            printWindow.print();
        };
    },

    /**
     * Download invoice as HTML
     */
    downloadInvoice: function (invoice) {
        const html = this.generatePDFHTML(invoice);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoice_number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Auto-generate invoice for transaction
     */
    autoGenerateForTransaction: function (transaction) {
        const invoice = this.generateInvoice(transaction);

        // Log activity
        if (typeof ActivityLogger !== 'undefined') {
            ActivityLogger.log('invoice_generated', {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount: invoice.total
            });
        }

        return invoice;
    },

    /**
     * Get invoice statistics
     */
    getInvoiceStats: function (startDate, endDate, branchId = null) {
        let invoices = this.getAllInvoices({ startDate, endDate, branchId });

        const total = invoices.length;
        const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const avgAmount = total > 0 ? totalAmount / total : 0;

        return {
            total: total,
            totalAmount: totalAmount,
            avgAmount: avgAmount,
            invoices: invoices
        };
    }
};

console.log('✅ PDF Invoice Generator loaded');
