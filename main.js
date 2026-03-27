/* ---------------------------------------------------
   1. NAVBAR: background on scroll
   --------------------------------------------------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ---------------------------------------------------
   2. MOBILE MENU TOGGLE
   Locks body scroll on iOS by using position:fixed
   and saving/restoring the scroll position.
   --------------------------------------------------- */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
let savedScrollY = 0;

function openMenu() {
    savedScrollY = window.scrollY;
    navLinks.classList.add('open');
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    document.body.style.top = `-${savedScrollY}px`;
}

function closeMenu() {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
}

navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.contains('open');
    if (isOpen) {
        closeMenu();
    } else {
        openMenu();
    }
});

// Close menu when a link is tapped
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => closeMenu());
});

/* ---------------------------------------------------
   3. THEME TOGGLE (dark / light)
   Persists choice in localStorage.
   --------------------------------------------------- */
const themeToggle = document.getElementById('themeToggle');
const favicon = document.getElementById('favicon');
const root = document.documentElement;

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    favicon.href = theme === 'dark' ? 'logo-dark.svg' : 'logo-light.svg';
}

// Check for saved preference, default to dark
const savedTheme = localStorage.getItem('kharos-theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('kharos-theme', next);
});

/* ---------------------------------------------------
   4. SCROLL FADE-IN (IntersectionObserver)
   --------------------------------------------------- */
const fadeEls = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // animate once
        }
    });
}, { threshold: 0.15 });

fadeEls.forEach(el => observer.observe(el));
