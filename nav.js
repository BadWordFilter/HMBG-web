/* ─── nav.js — 햄부기(HMBG) 헤더 / 모바일 메뉴 ───
   라이브러리 의존이 전혀 없고, vendor 스크립트보다 먼저 로드되므로
   CDN이 느리거나 막혀도 내비게이션은 항상 동작한다.
   app.js 는 'hmbg:menu' 이벤트를 받아 Lenis 정지와 스프링 애니메이션만 덧붙인다. */
(() => {
  'use strict';

  const html = document.documentElement;
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('nav-links');
  const burger = document.getElementById('hamburger-btn');
  if (!navbar || !navLinks || !burger) return;

  // CSS 는 이 클래스가 있을 때만 모바일 메뉴를 접는다 (JS 없으면 링크가 그대로 보인다)
  html.classList.add('nav-js');

  const mqMD = matchMedia('(min-width: 768px)');
  const logo = document.getElementById('nav-logo-link');
  const inertTargets = [
    document.getElementById('main'),
    document.querySelector('.footer'),
    document.getElementById('scroll-top-btn'),
    document.querySelector('.skip-link'),
  ].filter(Boolean);
  const links = () => Array.from(navLinks.querySelectorAll('a'));

  let open = false;

  function emit(state) {
    document.dispatchEvent(new CustomEvent('hmbg:menu', { detail: { open: state, links: links() } }));
  }

  function setMenu(next) {
    open = next;
    burger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    inertTargets.forEach((el) => { el.inert = open; });
    document.body.classList.toggle('menu-open', open);
    emit(open);
    if (open) {
      const first = links()[0];
      if (first) first.focus({ preventScroll: true });
    }
  }

  burger.addEventListener('click', () => setMenu(!open));
  navLinks.addEventListener('click', (e) => {
    if (open && e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setMenu(false);
      burger.focus();
      return;
    }
    if (e.key !== 'Tab') return;
    // 실제 DOM 순서: 로고 → 링크들 → 햄버거 버튼
    const focusables = [logo, ...links(), burger].filter(Boolean);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  mqMD.addEventListener('change', (e) => { if (e.matches && open) setMenu(false); });

  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.hmbgNav = { isOpen: () => open, close: () => setMenu(false) };
})();
