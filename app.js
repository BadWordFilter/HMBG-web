/* ─── app.js — 햄부기(HMBG) v4 "ORDER UP!" ───
   역할 분담
   · nav.js     : 헤더/모바일 메뉴 (라이브러리 없음, 먼저 로드)
   · Lenis      : 스크롤 자체 (부드러운 휠 스크롤)
   · GSAP       : 스크롤에 묶인 것 + 시퀀스 (ScrollTrigger / SplitText / Flip)
   · anime.js   : 포인터·물리(스프링) 기반 마이크로 인터랙션 (spring / createAnimatable / createDraggable)
   한 요소의 transform 은 항상 한 라이브러리만 건드린다.
   모든 모듈은 라이브러리가 없으면 조용히 건너뛴다 (CDN 차단 시 정적 페이지로 동작). */
(() => {
  'use strict';

  const html = document.documentElement;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const SPLIT = window.SplitText;
  const FLIP = window.Flip;
  const A = window.anime;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqMD = matchMedia('(min-width: 768px)');
  const mqLG = matchMedia('(min-width: 1024px)');
  const MD = () => mqMD.matches;
  const LG = () => mqLG.matches;
  const MOTION = !REDUCE && !!G && !!ST;

  // 쿠키/사이트 데이터 차단 환경에서는 storage getter 자체가 throw 한다
  const store = {
    get(key, s) {
      try { return (s || window.localStorage).getItem(key); } catch (e) { return null; }
    },
    set(key, value, s) {
      try { (s || window.localStorage).setItem(key, value); } catch (e) { /* ignore */ }
    },
  };
  const session = () => { try { return window.sessionStorage; } catch (e) { return null; } };

  if (G) G.registerPlugin(...[ST, SPLIT, FLIP].filter(Boolean));
  if (ST) ST.config({ ignoreMobileResize: true });
  html.classList.add(MOTION ? 'motion' : 'reduce');

  const spring = (opts) => (A && A.spring ? A.spring(opts) : 'outElastic(1, .6)');

  /* ════════════════════════════
     1. LENIS — 부드러운 스크롤
  ════════════════════════════ */
  let lenis = null;
  if (MOTION && window.Lenis && store.get('hmbgSmooth') !== 'off') {
    try {
      lenis = new window.Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        anchors: true, // 오프셋은 CSS scroll-margin-top 이 단일 출처 (Lenis 가 이미 반영한다)
        prevent: (node) => !!(node && node.closest && node.closest('[data-lenis-prevent], iframe, dialog')),
      });
      lenis.on('scroll', ST.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } catch (e) {
      lenis = null;
    }
  }

  const scrollToTop = () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
  };

  /* ════════════════════════════
     2. NAV — 메뉴 이벤트 장식 + 활성 링크 Flip 점
     (메뉴 열고 닫기 자체는 nav.js)
  ════════════════════════════ */
  document.addEventListener('hmbg:menu', (e) => {
    const { open, links } = e.detail;
    if (open) {
      if (lenis) lenis.stop();
      if (A && MOTION) {
        A.animate(links, {
          translateY: [-10, 0],
          opacity: [0, 1],
          delay: A.stagger(40),
          ease: spring({ stiffness: 180, damping: 16 }),
        });
      }
    } else {
      if (lenis) lenis.start();
      if (A) A.utils.set(links, { translateY: 0, opacity: 1 });
    }
  });

  const sections = $$('main section[id]');
  const dot = document.createElement('span');
  dot.className = 'nav-dot';
  dot.setAttribute('aria-hidden', 'true');
  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    $$('.nav-link').forEach((a) => a.removeAttribute('aria-current'));
    const link = $(`.nav-link[href="#${id}"]`);
    if (!link) { dot.remove(); return; }
    link.setAttribute('aria-current', 'true');
    if (FLIP && MOTION && MD() && dot.isConnected) {
      const state = FLIP.getState(dot);
      link.append(dot);
      FLIP.from(state, { duration: 0.45, ease: 'back.out(2)' });
    } else {
      link.append(dot);
    }
  }

  if (ST && MOTION) {
    sections.forEach((s) => ST.create({
      trigger: s,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) setActive(s.id); },
    }));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -55% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ════════════════════════════
     3. HERO — 인트로 시퀀스
  ════════════════════════════ */
  function makeTiles(line2) {
    if (!SPLIT || !line2 || line2.querySelector('.tile')) return null;
    return SPLIT.create(line2, { type: 'words,chars', charsClass: 'tile', wordsClass: 'lb-word', aria: 'auto' });
  }

  function heroIntro() {
    const line2 = $('#hero-line-2');
    if (!MOTION) return; // CSS(.reduce)가 모든 [data-reveal]을 보여준다

    // CDN/폰트가 늦어 2.5s 페일세이프가 이미 히어로를 보여줬다면 다시 숨기지 않는다
    if (html.classList.contains('revealed')) {
      html.classList.add('intro-skipped');
      makeTiles(line2);
      return;
    }
    html.classList.add('motion-ready');

    const eyebrow = $('.hero .stamp-eyebrow');
    const line1 = $('#hero-line-1');
    const sub = $('#hero-sub');
    const btnWrap = $('#hero-btns');
    const btns = $$('#hero-btns .btn');
    const ticket = $('#hero-ticket');
    const nums = $$('.ticket-num');

    // anime 가 맡는 요소의 시작 상태를 미리 고정 (첫 프레임 깜빡임 방지)
    if (A) {
      A.utils.set(btns, { opacity: 0 });
      if (ticket) A.utils.set(ticket, { translateY: '-110%' });
    }
    nums.forEach((n) => { n.textContent = '0'; });

    const tl = G.timeline({ defaults: { ease: 'power3.out' } });

    if (eyebrow) tl.fromTo(eyebrow, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0);

    if (SPLIT && line1 && line2 && sub) {
      tl.set(line1, { autoAlpha: 1 }, 0);
      const split1 = SPLIT.create(line1, { type: 'words,chars', mask: 'chars', charsClass: 'hc', aria: 'auto' });
      tl.from(split1.chars, {
        yPercent: 130,
        duration: 0.6,
        stagger: 0.035,
        onComplete: () => split1.revert(), // 원래 텍스트로 복구 (리사이즈 안정성, LCP)
      }, 0.05);

      tl.set(line2, { autoAlpha: 1 }, 0.35);
      const split2 = makeTiles(line2);
      if (split2) {
        tl.from(split2.chars, {
          rotateX: -90,
          transformOrigin: '50% 100%',
          transformPerspective: 600,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.06,
          ease: 'back.out(1.8)',
        }, 0.35);
      }

      tl.set(sub, { autoAlpha: 1 }, 0.95);
      const split3 = SPLIT.create(sub, { type: 'lines', mask: 'lines', linesClass: 'hs-line', aria: 'auto' });
      tl.from(split3.lines, {
        yPercent: 120,
        duration: 0.7,
        stagger: 0.1,
        onComplete: () => split3.revert(),
      }, 0.95);
    } else {
      tl.fromTo([line1, line2, sub].filter(Boolean), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.6 }, 0.1);
    }

    // 주문 티켓이 레일에서 떨어진다 (anime spring)
    const ticketAt = LG() ? 0.6 : 1.3;
    tl.call(() => {
      if (!ticket) return;
      G.set(ticket, { autoAlpha: 1 });
      if (A) {
        A.animate(ticket, {
          translateY: ['-110%', '0%'],
          rotate: LG() ? [-5, 0] : [0, 0],
          ease: spring({ mass: 1, stiffness: 110, damping: 11 }),
        });
      }
    }, null, ticketAt);

    // 버튼 (anime spring)
    tl.call(() => {
      if (btnWrap) G.set(btnWrap, { autoAlpha: 1 });
      if (A && btns.length) {
        A.animate(btns, {
          translateY: [18, 0],
          opacity: [0, 1],
          delay: A.stagger(90),
          ease: spring({ stiffness: 140, damping: 13 }),
        });
      }
    }, null, 1.15);

    // 카운터 — 티켓이 자리 잡은 직후부터
    nums.forEach((n, i) => {
      const end = parseInt(n.dataset.count || '0', 10) || 0;
      const o = { v: 0 };
      tl.to(o, {
        v: end,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => { n.textContent = String(Math.round(o.v)); },
      }, ticketAt + 0.45 + i * 0.12);
    });
  }

  /* ════════════════════════════
     4. MARQUEE — 전광판 (스크롤 속도 반응, 화면 밖이면 정지)
  ════════════════════════════ */
  function marquee() {
    const mq = $('#marquee');
    const track = $('#marquee-track');
    if (!mq || !track || !MOTION) return;
    mq.classList.add('is-js');
    const tween = G.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    let live = true;
    ST.create({
      trigger: mq,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        live = self.isActive;
        tween.paused(!self.isActive);
      },
    });
    if (!LG()) return;
    let target = 1;
    let current = 1;
    ST.create({
      onUpdate: (self) => {
        if (live) target = G.utils.clamp(0.6, 3, 1 + Math.abs(self.getVelocity()) / 600);
      },
    });
    G.ticker.add(() => {
      if (!live) return;
      current += (target - current) * 0.08;
      target += (1 - target) * 0.04; // 스크롤이 멈추면 원래 속도로
      if (Math.abs(current - 1) < 0.002 && Math.abs(target - 1) < 0.002) {
        if (tween.timeScale() !== 1) tween.timeScale(1);
        return;
      }
      tween.timeScale(current);
    });
  }

  /* ════════════════════════════
     5. MAGNETIC BUTTONS (anime createAnimatable)
  ════════════════════════════ */
  function magnets() {
    if (!A || !MOTION || !FINE || !LG()) return;
    $$('[data-magnet]').forEach((btn) => {
      const m = A.createAnimatable(btn, { x: 450, y: 450, ease: 'out(4)' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        m.x(dx * 0.3);
        m.y(dy * 0.3);
      });
      btn.addEventListener('pointerleave', () => {
        m.x(0, 900, 'outElastic(1, .55)');
        m.y(0, 900, 'outElastic(1, .55)');
      });
    });
  }

  /* ════════════════════════════
     6. SECTION TITLES — 라인 마스크 리빌
  ════════════════════════════ */
  function titleReveals() {
    if (!MOTION || !SPLIT) return;
    $$('[data-split]').forEach((el) => {
      SPLIT.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'st-line',
        autoSplit: true,
        aria: 'auto',
        onSplit: (self) => G.from(self.lines, {
          yPercent: 120,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
  }

  /* ════════════════════════════
     7. RECIPE STATION — 스크롤로 햄버거 조립
  ════════════════════════════ */
  function recipe() {
    const visual = $('#recipe-visual');
    const steps = $$('.recipe-step');
    const plates = $$('#plate-ring .plate');
    const ings = $$('#burger .ing');
    const burger = $('#burger');
    const flag = $('#order-flag');
    const hint = $('#drag-hint');
    if (!visual || !steps.length || !ings.length || !MOTION) return;

    // 스프라이트 배율은 GSAP 가 소유한다 (CSS scale 은 no-JS/reduce 용)
    const base = () => (LG() ? 1.85 : MD() ? 1.4 : 1.1);
    G.set(ings, { y: -160, autoAlpha: 0, scale: base(), transformOrigin: '50% 100%' });
    G.set(plates, { autoAlpha: 1 });
    if (flag) {
      if (A) A.utils.set(flag, { opacity: 0, scale: 0 });
      else G.set(flag, { autoAlpha: 0 });
    }

    const snap2 = G.utils.snap(2);
    const toBurger = (i) => {
      const p = plates[i];
      const bx = visual.clientWidth / 2;
      const by = visual.clientHeight * 0.74;
      return { x: bx - p.offsetLeft, y: by - p.offsetTop };
    };

    const tl = G.timeline({
      scrollTrigger: {
        trigger: '#recipe-steps',
        start: 'top 60%',
        end: 'bottom 60%',
        scrub: MD() ? 0.6 : true,
        invalidateOnRefresh: true,
      },
    });

    ings.forEach((ing, i) => {
      tl.to(ing, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: 'back.out(1.4)',
        modifiers: { y: (v) => snap2(parseFloat(v)) + 'px' },
      }, i);
      if (i) {
        const below = ings.slice(0, i);
        tl.to(below, { scaleY: () => base() * 0.94, duration: 0.15, ease: 'power1.in' }, i + 0.85)
          .to(below, { scaleY: () => base(), duration: 0.15, ease: 'power1.out' }, i + 1);
      }
      if (plates[i]) {
        tl.to(plates[i], {
          x: () => toBurger(i).x,
          y: () => toBurger(i).y,
          scale: 0.5,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power2.in',
        }, i).set(plates[i], { x: 0, y: 0, scale: 1, autoAlpha: 0.3 }, i + 0.95);
      }
    });

    // 리사이즈로 배율이 바뀌면 현재 상태에 맞춰 다시 세팅
    ST.addEventListener('refreshInit', () => {
      G.set(ings, { scale: base() });
    });

    steps.forEach((step) => ST.create({
      trigger: step,
      start: 'top 55%',
      end: 'bottom 55%',
      toggleClass: 'is-active',
      onEnter: () => step.classList.add('is-done'),
    }));

    let dragEnabled = false;
    function enableDrag() {
      if (dragEnabled || !A || !A.createDraggable || !FINE || !LG() || !burger) return;
      dragEnabled = true;
      try {
        A.createDraggable(burger, {
          container: visual,
          containerPadding: 12,
          releaseStiffness: 110,
          releaseDamping: 12,
        });
        burger.classList.add('is-draggable');
        if (hint) hint.classList.add('is-visible');
      } catch (e) { /* draggable unavailable */ }
    }

    ST.create({
      trigger: steps[steps.length - 1],
      start: 'top 55%',
      once: true,
      onEnter: () => {
        if (A && burger) {
          A.animate(burger, {
            translateY: [
              { to: -16, duration: 160, ease: 'outQuad' },
              { to: 0, ease: spring({ stiffness: 220, damping: 9 }) },
            ],
          });
          if (flag) {
            A.animate(flag, {
              opacity: [0, 1],
              scale: [0, 1],
              rotate: [-10, 0],
              ease: spring({ stiffness: 200, damping: 12 }),
            });
          }
          enableDrag();
        } else if (flag) {
          G.to(flag, { autoAlpha: 1, duration: 0.4 });
        }
      },
    });
  }

  /* ════════════════════════════
     8. MENU STACK — 쌓이는 메뉴 카드 + 2026 눈금자
  ════════════════════════════ */
  function menu() {
    const today = $('#ruler-today');
    if (today) {
      const d = new Date();
      const m = d.getMonth() + 1;
      if (d.getFullYear() === 2026 && m >= 3 && m <= 12) {
        const daysInMonth = new Date(2026, m, 0).getDate();
        const x = (((m - 3) + d.getDate() / daysInMonth) / 10) * 100;
        today.style.setProperty('--x', `${x.toFixed(2)}%`);
        today.hidden = false;
      }
    }
    if (!MOTION) return;

    const cards = $$('.menu-card');
    cards.forEach((card, i) => {
      if (i >= cards.length - 1) return;
      G.to(card, {
        scale: 1 - (cards.length - 1 - i) * 0.025,
        transformOrigin: '50% 0',
        ease: 'none',
        scrollTrigger: {
          trigger: cards[i + 1],
          start: 'top bottom',
          end: `top top+=${94 + i * 14}`,
          scrub: true,
        },
      });
    });

    if (A && FINE) {
      cards.forEach((card) => {
        const inner = $('.menu-card-inner', card);
        if (!inner) return;
        card.addEventListener('pointerenter', () => A.animate(inner, { translateY: -6, ease: spring({ stiffness: 160, damping: 14 }) }));
        card.addEventListener('pointerleave', () => A.animate(inner, { translateY: 0, ease: spring({ stiffness: 160, damping: 14 }) }));
      });
    }
  }

  /* ════════════════════════════
     9. DISPLAY CASE — 프로젝트 인라인 플레이/영상
     (Flip 전환은 모션 허용 시에만, 다이얼로그 자체는 항상)
  ════════════════════════════ */
  function displayCase() {
    const dlg = $('#case');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const stage = $('#case-stage');
    const screen = $('#case-screen');
    const title = $('#case-title');
    const go = $('#case-go');
    const ext = $('#case-ext');
    const note = $('#case-note');
    const closeBtn = $('#case-close');
    if (!stage || !screen || !go || !closeBtn) return;
    const animated = !!(FLIP && MOTION && G);
    let current = null;

    const gateOk = (kind) => MD() && (kind !== 'game' || navigator.deviceMemory === undefined || navigator.deviceMemory >= 4);

    $$('.project-play-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.project-card');
        if (!card || !gateOk(card.dataset.kind) || current) return; // 기본 동작: 새 창
        e.preventDefault();
        open(card, btn);
      });
    });

    function move(vis, from, to, done) {
      if (!animated) {
        to.prepend(vis);
        done();
        return;
      }
      const state = FLIP.getState(vis);
      from.classList.add('is-flipping');
      to.classList.add('is-flipping');
      to.prepend(vis);
      FLIP.from(state, {
        duration: to === stage ? 0.7 : 0.45,
        ease: 'power3.inOut',
        absolute: true,
        scale: true,
        onComplete: () => {
          from.classList.remove('is-flipping');
          to.classList.remove('is-flipping');
          done();
        },
      });
    }

    function open(card, trigger) {
      const vis = $('[data-case-visual]', card);
      if (!vis) return;
      const home = vis.parentNode;
      const kind = card.dataset.kind;
      current = { card, vis, home, trigger, kind, src: card.dataset.src, fit: null };

      title.textContent = card.dataset.title || '프로젝트';
      ext.href = card.dataset.ext || '#';
      go.disabled = false;
      go.textContent = kind === 'game' ? '플레이 시작 (약 34MB · 데스크톱 권장)' : '영상 재생';
      note.textContent = kind === 'game'
        ? '버튼을 누르기 전까지는 게임 파일을 내려받지 않습니다. 마우스/키보드로 플레이하세요.'
        : 'YouTube 개인정보 보호 모드(youtube-nocookie)로 재생됩니다.';
      screen.className = 'case-screen';
      screen.innerHTML = '';

      dlg.showModal();
      if (lenis) lenis.stop();
      move(vis, home, stage, () => go.focus());
    }

    go.addEventListener('click', () => {
      if (!current || go.disabled) return;
      const { kind, src, vis, card } = current;
      const f = document.createElement('iframe');
      f.setAttribute('data-lenis-prevent', '');
      if (kind === 'game') {
        screen.classList.add('is-game');
        f.src = src;
        f.title = `${card.dataset.title} 플레이`;
        f.setAttribute('allow', 'fullscreen; autoplay');
        f.width = '960';
        f.height = '600';
        const fit = () => stage.style.setProperty('--s', String(Math.min(1, stage.clientWidth / 960)));
        fit();
        current.fit = fit;
        window.addEventListener('resize', fit);
      } else {
        screen.classList.add('is-video');
        f.src = src;
        f.title = `${card.dataset.title} 영상`;
        f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
      }
      closeBtn.focus(); // 비활성화될 버튼에서 포커스를 먼저 옮긴다
      go.disabled = true;
      go.textContent = kind === 'game' ? '로딩 중…' : '재생 중';
      note.textContent = kind === 'game' ? '게임을 불러오는 중입니다…' : '영상을 재생합니다.';
      f.addEventListener('load', () => {
        if (!current || current.vis !== vis) return;
        if (G) G.to(vis, { autoAlpha: 0, duration: 0.4 });
        else vis.style.visibility = 'hidden';
        go.textContent = kind === 'game' ? '플레이 중' : '재생 중';
        note.textContent = kind === 'game' ? '게임이 준비되었습니다. 화면을 클릭해 시작하세요.' : '영상이 재생 중입니다.';
      });
      screen.appendChild(f);
    });

    function close() {
      if (!current) return;
      const { vis, home, trigger, fit } = current;
      if (fit) window.removeEventListener('resize', fit);
      screen.innerHTML = ''; // WebGL/오디오 해제
      if (G) {
        G.killTweensOf(vis);
        G.set(vis, { clearProps: 'opacity,visibility' });
      } else {
        vis.style.visibility = '';
      }
      move(vis, stage, home, () => {
        dlg.close();
        if (lenis) lenis.start();
        go.disabled = false;
        current = null;
        if (trigger) trigger.focus();
      });
    }

    closeBtn.addEventListener('click', close);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  /* ════════════════════════════
     10. WALL OF FAME — 액자
  ════════════════════════════ */
  function awards() {
    const frame = $('#award-frame');
    const inner = $('#award-frame-inner');
    const wall = $('#wall');
    if (!frame || !MOTION) return;
    G.from(frame, {
      rotate: -8,
      duration: 1.4,
      ease: 'elastic.out(1, .35)',
      scrollTrigger: { trigger: wall || frame, start: 'top 70%', once: true },
    });
    if (A && FINE && LG() && inner) {
      const t = A.createAnimatable(inner, { rotate: 700, ease: 'outElastic(1, .5)' });
      const straighten = () => t.rotate(2);
      const relax = () => t.rotate(0);
      frame.addEventListener('pointerenter', straighten);
      frame.addEventListener('pointerleave', relax);
      frame.addEventListener('focusin', straighten);
      frame.addEventListener('focusout', relax);
    }
  }

  /* ════════════════════════════
     11. KITCHEN CREW — 이름표
  ════════════════════════════ */
  function crew() {
    const tags = $$('.name-tag');
    const grid = $('#crew-grid');
    if (!tags.length || !MOTION) return;
    if (A) {
      A.utils.set(tags, { opacity: 0 });
      ST.create({
        trigger: grid || tags[0],
        start: 'top 78%',
        once: true,
        onEnter: () => A.animate(tags, {
          translateY: [-28, 0],
          rotate: [() => A.utils.random(-4, 4), 0],
          opacity: [0, 1],
          delay: A.stagger(80),
          ease: spring({ stiffness: 130, damping: 11 }),
        }),
      });
      if (FINE) {
        tags.forEach((tag) => tag.addEventListener('pointerenter', () => A.animate(tag, {
          rotate: [
            { to: 3, duration: 140 },
            { to: -2, duration: 140 },
            { to: 1, duration: 140 },
            { to: 0, duration: 260 },
          ],
          ease: 'outQuad',
        })));
      }
    } else {
      G.from(tags, {
        autoAlpha: 0,
        y: -28,
        stagger: 0.08,
        duration: 0.7,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: grid || tags[0], start: 'top 78%', once: true },
      });
    }
  }

  /* ════════════════════════════
     12. CLOSED TICKET — 프린터 + 도장
  ════════════════════════════ */
  function join() {
    const printer = $('#printer');
    const ticket = $('#join-ticket');
    const stamp = $('#closed-stamp');
    if (!ticket || !MOTION) return;
    if (stamp) {
      if (A) A.utils.set(stamp, { opacity: 0 });
      else G.set(stamp, { autoAlpha: 0 });
    }
    G.from(ticket, {
      yPercent: -100,
      duration: 1.3,
      ease: 'steps(16)',
      scrollTrigger: { trigger: printer || ticket, start: 'top 65%', once: true },
      onComplete: () => {
        if (!stamp) return;
        if (A) {
          A.animate(stamp, {
            scale: [1.7, 1],
            rotate: [-6, 0],
            opacity: [0, 0.9],
            ease: spring({ stiffness: 210, damping: 13 }),
          });
        } else {
          G.to(stamp, { autoAlpha: 0.9, duration: 0.3 });
        }
      },
    });
  }

  /* ════════════════════════════
     13. BELL — 맨 위로
  ════════════════════════════ */
  function bell() {
    const btn = $('#scroll-top-btn');
    if (!btn) return;
    if (ST && MOTION) {
      ST.create({ start: 400, end: 'max', toggleClass: { targets: btn, className: 'visible' } });
    } else {
      const toggle = () => btn.classList.toggle('visible', window.scrollY > 400);
      window.addEventListener('scroll', toggle, { passive: true });
      toggle();
    }
    btn.addEventListener('click', () => {
      scrollToTop();
      const svg = $('svg', btn);
      if (A && MOTION && svg) {
        A.animate(svg, {
          rotate: [
            { to: -18, duration: 110 },
            { to: 14, duration: 150 },
            { to: -8, duration: 150 },
            { to: 0, duration: 280 },
          ],
          ease: 'outQuad',
        });
      }
    });
  }

  /* ════════════════════════════
     14. SPLINE SLOT — 조건부 3D 로더
     data-spline-url 이 비어 있으면 아무것도 하지 않는다.
     ?spline=demo → Spline 공식 샘플 씬으로 파이프라인만 점검.
  ════════════════════════════ */
  function splineSlot() {
    const slot = $('#spline-slot');
    if (!slot) return;
    const demo = new URLSearchParams(location.search).get('spline') === 'demo';
    const url = slot.dataset.splineUrl || (demo ? 'https://prod.spline.design/iEAs8HJFu91daMOq/scene.splinecode' : '');
    if (!url) return;
    const saveData = navigator.connection && navigator.connection.saveData === true;
    const memOk = navigator.deviceMemory === undefined || navigator.deviceMemory >= 4;
    const ss = session();
    if (!MOTION || !FINE || !LG() || saveData || !memOk || store.get('splineFailed', ss)) return;

    const sprites = ['#burger', '#plate-ring'];
    const fail = () => {
      store.set('splineFailed', '1', ss);
      slot.innerHTML = '';
      slot.classList.remove('is-live');
      G.to(sprites, { autoAlpha: 1, duration: 0.3 });
    };

    const load = async () => {
      try {
        if (!customElements.get('spline-viewer')) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.type = 'module';
            s.src = 'https://unpkg.com/@splinetool/viewer@2.0.2/build/spline-viewer.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
          await customElements.whenDefined('spline-viewer');
        }
        const v = document.createElement('spline-viewer');
        v.setAttribute('url', url);
        v.setAttribute('loading', 'lazy');
        v.setAttribute('loading-anim-type', 'spinner-small-dark');
        v.setAttribute('events-target', 'local');
        v.setAttribute('unloadable', '');
        v.setAttribute('background', '#6a071a');
        const timer = setTimeout(fail, 8000);
        v.addEventListener('load-complete', () => {
          clearTimeout(timer);
          slot.classList.add('is-live');
          G.to(sprites, { autoAlpha: 0, duration: 0.4 });
        });
        v.addEventListener('context-loss', fail);
        v.addEventListener('error', fail);
        slot.appendChild(v);
      } catch (e) {
        fail();
      }
    };

    // 페이지 로드가 끝난 뒤, 실제로 가까워졌을 때, 브라우저가 한가할 때만
    const startObserving = () => {
      if (!('IntersectionObserver' in window)) { load(); return; }
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
        else setTimeout(load, 0);
      }, { rootMargin: '0px 0px 200px 0px' });
      io.observe(slot);
    };
    if (document.readyState === 'complete') startObserving();
    else window.addEventListener('load', startObserving, { once: true });
  }

  /* ════════════════════════════
     INIT
  ════════════════════════════ */
  function init() {
    heroIntro();
    marquee();
    titleReveals();
    recipe();
    menu();
    displayCase();
    awards();
    crew();
    join();
    bell();
    magnets();
    splineSlot();
    if (ST) {
      ST.refresh();
      window.addEventListener('load', () => ST.refresh());
    }
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(init, init);
})();
