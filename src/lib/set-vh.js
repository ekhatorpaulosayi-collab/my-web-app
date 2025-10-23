// src/lib/set-vh.js
// iOS viewport height fix - sets real 100vh that accounts for Safari's dynamic UI
export function setRealVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Update on resize and orientation change
window.addEventListener('resize', setRealVh);
window.addEventListener('orientationchange', setRealVh);

// Initialize on load
setRealVh();
