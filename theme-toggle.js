// Theme Toggle with localStorage persistence
class ThemeToggle {
  constructor() {
    this.theme = this.getStoredTheme() || this.getPreferredTheme();
    this.toggleBtn = null;
    this.init();
  }

  init() {
    // Apply theme immediately (before page renders)
    this.applyTheme(this.theme);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupToggle());
    } else {
      this.setupToggle();
    }
  }

  setupToggle() {
    this.toggleBtn = document.querySelector('.theme-toggle');
    
    if (this.toggleBtn) {
      // Update button state
      this.updateToggleButton();
      
      // Add click event
      this.toggleBtn.addEventListener('click', () => this.toggle());
      
      console.log('Theme toggle initialized:', this.theme);
    }
  }

  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  getPreferredTheme() {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // Default to dark
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.theme = theme;
  }

  storeTheme(theme) {
    localStorage.setItem('theme', theme);
  }

  toggle() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    
    // Add transition class for smooth color changes
    document.documentElement.classList.add('theme-transitioning');
    
    this.applyTheme(newTheme);
    this.storeTheme(newTheme);
    this.updateToggleButton();

    // Force repaint on all fullpage sections so background-color var updates
    document.querySelectorAll('.fullpage-section').forEach(el => {
      el.style.backgroundColor = '';
    });
    
    console.log('🎨 Theme switched to:', newTheme);
    
    // Remove transition class after animation (400ms to match CSS)
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  }

  updateToggleButton() {
    if (!this.toggleBtn) return;
    
    if (this.theme === 'light') {
      this.toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    } else {
      this.toggleBtn.setAttribute('aria-label', 'Switch to light mode');
    }
  }
}

// Initialize theme toggle immediately (before DOM loads)
new ThemeToggle();
