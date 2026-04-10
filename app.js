/* ─── app.js — 햄부기(HMBG) ─── */
'use strict';



/* ════════════════════════════
   2. NAVBAR — scroll + shrink
════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ════════════════════════════
   3. HAMBURGER MENU
════════════════════════════ */
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');

hamburgerBtn.addEventListener('click', () => {
  const isOpen = hamburgerBtn.classList.toggle('open');
  navLinks.classList.toggle('open', isOpen);
  hamburgerBtn.setAttribute('aria-expanded', isOpen);
});
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburgerBtn.classList.remove('open');
    navLinks.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  });
});

/* ════════════════════════════
   4. HERO PARTICLES
════════════════════════════ */
(function spawnParticles() {
  const container = document.getElementById('particles-container');
  if (!container) return;
  const colours = [
    'hsl(300,100%,70%)',
    'hsl(185,100%,65%)',
    'hsl(270,90%,70%)',
    'hsl(320,80%,60%)',
    'hsl(200,100%,65%)',
  ];
  for (let i = 0; i < 55; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 1.5 + Math.random() * 2.5;
    const left = Math.random() * 100;
    const dur = 8 + Math.random() * 14;
    const delay = -(Math.random() * 14);
    const col = colours[Math.floor(Math.random() * colours.length)];
    p.style.cssText = `
      left: ${left}%;
      bottom: 0;
      width: ${size}px;
      height: ${size}px;
      background: ${col};
      box-shadow: 0 0 ${size * 4}px ${col};
      --dur: ${dur}s;
      --delay: ${delay}s;
    `;
    container.appendChild(p);
  }
})();

/* ════════════════════════════
   5. NUMBER COUNTER
════════════════════════════ */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 4); // ease-out-quart
    el.textContent = Math.floor(ease * target);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

/* ════════════════════════════
   6. INTERSECTION OBSERVER
════════════════════════════ */
// Scroll reveal
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left').forEach(el => revealObs.observe(el));

// Staggered delays
document.querySelectorAll('.activity-card').forEach((c, i) => { c.style.transitionDelay = `${i * 75}ms`; });
document.querySelectorAll('.project-card').forEach((c, i) => { c.style.transitionDelay = `${i * 75}ms`; });
document.querySelectorAll('.member-card').forEach((c, i) => { c.style.transitionDelay = `${i * 75}ms`; });
document.querySelectorAll('.pillar').forEach((c, i) => { c.style.transitionDelay = `${i * 60}ms`; });
document.querySelectorAll('.join-step').forEach((c, i) => { c.style.transitionDelay = `${i * 100}ms`; });

// Counter trigger
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num[data-target]').forEach(animateCounter);
      counterObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

const heroStats = document.getElementById('hero-stats');
if (heroStats) counterObs.observe(heroStats);

/* ════════════════════════════
   7. PROJECT FILTER
════════════════════════════ */
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const f = btn.dataset.filter;
    projectCards.forEach((card, i) => {
      const match = f === 'all' || card.dataset.category === f;
      if (match) {
        card.classList.remove('hidden');
        card.style.transitionDelay = `${i * 60}ms`;
        // Re-trigger reveal
        card.classList.remove('visible');
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

/* ════════════════════════════
   8. ACTIVE NAV HIGHLIGHT
════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-link:not(.nav-cta)');
const navObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(link => {
        const active = link.getAttribute('href') === '#' + entry.target.id;
        link.style.color = active ? 'var(--text-0)' : '';
      });
    }
  });
}, { threshold: 0.35 });
sections.forEach(s => navObs.observe(s));

/* ════════════════════════════
   9. JOIN FORM
════════════════════════════ */
const joinForm = document.getElementById('join-form');
const joinSuccess = document.getElementById('join-success');

if (joinForm) {
  joinForm.addEventListener('submit', e => {
    e.preventDefault();

    const nameEl = document.getElementById('input-name');
    const deptEl = document.getElementById('input-dept');
    const msgEl = document.getElementById('input-msg');

    const fields = [
      { el: nameEl, val: nameEl.value.trim() },
      { el: deptEl, val: deptEl.value.trim() },
      { el: msgEl, val: msgEl.value.trim() },
    ];
    const invalid = fields.filter(f => !f.val);

    if (invalid.length) {
      invalid.forEach(({ el }) => {
        el.style.borderColor = 'hsl(0,80%,60%)';
        el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
        el.addEventListener('input', () => {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }, { once: true });
      });
      invalid[0].el.focus();
      return;
    }

    // Submit animation
    const submitBtn = joinForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>처리 중...</span>';

    setTimeout(() => {
      joinForm.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      joinForm.style.opacity = '0';
      joinForm.style.transform = 'translateY(-12px)';
      setTimeout(() => {
        joinForm.style.display = 'none';
        joinSuccess.style.display = 'block';
        joinSuccess.style.animation = 'hero-enter 0.7s var(--ease) both';
      }, 400);
    }, 600);
  });
}

/* ════════════════════════════
   10. SCROLL TO TOP
════════════════════════════ */
const scrollTopBtn = document.getElementById('scroll-top-btn');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
