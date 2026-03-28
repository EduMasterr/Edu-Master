/**
 * Financial Analytics and Business Intelligence Logic
 */
import { Storage } from './core.js';
import { AccountingEngine } from './accounting.js';

class AnalyticsUI {
    constructor() {
        this.init();
    }

    init() {
        this.renderStats();
        this.renderCharts();
    }

    renderStats() {
        const coa = Storage.get('coa') || [];
        const books = Storage.get('books') || [];

        // 1. Inventory Valuation (Assets - Account 1030)
        const invVal = coa.find(a => a.id === 1030)?.balance || 0;
        document.getElementById('inventory-valuation').innerText = invVal.toLocaleString() + ' ج.م';

        // 2. Net Cash (1010 + 1020)
        const cash = (coa.find(a => a.id === 1010)?.balance || 0) + (coa.find(a => a.id === 1020)?.balance || 0);
        document.getElementById('total-cash').innerText = cash.toLocaleString() + ' ج.م';

        // 3. Receivables (1040)
        const receivables = coa.find(a => a.id === 1040)?.balance || 0;
        document.getElementById('student-receivables').innerText = receivables.toLocaleString() + ' ج.م';

        // 4. Payables (2010)
        const payables = coa.find(a => a.id === 2010)?.balance || 0;
        document.getElementById('supplier-payables').innerText = payables.toLocaleString() + ' ج.م';
    }

    renderCharts() {
        const ctx = document.getElementById('financial-mix-chart');
        if (!ctx) return;

        const coa = Storage.get('coa') || [];
        const revenue = coa.find(a => a.id === 4010)?.balance || 0;
        const cogs = coa.find(a => a.id === 5010)?.balance || 0;
        const profit = revenue - cogs;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['الإيرادات', 'التكاليف (COGS)', 'صافي الربح'],
                datasets: [{
                    data: [revenue, cogs, profit],
                    backgroundColor: ['#00eaff', '#ef4444', '#10b981'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('financial-dashboard.html')) {
        new AnalyticsUI();
    }
});
