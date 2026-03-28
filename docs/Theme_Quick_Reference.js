/* ========================================
   EDUMASTER PRO - THEME QUICK REFERENCE
   ======================================== */

// ============ THEME CONTROLLER API ============

// Get current theme
const theme = themeController.getCurrentTheme();
// Returns: 'light' or 'dark'

// Set specific theme
themeController.setTheme('light');  // Switch to light mode
themeController.setTheme('dark');   // Switch to dark mode

// Toggle theme
themeController.toggleTheme();      // Switch between modes

// Create toggle button programmatically
const btn = themeController.createToggleButton();
document.querySelector('.top-bar').appendChild(btn);


// ============ HTML INTEGRATION ============

// Add this button to your top bar:
<button class="theme-toggle-btn">
    <i class="fas fa-sun"></i>
    <span class="theme-text">الوضع الفاتح</span>
</button>

// Add this script before closing </body>:
<script src="js/theme-toggle.js"></script>


// ============ CSS VARIABLES ============

// Use these variables in your custom CSS:
var(--bg - dark)          // Main background
var(--bg - card)          // Card backgrounds
var(--accent - blue)      // Primary accent color
var(--accent - green)     // Success/positive
var(--accent - purple)    // Special/featured
var(--accent - orange)    // Warning
var(--accent - red)       // Error/danger
var(--text - primary)     // Main text color
var(--text - secondary)   // Muted text color
var(--border - color)     // Border color
var(--glass - border)     // Glassmorphism borders


// ============ DARK MODE COLORS ============

--bg - dark: #0f172a;
--bg - card: #1e293b;
--accent - blue: #00eaff;
--accent - green: #10b981;
--accent - purple: #a855f7;
--accent - orange: #f59e0b;
--accent - red: #ef4444;
--text - primary: #ffffff;
--text - secondary: #94a3b8;
--border - color: rgba(0, 0, 0, 0.1);
--glass - border: rgba(0, 234, 255, 0.2);


// ============ LIGHT MODE COLORS ============

--bg - dark: #f8fafc;
--bg - card: #ffffff;
--accent - blue: #0ea5e9;
--accent - green: #10b981;
--accent - purple: #8b5cf6;
--accent - orange: #f97316;
--accent - red: #ef4444;
--text - primary: #1f2937;
--text - secondary: #475569;
--border - color: rgba(0, 0, 0, 0.05);
--glass - border: rgba(14, 165, 233, 0.2);


// ============ CUSTOM LIGHT MODE STYLES ============

// Add light-mode specific styles like this:
body.light - mode.your - element {
    background: rgba(248, 250, 252, 0.5);
    color: var(--text - primary);
}


// ============ EXAMPLE USAGE ============

// Custom button with theme colors
<button style="
    background: var(--accent-blue);
    color: var(--bg-dark);
    border: 1px solid var(--border-color);
    padding: 10px 20px;
    border-radius: 8px;
">
    Click Me
</button>

// Custom card with theme colors
<div style="
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 20px;
    border-radius: 12px;
">
    <h3 style="color: var(--text-primary);">Card Title</h3>
    <p style="color: var(--text-secondary);">Card description</p>
</div>


// ============ LISTEN FOR THEME CHANGES ============

// Custom event listener (advanced usage)
const originalToggle = themeController.toggleTheme;
themeController.toggleTheme = function () {
    originalToggle.call(this);

    // Your custom code here
    console.log('Theme changed to:', this.getCurrentTheme());

    // Example: Update chart colors
    if (this.getCurrentTheme() === 'light') {
        updateChartColors('light');
    } else {
        updateChartColors('dark');
    }
};


// ============ LOCALSTORAGE KEY ============

// Theme preference is stored at:
localStorage.getItem('edumaster-theme');
// Returns: 'light' or 'dark'


// ============ BROWSER SUPPORT ============

// ✅ Chrome/Edge (latest)
// ✅ Firefox (latest)
// ✅ Safari (latest)
// ✅ Mobile browsers


// ============ FILES TO INCLUDE ============

// Required CSS:
<link rel="stylesheet" href="styles/edumaster-ui.css">

// Required JavaScript:
    <script src="js/theme-toggle.js"></script>

// Required Icons (Font Awesome):
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">


// ============ TROUBLESHOOTING ============

// Theme doesn't persist?
// → Check localStorage is enabled

// Button doesn't appear?
// → Verify Font Awesome is loaded
// → Check CSS file is linked

// Colors don't change?
// → Ensure body.light-mode class toggles
// → Check for inline styles overriding theme


// ============ DEMO PAGE ============

// Test the theme at:
// frontend/theme-demo.html


// ============ DOCUMENTATION ============

// Full guide:
// docs/Light_Mode_Implementation_Guide.md

// Summary:
// docs/Light_Mode_Summary.md

// Checklist:
// docs/Light_Mode_Integration_Checklist.md


/* ========================================
   END OF QUICK REFERENCE
   ======================================== */
