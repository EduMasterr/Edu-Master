/**
 * Theme Toggle Controller (Optimized Performance)
 */

class ThemeController {
    constructor() {
        this.storageKey = 'edumaster-theme';
        this.themes = ['light', 'dark'];
        this.themeLabels = { light: 'Royal White', dark: 'Navy Deep Tech' };
        this.themeIcons = { light: 'fas fa-moon', dark: 'fas fa-sun' };
        this._configCache = null; // Prevent redundant Disk I/O
        this.init();
    }

    init() {
        // Migration logic
        let saved = localStorage.getItem(this.storageKey);
        if (!saved || saved === 'clinical') {
            saved = 'light';
            localStorage.setItem(this.storageKey, 'light');
        }
        this.setTheme(saved, false);
        this.attachToggleListeners();
    }

    setTheme(theme, save = true) {
        // Optimization: Use documentElement for single-pass CSS evaluation
        const root = document.documentElement;
        root.classList.remove('dark-mode', 'clinical-mode');
        document.body.classList.remove('dark-mode', 'clinical-mode');
        
        if (theme === 'dark') {
            root.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        this.applyCustomStyles(theme);

        if (save) {
            localStorage.setItem(this.storageKey, theme);
        }

        this.updateToggleButtons(theme);
        // Dispatch only if initialized
        if (save) {
            document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        }
    }

    applyCustomStyles(theme) {
        if (!this._configCache) {
            try {
                const saved = localStorage.getItem('edumaster_app_config');
                this._configCache = saved ? JSON.parse(saved) : {};
            } catch (e) { this._configCache = {}; }
        }

        const root = document.documentElement;
        const config = this._configCache;

        // Apply dynamic color overrides only for light/royal theme logic
        if (theme === 'light') {
            if (config.sidebarBg) root.style.setProperty('--sidebar-bg', config.sidebarBg);
            if (config.sidebarTitleStart) root.style.setProperty('--sidebar-title-start', config.sidebarTitleStart);
            if (config.sidebarActiveBg) root.style.setProperty('--sidebar-active-bg', config.sidebarActiveBg);
        }
    }

    toggleTheme() {
        const nextTheme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
        this.setTheme(nextTheme);
        if (window.Toast) {
            Toast.show(`🎨 تم التبديل إلى: ${this.themeLabels[nextTheme]}`, 'success');
        }
    }

    getCurrentTheme() {
        return document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light';
    }

    updateToggleButtons(theme) {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) icon.className = this.themeIcons[theme];
        });
    }

    attachToggleListeners() {
        // Prevent multiple listeners if file is re-loaded
        if (window.ThemeListenerAttached) return;
        window.ThemeListenerAttached = true;

        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle-btn')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
}

// Single instance
window.themeController = new ThemeController();
