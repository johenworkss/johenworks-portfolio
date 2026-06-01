// Contact Form Handler with EmailJS, Validation, and Abuse Protection
class FormHandler {
  constructor() {
    this.form = document.querySelector('.contact__form');
    this.nameInput = document.getElementById('name');
    this.emailInput = document.getElementById('email');
    this.messageInput = document.getElementById('message');
    this.submitButton = this.form?.querySelector('button[type="submit"]');

    // EmailJS Configuration - loaded from config file
    this.emailJSConfig = window.EMAILJS_CONFIG || {
      serviceID: 'YOUR_SERVICE_ID',
      templateID: 'YOUR_TEMPLATE_ID',
      publicKey: 'YOUR_PUBLIC_KEY'
    };

    // ── Abuse protection ──────────────────────────────────────────────────
    this.isSending = false;          // lock against concurrent/double sends
    this.COOLDOWN_MS = 60_000;       // 60s mandatory wait between submissions
    this.MAX_PER_HOUR = 3;           // max 3 messages per rolling hour
    this.STORAGE_KEY = 'contact_submissions';

    this.init();
  }

  init() {
    if (!this.form) return;

    // Inject honeypot (invisible to humans, bots fill it in)
    this.injectHoneypot();

    // Real-time field validation
    this.addValidationListeners();

    // Form submit
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  // ── Honeypot ──────────────────────────────────────────────────────────────

  injectHoneypot() {
    const trap = document.createElement('div');
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText =
      'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    trap.innerHTML =
      '<label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    this.form.appendChild(trap);
    this.honeypotInput = trap.querySelector('input');
  }

  isHoneypotTripped() {
    return this.honeypotInput && this.honeypotInput.value.trim() !== '';
  }

  // ── Rate limiting (localStorage) ─────────────────────────────────────────

  getSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  recordSubmission() {
    const now = Date.now();
    const recent = this.getSubmissions().filter(t => now - t < 3_600_000);
    recent.push(now);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
    } catch { /* storage full — ignore */ }
  }

  checkRateLimit() {
    const now = Date.now();
    const recent = this.getSubmissions().filter(t => now - t < 3_600_000);

    // Cooldown between sends
    if (recent.length > 0) {
      const elapsed = now - recent[recent.length - 1];
      if (elapsed < this.COOLDOWN_MS) {
        const secs = Math.ceil((this.COOLDOWN_MS - elapsed) / 1000);
        return {
          allowed: false,
          reason: `Please wait ${secs}s before sending another message.`
        };
      }
    }

    // Hourly cap
    if (recent.length >= this.MAX_PER_HOUR) {
      return {
        allowed: false,
        reason: "You've reached the message limit for this hour. Please try again later."
      };
    }

    return { allowed: true };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  addValidationListeners() {
    this.nameInput?.addEventListener('blur', () => this.validateName());
    this.nameInput?.addEventListener('input', () => this.clearError(this.nameInput));

    this.emailInput?.addEventListener('blur', () => this.validateEmail());
    this.emailInput?.addEventListener('input', () => this.clearError(this.emailInput));

    this.messageInput?.addEventListener('blur', () => this.validateMessage());
    this.messageInput?.addEventListener('input', () => this.clearError(this.messageInput));
  }

  validateName() {
    const name = this.nameInput.value.trim();
    if (!name) { this.showError(this.nameInput, 'Name is required'); return false; }
    if (name.length < 2) { this.showError(this.nameInput, 'Name must be at least 2 characters'); return false; }
    this.clearError(this.nameInput);
    return true;
  }

  validateEmail() {
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { this.showError(this.emailInput, 'Email is required'); return false; }
    if (!emailRegex.test(email)) { this.showError(this.emailInput, 'Sorry, invalid format here'); return false; }
    this.clearError(this.emailInput);
    return true;
  }

  validateMessage() {
    const message = this.messageInput.value.trim();
    if (!message) { this.showError(this.messageInput, 'Message is required'); return false; }
    if (message.length < 10) { this.showError(this.messageInput, 'Message must be at least 10 characters'); return false; }
    this.clearError(this.messageInput);
    return true;
  }

  // ── Submit handler ────────────────────────────────────────────────────────

  async handleSubmit(e) {
    e.preventDefault();

    // 1. Concurrent send lock — prevents double-click / rapid re-submit
    if (this.isSending) return;

    // 2. Honeypot — silent drop, bots get no feedback
    if (this.isHoneypotTripped()) {
      this.form.reset();
      return;
    }

    // 3. Rate limit
    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      this.showToast(rateCheck.reason, 'error');
      return;
    }

    // 4. Field validation
    const isNameValid    = this.validateName();
    const isEmailValid   = this.validateEmail();
    const isMessageValid = this.validateMessage();
    if (!isNameValid || !isEmailValid || !isMessageValid) {
      this.showToast('Please fix the errors before submitting', 'error');
      return;
    }

    // All checks passed — lock and send
    this.isSending = true;
    const animationPromise = this.showLottieAnimation();
    this.setLoadingState(true);

    try {
      await this.sendEmail();
      this.recordSubmission();          // only record on success
      await animationPromise;
      this.showToast('Message sent successfully! Please wait for my response.', 'success');
      this.form.reset();
    } catch (error) {
      console.error('Error sending email:', error);
      await animationPromise;
      this.showToast('Failed to send message. Please try again or email me directly.', 'error');
    } finally {
      this.isSending = false;
      this.setLoadingState(false);
    }
  }

