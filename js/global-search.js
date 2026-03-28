/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   🔍 EduMaster Pro — Global Smart Search Engine         ║
 * ║   Version 2.0 | With Floating Detail Cards              ║
 * ║   Permissions: Admin sees all | Branch sees own         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

window.GlobalSearchController = (() => {

    // ── Internal state ──────────────────────────────────────
    let _debounceTimer = null;
    let _activeIdx = -1;
    let _results = [];
    let _flyingCard = null;
    let _isAdmin = false;
    let _activeBranch = null;

    // ── Category config ─────────────────────────────────────
    const CATEGORIES = {
        students: {
            label: 'الطلاب',
            icon: 'fa-user-graduate',
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.12)',
            key: 'students',
            searchFields: ['name', 'phone', 'code', 'parentPhone', 'address', 'email'],
            editUrl: item => `add-student.html?editId=${item.id}`,
            viewUrl: item => `students.html?search=${encodeURIComponent(item.name)}`,
        },
        trainers: {
            label: 'المحاضرون',
            icon: 'fa-chalkboard-user',
            color: '#10b981',
            bg: 'rgba(16,185,129,0.12)',
            key: 'trainers',
            searchFields: ['name', 'phone', 'specialty', 'subject', 'email'],
            editUrl: item => `add-trainer.html?editId=${item.id}`,
            viewUrl: item => `trainers.html?search=${encodeURIComponent(item.name)}`,
        },
        study_groups: {
            label: 'المجموعات',
            icon: 'fa-layer-group',
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.12)',
            key: 'study_groups',
            searchFields: ['name', 'subject', 'level', 'description', 'days'],
            editUrl: item => `groups.html?editId=${item.id}`,
            viewUrl: item => `groups.html`,
        },
        transactions: {
            label: 'المعاملات المالية',
            icon: 'fa-money-bill-transfer',
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)',
            key: 'transactions',
            searchFields: ['description', 'type', 'student_name', 'notes', 'reference'],
            editUrl: null,
            viewUrl: item => `ledger.html`,
        },
        branches: {
            label: 'الفروع',
            icon: 'fa-building-columns',
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.12)',
            key: 'branches',
            searchFields: ['name', 'address', 'phone', 'manager'],
            editUrl: null,
            viewUrl: item => `branches.html`,
        },
        users: {
            label: 'المستخدمون',
            icon: 'fa-users-gear',
            color: '#06b6d4',
            bg: 'rgba(6,182,212,0.12)',
            key: 'users',
            searchFields: ['name', 'username', 'phone', 'role'],
            editUrl: null,
            viewUrl: item => `users-management.html`,
        },
    };

    // ── Inject styles ────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('gsc-styles')) return;
        const style = document.createElement('style');
        style.id = 'gsc-styles';
        style.innerHTML = `
            /* ── Search Wrapper ── */
            .global-search-wrapper {
                position: relative;
                flex: 1;
                max-width: 520px;
                margin: 0 16px;
                z-index: 5000;
            }
            .search-input-group {
                position: relative;
                display: flex;
                align-items: center;
            }
            .global-search-input {
                width: 100%;
                height: 42px;
                padding: 0 14px 0 42px;
                border-radius: 50px;
                border: 1.5px solid var(--border-soft);
                background: var(--bg-card);
                color: var(--text-main);
                font-family: 'Tajawal', sans-serif;
                font-size: 0.95rem;
                font-weight: 600;
                transition: all 0.25s;
                outline: none;
                direction: rtl;
            }
            .global-search-input:focus {
                border-color: var(--accent-teal);
                box-shadow: 0 0 0 3px rgba(26,158,156,0.15);
                background: var(--bg-main);
            }
            .search-input-group i {
                position: absolute;
                left: 14px;
                color: var(--text-muted);
                font-size: 1rem;
                pointer-events: none;
                transition: color 0.2s;
            }
            .global-search-input:focus ~ i { color: var(--accent-teal); }

            /* Keyboard shortcut badge */
            .gsc-kbd {
                position: absolute;
                right: 14px;
                display: flex;
                gap: 3px;
            }
            .gsc-kbd kbd {
                background: var(--bg-card);
                border: 1px solid var(--border-soft);
                border-radius: 4px;
                padding: 1px 5px;
                font-size: 0.7rem;
                color: var(--text-muted);
                font-family: monospace;
            }
            .global-search-input:focus ~ .gsc-kbd { display: none; }

            /* ── Results Dropdown ── */
            .search-results-overlay {
                position: absolute;
                top: calc(100% + 8px);
                left: 0; right: 0;
                background: var(--bg-main);
                border: 1px solid var(--border-soft);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.18);
                display: none;
                flex-direction: column;
                max-height: 480px;
                overflow: hidden;
                animation: gsc-drop 0.18s ease;
                z-index: 5001;
            }
            .search-results-overlay.open { display: flex; }
            @keyframes gsc-drop {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .search-results-header {
                padding: 12px 16px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--border-soft);
                font-size: 0.8rem;
                color: var(--text-muted);
                font-weight: 700;
                flex-shrink: 0;
            }
            .search-count {
                background: var(--accent-teal);
                color: #fff;
                border-radius: 999px;
                padding: 1px 9px;
                font-size: 0.75rem;
                font-weight: 900;
            }
            .search-results-body {
                overflow-y: auto;
                flex: 1;
                padding: 8px;
                scrollbar-width: thin;
            }

            /* ── Category header ── */
            .gsc-category-header {
                padding: 6px 10px 4px;
                font-size: 0.72rem;
                font-weight: 900;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 6px;
            }
            .gsc-category-header:first-child { margin-top: 0; }
            .gsc-cat-line {
                flex: 1;
                height: 1px;
                background: var(--border-soft);
            }

            /* ── Result Item ── */
            .gsc-result-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 9px 12px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.15s;
                position: relative;
            }
            .gsc-result-item:hover,
            .gsc-result-item.active {
                background: var(--bg-card);
            }
            .gsc-result-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.9rem;
                flex-shrink: 0;
            }
            .gsc-result-info {
                flex: 1;
                min-width: 0;
            }
            .gsc-result-name {
                font-weight: 800;
                font-size: 0.92rem;
                color: var(--text-main);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gsc-result-name mark {
                background: rgba(26,158,156,0.25);
                color: var(--accent-teal);
                border-radius: 3px;
                padding: 0 2px;
                font-weight: 900;
            }
            .gsc-result-sub {
                font-size: 0.78rem;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 1px;
            }
            .gsc-result-actions {
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.15s;
            }
            .gsc-result-item:hover .gsc-result-actions { opacity: 1; }
            .gsc-action-btn {
                width: 28px;
                height: 28px;
                border-radius: 7px;
                border: 1px solid var(--border-soft);
                background: var(--bg-main);
                color: var(--text-muted);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                transition: all 0.15s;
            }
            .gsc-action-btn:hover {
                background: var(--accent-teal);
                color: #fff;
                border-color: var(--accent-teal);
            }
            .gsc-action-edit:hover { background: #f59e0b; border-color: #f59e0b; color: #fff; }

            /* ── No Results ── */
            .no-results {
                text-align: center;
                padding: 35px 20px;
                color: var(--text-muted);
                font-size: 0.9rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            .no-results i { font-size: 2rem; opacity: 0.4; }

            /* ── Footer ── */
            .gsc-footer {
                padding: 8px 14px;
                border-top: 1px solid var(--border-soft);
                display: flex;
                gap: 16px;
                font-size: 0.72rem;
                color: var(--text-muted);
                flex-shrink: 0;
            }
            .gsc-footer kbd {
                background: var(--bg-card);
                border: 1px solid var(--border-soft);
                border-radius: 4px;
                padding: 1px 5px;
                font-family: monospace;
                margin-left: 4px;
            }

            /* ── Flying Detail Card ── */
            #gsc-flying-card {
                position: fixed;
                z-index: 9999;
                width: 280px;
                background: var(--bg-main);
                border: 1px solid var(--border-soft);
                border-radius: 16px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03);
                padding: 0;
                overflow: hidden;
                animation: gsc-card-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none;
            }
            @keyframes gsc-card-in {
                from { opacity: 0; transform: scale(0.92) translateX(10px); }
                to   { opacity: 1; transform: scale(1) translateX(0); }
            }
            .gsc-card-header {
                padding: 14px 16px 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .gsc-card-avatar {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
                flex-shrink: 0;
            }
            .gsc-card-name {
                font-weight: 900;
                font-size: 0.95rem;
                color: var(--text-main);
                line-height: 1.2;
            }
            .gsc-card-cat {
                font-size: 0.72rem;
                color: var(--text-muted);
                font-weight: 700;
                margin-top: 2px;
            }
            .gsc-card-body {
                padding: 0 14px 14px;
                display: flex;
                flex-direction: column;
                gap: 7px;
            }
            .gsc-card-row {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-size: 0.82rem;
            }
            .gsc-card-label {
                color: var(--text-muted);
                font-weight: 700;
                min-width: 70px;
                flex-shrink: 0;
            }
            .gsc-card-value {
                color: var(--text-main);
                font-weight: 600;
                word-break: break-word;
            }
            .gsc-card-divider {
                height: 1px;
                background: var(--border-soft);
                margin: 4px 0;
            }
            .gsc-card-status {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 10px;
                border-radius: 999px;
                font-size: 0.74rem;
                font-weight: 900;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Fuzzy search helper ──────────────────────────────────
    function _matches(text, query) {
        if (!text || !query) return false;
        const t = String(text).toLowerCase().trim();
        const q = query.toLowerCase().trim();
        if (t.includes(q)) return true;
        // Fuzzy: all chars of query appear in order
        let qi = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
            if (t[i] === q[qi]) qi++;
        }
        return qi === q.length && q.length >= 2;
    }

    // ── Highlight match in text ──────────────────────────────
    function _highlight(text, query) {
        if (!text || !query) return text || '';
        const t = String(text);
        const idx = t.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return t;
        return t.substring(0, idx) +
            `<mark>${t.substring(idx, idx + query.length)}</mark>` +
            t.substring(idx + query.length);
    }

    // ── Get branch-filtered data ─────────────────────────────
    function _getData(key) {
        const all = (window.Storage?.get(key)) || [];
        if (_isAdmin && (!_activeBranch || _activeBranch === 'null')) return all; // Admin sees all
        const bid = _activeBranch ? String(_activeBranch) : null;
        if (!bid) return all;
        return all.filter(item => {
            const itemBranch = String(item.branch || item.branch_id || '');
            return itemBranch === bid;
        });
    }

    // ── Run the search ────────────────────────────────────────
    function _search(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.trim();
        const found = [];

        for (const [catKey, cat] of Object.entries(CATEGORIES)) {
            // Non-admins can't see branches or all-users
            if (!_isAdmin && (catKey === 'branches')) continue;

            const items = _getData(cat.key);
            const matches = items.filter(item =>
                cat.searchFields.some(f => _matches(item[f], q))
            );

            if (matches.length > 0) {
                found.push({
                    catKey,
                    cat,
                    items: matches.slice(0, 5) // Max 5 per category
                });
            }
        }

        return found;
    }

    // ── Build subtitle for item ───────────────────────────────
    function _buildSubtitle(catKey, item, branches) {
        const branchName = branches.find(b => b.id === (item.branch || item.branch_id))?.name;
        switch(catKey) {
            case 'students':
                return [item.phone, branchName, item.group_name].filter(Boolean).join(' • ');
            case 'trainers':
                return [item.specialty || item.subject, item.phone, branchName].filter(Boolean).join(' • ');
            case 'study_groups':
                return [item.subject, item.level, branchName].filter(Boolean).join(' • ');
            case 'transactions':
                return [item.type, item.amount ? `${item.amount} ج.م` : '', item.description].filter(Boolean).join(' • ');
            case 'branches':
                return [item.address, item.phone].filter(Boolean).join(' • ');
            case 'users':
                return [item.username, item.phone].filter(Boolean).join(' • ');
            default: return '';
        }
    }

    // ── Build Flying Card HTML ────────────────────────────────
    function _buildCard(catKey, item, cat, branches) {
        const branchName = branches.find(b => b.id === (item.branch || item.branch_id))?.name || '—';
        let rows = [];

        switch(catKey) {
            case 'students':
                rows = [
                    { label: '📞 التليفون', value: item.phone || '—' },
                    { label: '🏢 الفرع', value: branchName },
                    { label: '📚 المجموعة', value: item.group_name || item.group || '—' },
                    { label: '💰 الرسوم', value: item.fees ? `${item.fees} ج.م` : '—' },
                    { label: '📅 التاريخ', value: item.created_at ? new Date(item.created_at).toLocaleDateString('ar-EG') : '—' },
                    { label: '📍 العنوان', value: item.address || '—' },
                ];
                if (item.parentName) rows.splice(2, 0, { label: '👨‍👩‍👦 ولي الأمر', value: item.parentName });
                if (item.parentPhone) rows.splice(3, 0, { label: '📱 تليفون الولي', value: item.parentPhone });
                break;
            case 'trainers':
                rows = [
                    { label: '🎓 التخصص', value: item.specialty || item.subject || '—' },
                    { label: '📞 التليفون', value: item.phone || '—' },
                    { label: '🏢 الفرع', value: branchName },
                    { label: '💼 العقد', value: item.contract_type || '—' },
                    { label: '💰 المرتب', value: item.salary ? `${item.salary} ج.م` : '—' },
                    { label: '📅 تاريخ الانضمام', value: item.join_date ? new Date(item.join_date).toLocaleDateString('ar-EG') : '—' },
                ];
                break;
            case 'study_groups':
                rows = [
                    { label: '📖 المادة', value: item.subject || item.name || '—' },
                    { label: '🎚️ المستوى', value: item.level || '—' },
                    { label: '👨‍🏫 المحاضر', value: item.trainer_name || item.trainer || '—' },
                    { label: '🏢 الفرع', value: branchName },
                    { label: '👥 الطلاب', value: item.students_count != null ? `${item.students_count} طالب` : '—' },
                    { label: '📅 الأيام', value: item.days || item.schedule || '—' },
                    { label: '🕐 الوقت', value: item.time || '—' },
                    { label: '💰 الرسوم', value: item.fees ? `${item.fees} ج.م` : '—' },
                ];
                break;
            case 'transactions':
                const typeColor = item.type === 'credit' || item.type === 'دفع' ? '#10b981' : '#ef4444';
                rows = [
                    { label: '💰 المبلغ', value: `<span style="color:${typeColor};font-weight:900;">${item.amount || '—'} ج.م</span>` },
                    { label: '🏷️ النوع', value: item.type || '—' },
                    { label: '📝 الوصف', value: item.description || '—' },
                    { label: '🏢 الفرع', value: branchName },
                    { label: '📅 التاريخ', value: item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '—' },
                    { label: '📎 مرجع', value: item.reference || '—' },
                ];
                break;
            case 'branches':
                rows = [
                    { label: '📍 العنوان', value: item.address || '—' },
                    { label: '📞 التليفون', value: item.phone || '—' },
                    { label: '👤 المدير', value: item.manager || '—' },
                    { label: '📅 تاريخ الإنشاء', value: item.created_at ? new Date(item.created_at).toLocaleDateString('ar-EG') : '—' },
                ];
                break;
            case 'users':
                rows = [
                    { label: '👤 المستخدم', value: item.username || '—' },
                    { label: '📞 التليفون', value: item.phone || '—' },
                    { label: '🏢 الفرع', value: branchName },
                    { label: '🔑 الصلاحية', value: item.role_id === 1 ? 'سوبر أدمن' : item.role_id === 2 ? 'مدير فرع' : 'موظف' },
                ];
                break;
        }

        const rowsHtml = rows
            .filter(r => r.value && r.value !== '—')
            .map(r => `
                <div class="gsc-card-row">
                    <span class="gsc-card-label">${r.label}</span>
                    <span class="gsc-card-value">${r.value}</span>
                </div>
            `).join('');

        return `
            <div class="gsc-card-header" style="background: ${cat.bg};">
                <div class="gsc-card-avatar" style="background:${cat.bg}; color:${cat.color}; border: 1px solid ${cat.color}30;">
                    <i class="fa-solid ${cat.icon}"></i>
                </div>
                <div>
                    <div class="gsc-card-name">${item.name || item.username || '—'}</div>
                    <div class="gsc-card-cat" style="color:${cat.color};">${cat.label}</div>
                </div>
            </div>
            <div class="gsc-card-divider"></div>
            <div class="gsc-card-body">${rowsHtml || '<div style="color:var(--text-muted);font-size:0.8rem;">لا توجد بيانات إضافية</div>'}</div>
        `;
    }

    // ── Show Flying Card ─────────────────────────────────────
    function _showFlyingCard(el, catKey, item, cat, branches) {
        _hideFlyingCard();

        const card = document.createElement('div');
        card.id = 'gsc-flying-card';
        card.innerHTML = _buildCard(catKey, item, cat, branches);
        document.body.appendChild(card);
        _flyingCard = card;

        // Position: to the left of the hovered item (RTL page)
        const rect = el.getBoundingClientRect();
        const cardW = 280;
        const viewW = window.innerWidth;

        let left = rect.right + 12;
        if (left + cardW > viewW - 10) left = rect.left - cardW - 12;
        if (left < 10) left = 10;

        let top = rect.top;
        const cardH = card.offsetHeight || 300;
        if (top + cardH > window.innerHeight - 10) top = window.innerHeight - cardH - 10;
        if (top < 10) top = 10;

        card.style.left = left + 'px';
        card.style.top  = top  + 'px';
    }

    function _hideFlyingCard() {
        if (_flyingCard) { _flyingCard.remove(); _flyingCard = null; }
    }

    // ── Render results ────────────────────────────────────────
    function _renderResults(query) {
        const body   = document.getElementById('search-results-body');
        const count  = document.getElementById('search-count');
        const panel  = document.getElementById('search-results');
        if (!body) return;

        const branches = (window.Storage?.get('branches')) || [];
        const groups = _search(query);
        _results = [];

        if (!query || query.trim().length < 2) {
            body.innerHTML = `<div class="no-results"><i class="fa-solid fa-keyboard"></i>ابدأ الكتابة للبحث...</div>`;
            count.textContent = '0';
            return;
        }

        if (groups.length === 0) {
            body.innerHTML = `<div class="no-results"><i class="fa-solid fa-face-frown-open"></i>لا توجد نتائج لـ "<strong>${query}</strong>"</div>`;
            count.textContent = '0';
            return;
        }

        let totalCount = 0;
        let html = '';
        let idx = 0;

        groups.forEach(({ catKey, cat, items }) => {
            html += `
                <div class="gsc-category-header">
                    <i class="fa-solid ${cat.icon}" style="color:${cat.color};"></i>
                    ${cat.label}
                    <div class="gsc-cat-line"></div>
                    <span style="font-size:0.7rem;background:${cat.bg};color:${cat.color};padding:1px 7px;border-radius:999px;">${items.length}</span>
                </div>
            `;

            items.forEach(item => {
                const subtitle = _buildSubtitle(catKey, item, branches);
                const editUrl = cat.editUrl ? cat.editUrl(item) : null;
                const viewUrl = cat.viewUrl ? cat.viewUrl(item) : null;

                const editBtn = (_isAdmin && editUrl)
                    ? `<button class="gsc-action-btn gsc-action-edit" title="تعديل" onclick="event.stopPropagation();window.location.href='${editUrl}'">
                           <i class="fa-solid fa-pen-to-square"></i>
                       </button>`
                    : '';

                html += `
                    <div class="gsc-result-item" data-idx="${idx}"
                         data-cat="${catKey}" data-id="${item.id}"
                         onclick="GlobalSearchController._onResultClick('${catKey}', '${viewUrl}')">
                        <div class="gsc-result-icon" style="background:${cat.bg}; color:${cat.color};">
                            <i class="fa-solid ${cat.icon}"></i>
                        </div>
                        <div class="gsc-result-info">
                            <div class="gsc-result-name">${_highlight(item.name || item.username || '—', query)}</div>
                            <div class="gsc-result-sub">${subtitle || '\u200b'}</div>
                        </div>
                        <div class="gsc-result-actions">
                            ${editBtn}
                            ${viewUrl ? `<button class="gsc-action-btn" title="عرض" onclick="event.stopPropagation();window.location.href='${viewUrl}'">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>` : ''}
                        </div>
                    </div>
                `;

                _results.push({ catKey, item, cat, viewUrl, editUrl });
                idx++;
                totalCount++;
            });
        });

        body.innerHTML = html;
        count.textContent = totalCount;

        // Attach hover events for flying card
        body.querySelectorAll('.gsc-result-item').forEach(el => {
            const i = parseInt(el.dataset.idx);
            const { catKey, item, cat } = _results[i];
            el.addEventListener('mouseenter', () => _showFlyingCard(el, catKey, item, cat, branches));
            el.addEventListener('mouseleave', _hideFlyingCard);
        });
    }

    // ── Keyboard navigation ───────────────────────────────────
    function _moveActive(dir) {
        const items = document.querySelectorAll('.gsc-result-item');
        if (!items.length) return;
        items.forEach(el => el.classList.remove('active'));
        _activeIdx = (_activeIdx + dir + items.length) % items.length;
        const active = items[_activeIdx];
        active.classList.add('active');
        active.scrollIntoView({ block: 'nearest' });
    }

    function _selectActive() {
        const active = document.querySelector('.gsc-result-item.active');
        if (active) active.click();
    }

    // ── Public: result click ─────────────────────────────────
    function _onResultClick(catKey, viewUrl) {
        if (viewUrl && viewUrl !== 'null') {
            window.location.href = viewUrl;
        }
    }

    // ── Open / Close panel ───────────────────────────────────
    function _openPanel() {
        const panel = document.getElementById('search-results');
        if (panel) panel.classList.add('open');
    }

    function _closePanel() {
        const panel = document.getElementById('search-results');
        if (panel) panel.classList.remove('open');
        _hideFlyingCard();
        _activeIdx = -1;
    }

    // ── Initialize ────────────────────────────────────────────
    function init() {
        _injectStyles();

        // Determine user role
        const user = window.Permissions?.getCurrentUser();
        _isAdmin = user?.role_id === 1;
        _activeBranch = window.Permissions?.getActiveBranchId();

        const input = document.getElementById('global-search');
        if (!input) return;

        // Add footer to results panel
        const panel = document.getElementById('search-results');
        if (panel) {
            const footer = document.createElement('div');
            footer.className = 'gsc-footer';
            footer.innerHTML = `
                <span><kbd>↑↓</kbd> تنقل</span>
                <span><kbd>Enter</kbd> فتح</span>
                <span><kbd>Esc</kbd> إغلاق</span>
            `;
            panel.appendChild(footer);
        }

        // Input events
        input.addEventListener('input', () => {
            clearTimeout(_debounceTimer);
            _activeIdx = -1;
            _debounceTimer = setTimeout(() => {
                _renderResults(input.value);
                if (input.value.trim().length >= 2) _openPanel();
                else _closePanel();
            }, 200);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2) _openPanel();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); _moveActive(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); _moveActive(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); _selectActive(); }
            else if (e.key === 'Escape') { _closePanel(); input.blur(); input.value = ''; }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search-wrapper')) _closePanel();
        });

        // Ctrl+K shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                input.focus();
                input.select();
                if (input.value.trim().length >= 2) _openPanel();
            }
        });
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100); // Small delay to ensure ui-core has rendered the input
    }

    return { init, _onResultClick };

})();
