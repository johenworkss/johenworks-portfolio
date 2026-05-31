// Custom Cursor with Trailing Particles (Performance Optimized)
class CursorTrail {
  constructor() {
    this.cursor = null;
    this.cursorDot = null;
    this.particles = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.cursorX = 0;
    this.cursorY = 0;
    this.particleCount = 8; // Reduced from 15
    this.isHovering = false;
    this.rafId = null;
    
    this.init();
  }
  
  init() {
    // Create custom cursor elements
    this.createCursor();
    
    // Create particle trail
    this.createParticles();
    
    // Add event listeners
    this.addEventListeners();
    
    // Start animation loop
    this.animate();
  }
  
  createCursor() {
    // Main cursor circle
    this.cursor = document.createElement('div');
    this.cursor.className = 'custom-cursor';
    this.cursor.style.willChange = 'transform';
    document.body.appendChild(this.cursor);
    
    // Cursor dot (center)
    this.cursorDot = document.createElement('div');
    this.cursorDot.className = 'custom-cursor-dot';
    this.cursorDot.style.willChange = 'transform';
    document.body.appendChild(this.cursorDot);
  }
  
  createParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'cursor-particle';
      particle.style.willChange = 'transform, opacity';
      document.body.appendChild(particle);
      
      this.particles.push({
        element: particle,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        speed: 0.1 + (i * 0.015)
      });
    }
  }
  
  addEventListeners() {
    // Track mouse movement with throttling
    let ticking = false;
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      
      if (!ticking) {
        ticking = true;
      }
    }, { passive: true });
    
    // Detect hoverable elements
    const hoverElements = document.querySelectorAll('a, button, .projects__item, input, textarea');
    
    hoverElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        this.isHovering = true;
        this.cursor.classList.add('cursor-hover');
        this.cursorDot.classList.add('cursor-hover');
      }, { passive: true });
      
      element.addEventListener('mouseleave', () => {
        this.isHovering = false;
        this.cursor.classList.remove('cursor-hover');
        this.cursorDot.classList.remove('cursor-hover');
      }, { passive: true });
    });
    
    // Hide default cursor
    document.body.style.cursor = 'none';
    document.querySelectorAll('a, button, input, textarea').forEach(el => {
      el.style.cursor = 'none';
    });
  }
  
  animate() {
    // Smooth cursor movement with easing
    this.cursorX += (this.mouseX - this.cursorX) * 0.15;
    this.cursorY += (this.mouseY - this.cursorY) * 0.15;
    
    // Use transform instead of left/top for better performance
    this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px) translate(-50%, -50%)`;
    this.cursorDot.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px) translate(-50%, -50%)`;
    
    // Update particles with trailing effect
    this.particles.forEach((particle, index) => {
      if (index === 0) {
        particle.targetX = this.cursorX;
        particle.targetY = this.cursorY;
      } else {
        particle.targetX = this.particles[index - 1].x;
        particle.targetY = this.particles[index - 1].y;
      }
      
      // Smooth particle movement
      particle.x += (particle.targetX - particle.x) * particle.speed;
      particle.y += (particle.targetY - particle.y) * particle.speed;
      
      // Use transform for better performance
      particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px) translate(-50%, -50%)`;
      
      // Fade out particles based on distance from cursor
      const distance = Math.sqrt(
        Math.pow(particle.x - this.cursorX, 2) + 
        Math.pow(particle.y - this.cursorY, 2)
      );
      const opacity = Math.max(0, 1 - (distance / 100));
      particle.element.style.opacity = opacity * 0.6;
    });
    
    this.rafId = requestAnimationFrame(() => this.animate());
  }
  
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.cursor?.remove();
    this.cursorDot?.remove();
    this.particles.forEach(p => p.element.remove());
  }
}

// Initialize cursor trail when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only enable on desktop (not touch devices)
  if (!('ontouchstart' in window)) {
    new CursorTrail();
  }
});