  // ── Lottie animation ──────────────────────────────────────────────────────

  showLottieAnimation() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'lottie-overlay';
      overlay.innerHTML = `
        <div class="lottie-container" id="lottie-animation"></div>
        <p class="lottie-text">Sending your message...</p>
      `;
      document.body.appendChild(overlay);

      if (typeof lottie !== 'undefined') {
        const animation = lottie.loadAnimation({
          container: document.getElementById('lottie-animation'),
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: './assets/loading.json'
        });

        setTimeout(() => {
          animation.destroy();
          overlay.classList.add('lottie-overlay--hide');
          setTimeout(() => { overlay.remove(); resolve(); }, 300);
        }, 4000);
      } else {
        console.error('Lottie library not loaded');
        overlay.remove();
        resolve();
      }
    });
  }

  // ── EmailJS send ──────────────────────────────────────────────────────────

  async sendEmail() {
    if (this.emailJSConfig.serviceID === 'YOUR_SERVICE_ID') {
      // Demo mode — log and simulate delay
      console.log('EmailJS not configured. Form data:', {
        name: this.nameInput.value,
        email: this.emailInput.value,
        message: this.messageInput.value
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return;
    }

    if (typeof emailjs === 'undefined') throw new Error('EmailJS library not loaded');

    emailjs.init(this.emailJSConfig.publicKey);

    await emailjs.send(
      this.emailJSConfig.serviceID,
      this.emailJSConfig.templateID,
      {
        from_name:  this.nameInput.value,
        from_email: this.emailInput.value,
        message:    this.messageInput.value,
        to_name:    'Jenho Nacilla'
      }
    );
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  setLoadingState(isLoading) {
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Sending...';
      this.submitButton.classList.add('loading');
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'Send Message';
      this.submitButton.classList.remove('loading');
    }
  }

  showError(input, message) {
    const control = input.parentElement;
    const errorElement = control.querySelector('.error-message') || this.createErrorElement();

    control.classList.add('error');
    errorElement.textContent = message;

    if (!control.querySelector('.error-message')) {
      control.appendChild(errorElement);
    }

    const invalidIcon = control.querySelector('.contact__invalid-icon');
    if (invalidIcon) invalidIcon.style.display = 'block';
  }

  clearError(input) {
    const control = input.parentElement;
    control.classList.remove('error');

    const errorElement = control.querySelector('.error-message');
    if (errorElement) errorElement.remove();

    const invalidIcon = control.querySelector('.contact__invalid-icon');
    if (invalidIcon) invalidIcon.style.display = 'none';
  }

  createErrorElement() {
    const error = document.createElement('span');
    error.className = 'error-message';
    return error;
  }

  showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast__content">
        ${type === 'error' ? '<span class="toast__icon">✕</span>' : ''}
        <span class="toast__message">${message}</span>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast--show'), 100);
    setTimeout(() => {
      toast.classList.remove('toast--show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Initialize form handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FormHandler();
});
