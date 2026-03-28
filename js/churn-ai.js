/**
 * Churn AI Agent (Student Retention)
 * Analyzes attendance logs to identify students at risk of leaving (3+ days absence).
 */
window.ChurnAI = {
    init() {
        console.log("Churn AI: Radar Activated.");
        setTimeout(() => this.runAnalysis(), 1500);
    },

    async runAnalysis() {
        const container = document.getElementById('churn-risk-container');
        if (!container) return;

        try {
            const students = await (window.IDBEngine ? window.IDBEngine.get('students') : Storage.get('students')) || Storage.get('students') || [];
            const attendance = Storage.get('attendance') || {};
            
            const churnList = [];
            const now = new Date();
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

            students.forEach(s => {
                // Find last attendance date for this student across all groups
                let lastAttDate = null;

                Object.keys(attendance).forEach(groupKey => {
                    const groupAtt = attendance[groupKey];
                    if (groupAtt[s.id]) {
                        // groupKey format: YYYY-MM-DD_groupId
                        const dStr = groupKey.split('_')[0];
                        const d = new Date(dStr);
                        if (!lastAttDate || d > lastAttDate) {
                            lastAttDate = d;
                        }
                    }
                });

                if (lastAttDate) {
                    const diff = now - lastAttDate;
                    if (diff > threeDaysMs) {
                        const daysAbsence = Math.floor(diff / (24 * 60 * 60 * 1000));
                        churnList.push({ ...s, daysAbsence });
                    }
                } else {
                    // Never attended - could also be a risk
                    // churnList.push({ ...s, daysAbsence: 'لم يحضر أبداً' });
                }
            });

            // Sort by most days absent
            churnList.sort((a, b) => b.daysAbsence - a.daysAbsence);

            this.render(churnList.slice(0, 10)); // Top 10 risks

        } catch (err) {
            console.error("Churn AI Error:", err);
            container.innerHTML = `<div style="color: #fca5a5;">فشل تحليل البيانات</div>`;
        }
    },

    render(risks) {
        const container = document.getElementById('churn-risk-container');
        if (!container) return;

        if (risks.length === 0) {
            container.innerHTML = `<div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; text-align: center; color: #fecaca; font-size: 0.8rem;">✅ لا يوجد طلاب منقطعين حالياً.</div>`;
            return;
        }

        container.innerHTML = risks.map(s => `
            <div style="background: rgba(255,255,255,0.1); padding: 12px 15px; border-radius: 14px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="width: 38px; height: 38px; background: #991b1b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 0.8rem; border: 2px solid #fca5a5;">
                    ${(s.name || 'S').charAt(0)}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 800; font-size: 0.85rem; color: #fff;">${s.name}</div>
                    <div style="font-size: 0.7rem; color: #fecaca;">منقطع منذ ${s.daysAbsence} أيام</div>
                </div>
                <button onclick="window.location.href='add-student.html?id=${s.id}'" style="background: rgba(255,255,255,0.15); border: none; color: #fff; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;">
                    <i class="fa-solid fa-phone"></i>
                </button>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => ChurnAI.init());
