document.addEventListener("DOMContentLoaded", () => {
  console.log('[BOOT] main.js DOMContentLoaded', { host: location.host, ua: navigator.userAgent, time: new Date().toISOString() });
  window.addEventListener('error', (e) => {
    console.error('[GLOBAL ERROR]', { msg: e.message, file: e.filename, line: e.lineno, col: e.colno, err: e.error });
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED REJECTION]', e.reason);
  });
  const IS_GHPAGES = location.hostname.endsWith('github.io');
  console.log('[ENV]', { IS_GHPAGES });
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Simple intersection observer reveal (progressively enhanced)
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  console.log('[IO] using IntersectionObserver?', !prefersReduced && 'IntersectionObserver' in window);
  if (!prefersReduced && "IntersectionObserver" in window) {
    const revealEls = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log('[IO] reveal', entry.target);
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  }

  // Safety: if reveals are still hidden in production, force-show after load
  setTimeout(() => {
    let forced = 0;
    document.querySelectorAll('.reveal').forEach((el) => {
      if (!el.classList.contains('is-visible')) { el.classList.add('is-visible'); forced++; }
    });
    console.log('[REVEAL] safety forced =', forced);
  }, 800);

  // Lightweight analytics: send custom events if Plausible present
  (function initAnalytics(){
    const plausible = window.plausible;
    if (!plausible) return;
    document.querySelectorAll('[data-analytics]').forEach((el) => {
      el.addEventListener('click', () => {
        const event = el.getAttribute('data-event') || 'Click';
        plausible(event, { props: { href: el.getAttribute('href') || '', text: (el.textContent||'').trim() } });
      });
    });
  })();

  // If landing directly on projects, reveal cards immediately
  (function revealProjectsOnDirectHash(){
    if (location.hash === '#projects') {
      const section = document.querySelector('#projects');
      if (section) section.querySelectorAll('.reveal').forEach((el)=>el.classList.add('is-visible'));
    }
  })();

  // Hero background image (replaced video with static image)
  // Image is loaded directly in HTML with loading="eager" for immediate display

  // Smooth scrolling with Lenis
  // Smooth scrolling: disable Lenis on GitHub Pages to avoid double-easing
  if (!prefersReduced && window.Lenis && !location.hostname.endsWith('github.io')) {
    const lenis = new window.Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });
    window.__lenis = lenis;
    // Ensure native smooth scrolling is disabled to avoid double-easing
    document.documentElement.style.scrollBehavior = 'auto';
    function raf(time){
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    console.log('[LENIS] enabled');
  }
  else {
    try { window.__lenis?.destroy?.(); } catch(_) {}
    window.__lenis = null;
    document.documentElement.style.scrollBehavior = 'smooth';
    console.log('[LENIS] disabled; using native smooth');
  }

  // GSAP reveal enhancements
  if (!prefersReduced && window.gsap) {
    if (window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
    }
    const tl = window.gsap.timeline();
    tl.from(".headline", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".kicker", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
      .from(".cta .btn", { y: 12, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.1 }, "-=0.3");
    // Avoid GSAP setting inline opacity on cards in production (was leaving them 0)
    if (window.ScrollTrigger) {
      if (location.hostname.endsWith('github.io')) {
        document.querySelectorAll('.card').forEach((card) => {
          card.style.opacity = '';
          card.style.transform = '';
          card.classList.add('is-visible');
        });
        console.log('[CARDS] GSAP card animations disabled on GH Pages');
      } else {
        document.querySelectorAll(".card").forEach((card) => {
          window.gsap.from(card, {
            y: 28,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none reverse"
            },
            onComplete: () => window.gsap.set(card, { clearProps: 'all' })
          });
        });
      }
    }
  }

  // Projects: parallax and 3D tilt interactions
  (function initProjectsInteractions(){
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = Array.from(document.querySelectorAll('.projects .card'));
    if (!cards.length) return;

    // Scroll parallax for media
    if (!prefersReduced && window.gsap && window.ScrollTrigger) {
      cards.forEach((card, i) => {
        const media = card.querySelector('.card-media');
        if (!media) return;
        const depth = 12 + (i % 3) * 8; // vary subtly
        window.gsap.to(media, {
          yPercent: -10 - (i % 3) * 5,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    }

    // 3D hover tilt with graceful fallback and image parallax
    if (prefersReduced) return; // skip hover effects for reduced motion
    cards.forEach((card) => {
      let raf = 0;
      let targetRX = 0, targetRY = 0;
      const maxTilt = 8; // degrees
      const mediaImg = card.querySelector('.card-media img');
      const updateMouseVars = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = (x / rect.width) * 2 - 1;   // -1..1
        const py = (y / rect.height) * 2 - 1;  // -1..1
        targetRY = px * maxTilt;
        targetRX = -py * maxTilt;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if (mediaImg) {
          const imgTx = px * -8; // px translate
          const imgTy = py * -8;
          mediaImg.style.transform = `scale(1.08) translate(${imgTx}px, ${imgTy}px)`;
        }
      };
      const animate = () => {
        const m = 0.1;
        const rx = getCurrent(card, 'rotateX');
        const ry = getCurrent(card, 'rotateY');
        const nx = rx + (targetRX - rx) * 0.12;
        const ny = ry + (targetRY - ry) * 0.12;
        card.style.transform = `translateZ(0) rotateX(${nx}deg) rotateY(${ny}deg)`;
        raf = requestAnimationFrame(animate);
      };
      const getCurrent = (el, axis) => {
        const st = el.style.transform || '';
        const match = st.match(axis === 'rotateX' ? /rotateX\((-?\d+\.?\d*)deg\)/ : /rotateY\((-?\d+\.?\d*)deg\)/);
        return match ? parseFloat(match[1]) : 0;
      };
      const onEnter = (e) => {
        card.classList.add('is-hovering');
        updateMouseVars(e);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(animate);
      };
      const onMove = (e) => { updateMouseVars(e); };
      const onLeave = () => {
        card.classList.remove('is-hovering');
        cancelAnimationFrame(raf);
        // ease back to neutral
        if (window.gsap) {
          window.gsap.to(card, { duration: 0.5, ease: 'power3.out', rotateX: 0, rotateY: 0, onUpdate(){
            // keep translateZ(0)
            const tx = window.getComputedStyle(card).transform;
          }});
          if (mediaImg) window.gsap.to(mediaImg, { duration: 0.5, ease: 'power3.out', scale: 1.06, x: 0, y: 0, clearProps: 'transform' });
        } else {
          card.style.transform = 'translateZ(0)';
          if (mediaImg) mediaImg.style.transform = '';
        }
      };
      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      card.addEventListener('pointercancel', onLeave);
    });
  })();

  // WebGL canvas removed - using static image background instead

  // Hash navigation + page-like transitions
  (function initPageTransitions(){
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = document.querySelector('.transition-overlay');
    const sr = document.getElementById('sr-announce');
    const mainEl = document.getElementById('main');
    const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
    const allHashLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
    const getTarget = (hash) => document.querySelector(hash);
    const focusFirstHeading = (section) => {
      const h = section.querySelector('h1, h2, h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    };
    const updateActiveNav = () => {
      const hash = location.hash || '#hero';
      navLinks.forEach((a) => a.removeAttribute('aria-current'));
      const active = navLinks.find((a) => a.getAttribute('href') === hash);
      if (active) active.setAttribute('aria-current','page');
    };
    updateActiveNav();
    window.addEventListener('hashchange', updateActiveNav);

    const navigate = async (hash) => {
      const target = getTarget(hash);
      if (!target) return;
      if (mainEl) mainEl.setAttribute('aria-busy','true');
      
      // Simple smooth scroll without overlay animation
      if (window.__lenis) {
        window.__lenis.scrollTo(target, { offset: -64, duration: 1.2 });
      } else {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 64;
        window.scrollTo({ top, left: 0, behavior: 'smooth' });
      }
      
      // Wait a bit for scroll to complete, then clean up
      setTimeout(() => {
        focusFirstHeading(target);
        // ensure reveals inside target are visible after nav
        target.querySelectorAll('.reveal').forEach((el)=>el.classList.add('is-visible'));
        if (sr) sr.textContent = `Navigated to ${hash.replace('#','')}`;
        if (mainEl) mainEl.removeAttribute('aria-busy');
      }, prefersReduced ? 100 : 600);
    };

    allHashLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        e.preventDefault();
        const current = location.hash || '#hero';
        if (href === current) return;
        history.pushState(null, '', href);
        navigate(href);
        updateActiveNav();
      });
    });

    // Apply navigation on initial hash to normalize scroll animation
    if (location.hash && location.hash !== '#hero') {
      const initialTarget = getTarget(location.hash);
      if (initialTarget) {
        // Use microtask to allow initial layout, then navigate
        setTimeout(() => navigate(location.hash), 0);
      }
    }
  })();

  // Theme picker logic - palette-2 is now the only available theme
  (function initThemePicker(){
    // Always apply palette-2 as the default and only theme
    document.documentElement.setAttribute('data-theme', 'palette-2');
    // Clear any saved theme preference to ensure palette-2 is always used
    localStorage.removeItem('theme');
    window.dispatchEvent(new Event('themechange'));
  })();

  // Sci-fi parallax header background animations
  (function initHeaderParallax(){
    const header = document.querySelector('.site-header');
    const headerBg = document.querySelector('.header-bg');
    if (!header || !headerBg) return;
    
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    
    const layers = headerBg.querySelectorAll('.bg-layer');
    const particlesLayer = headerBg.querySelector('.bg-particles');
    const glowLayer = headerBg.querySelector('.bg-glow');
    
    // Parallax on mouse move (relative to header)
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    
    const handleMouseMove = (e) => {
      const rect = header.getBoundingClientRect();
      mouseX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      mouseY = (e.clientY - rect.top - rect.height / 2) / rect.height;
    };
    
    const animateParallax = () => {
      targetX += (mouseX - targetX) * 0.1;
      targetY += (mouseY - targetY) * 0.1;
      
      // Combine mouse and scroll parallax
      const scrollOffset = Math.min(scrollY * 0.05, 10);
      
      if (particlesLayer) {
        const particleX = targetX * -18;
        const particleY = targetY * -18 + scrollOffset * 0.8;
        particlesLayer.style.transform = `translate(${particleX}px, ${particleY}px)`;
      }
      
      if (glowLayer) {
        const glowX = targetX * 25;
        const glowY = targetY * 25 + scrollOffset * 0.3;
        glowLayer.style.transform = `translate(${glowX}px, ${glowY}px)`;
      }
      
      requestAnimationFrame(animateParallax);
    };
    
    // Scroll-based parallax (subtle vertical movement)
    let scrollY = 0;
    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    
    // Hover intensity boost on header
    header.addEventListener('pointerenter', () => {
      headerBg.style.opacity = '1';
      if (glowLayer) {
        glowLayer.style.opacity = '1';
      }
      if (particlesLayer) {
        particlesLayer.style.opacity = '0.9';
      }
    });
    
    header.addEventListener('pointerleave', () => {
      headerBg.style.opacity = '1';
      if (glowLayer) {
        glowLayer.style.opacity = '0.8';
      }
      if (particlesLayer) {
        particlesLayer.style.opacity = '0.7';
      }
    });
    
    header.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    animateParallax();
    
    // GSAP enhancements if available
    if (window.gsap && glowLayer) {
      window.gsap.to(glowLayer, {
        scale: 1.2,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      });
    }
  })();

  // Header blending: lighten at top, solid on scroll
  (function initHeaderBlend(){
    const header = document.querySelector('.site-header');
    if (!header) return;
    const update = () => {
      if (window.scrollY < 10) {
        header.classList.add('at-top');
        header.classList.remove('scrolled');
      } else {
        header.classList.remove('at-top');
        header.classList.add('scrolled');
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  })();

  // Mobile menu toggle
  (function initMobileMenu(){
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.site-nav');
    if (!toggle || !nav) return;

    const openMenu = () => {
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('mobile-open');
      nav.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('mobile-open');
      nav.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu();
      else openMenu();
    });

    // Close menu when clicking nav links
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (toggle.getAttribute('aria-expanded') === 'true' && 
          !nav.contains(e.target) && 
          !toggle.contains(e.target)) {
        closeMenu();
      }
    });
  })();

  // Back to top button
  (function initBackToTop(){
    const button = document.querySelector('.back-to-top');
    if (!button) return;

    const updateVisibility = () => {
      if (window.scrollY > 300) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { duration: 1.2 });
      }
    });
  })();

  // Scroll indicator click handler
  (function initScrollIndicator(){
    const indicator = document.querySelector('.scroll-indicator');
    if (!indicator) return;

    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector('#about');
      if (target) {
        if (window.__lenis) {
          window.__lenis.scrollTo(target, { offset: -64, duration: 1.2 });
        } else {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 64;
          window.scrollTo({ top, left: 0, behavior: 'smooth' });
        }
      }
    });
  })();
});


