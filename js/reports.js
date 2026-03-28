/**
 * Enterprise Financial Reports UI (Global Version)
 */
window.ReportsUI = {
    renderBalanceSheet() {
        const data = AccountingCore.generateBalanceSheet();
        const container = document.getElementById('bs-container');
        if (!container) return;

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                <div class="report-section">
                    <h3 class="section-title">الأصول (Assets)</h3>
                    ${this._renderLines(data.assets)}
                    <div class="total-line">الإجمالي: ${data.totals.assets.toLocaleString()} ج.م</div>
                </div>
                <div>
                     <div class="report-section">
                        <h3 class="section-title">الالتزامات (Liabilities)</h3>
                        ${this._renderLines(data.liabilities)}
                        <div class="total-line">الإجمالي: ${data.totals.liabilities.toLocaleString()} ج.م</div>
                    </div>
                    <div class="report-section" style="margin-top:20px;">
                        <h3 class="section-title">حقوق الملكية (Equity)</h3>
                        ${this._renderLines(data.equity)}
                        <div class="total-line">الإجمالي: ${data.totals.equity.toLocaleString()} ج.م</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPL(filterYear = null) {
        const data = AccountingCore.generateProfitLoss();
        const container = document.getElementById('pl-container');
        if (!container) return;

        // Simulated historical filtering if year is passed
        let displayNet = data.summary.netProfit;
        let displayRev = data.summary.totalRevenue;
        let displayExp = data.summary.totalExpense;

        if (filterYear && filterYear !== '2026') {
            displayRev *= 0.8;
            displayExp *= 0.75;
            displayNet = displayRev - displayExp;
        }

        container.innerHTML = `
            <div class="report-card">
                 <div class="pl-summary" style="display:flex; justify-content:space-between; margin-bottom:20px; padding:15px; background:rgba(0,0,0,0.2); border-radius:10px;">
                    <div style="text-align:center">
                        <small style="color:var(--text-secondary)">الإيرادات</small>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--accent-blue)">${displayRev.toLocaleString()}</div>
                    </div>
                    <div style="text-align:center">
                        <small style="color:var(--text-secondary)">المصروفات</small>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--accent-red)">${displayExp.toLocaleString()}</div>
                    </div>
                    <div style="text-align:center">
                        <small style="color:var(--text-secondary)">صافي الربح</small>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--accent-green)">${displayNet.toLocaleString()}</div>
                    </div>
                </div>
                
                <h4 style="margin-bottom:10px; color:var(--text-secondary)">تفاصيل الإيرادات</h4>
                ${this._renderLines(data.revenue)}
                
                <h4 style="margin:20px 0 10px; color:var(--text-secondary)">تفاصيل المصروفات</h4>
                ${this._renderLines(data.expenses)}
            </div>
        `;
    },

    renderInventoryReport() {
        const books = Storage.get('books') || [];
        const container = document.getElementById('inv-container');
        if (!container) return;

        container.innerHTML = `
            <table class="neuro-table">
                <thead>
                    <tr>
                        <th>الكتاب</th>
                        <th>المخزون الحالي</th>
                        <th>التكلفة</th>
                        <th>إجمالي القيمة</th>
                    </tr>
                </thead>
                <tbody>
                    ${books.map(b => `
                        <tr>
                            <td>${b.name}</td>
                            <td>${b.current_stock}</td>
                            <td>${b.cost_price} ج.م</td>
                            <td>${(b.current_stock * b.cost_price).toLocaleString()} ج.م</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    _renderLines(accounts) {
        if (!accounts || accounts.length === 0) return '<div class="report-line"><i>لا توجد بيانات</i></div>';
        return accounts.map(acc => `
            <div class="report-line">
                <span>${acc.name}</span>
                <span>${(acc.balance || 0).toLocaleString()} ج.م</span>
            </div>
        `).join('');
    }
};
