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

  // Optional hero video: uses data-src on #hero-video; respects reduced-motion and save-data
  (async function initHeroVideo(){
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    const video = document.getElementById('hero-video');
    if (!video || prefersReduced || saveData) return;
    const src = video.getAttribute('data-src');
    if (!src) return;
    try {
      const res = await fetch(src, { method: 'HEAD' });
      if (!res.ok) return; // no video available
      video.setAttribute('src', src);
      video.style.display = 'block';
      const canvas = document.getElementById('hero-canvas');
      if (canvas) canvas.style.display = 'none';
      await video.play().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) video.pause(); else video.play().catch(()=>{});
      });

      // Custom loop point (e.g., stop before watermark): 2:59.5 (179.5s)
      const CUSTOM_LOOP_TIME = 179.5;
      const resetTo = 0.02; // small offset to avoid potential first-frame flash

      // Guard for very short videos
      const applyCustomLoop = () => {
        // If duration exists and loop point is valid
        if (Number.isFinite(video.duration) && video.duration > 1) {
          video.addEventListener('timeupdate', () => {
            if (video.currentTime >= CUSTOM_LOOP_TIME) {
              try {
                video.currentTime = resetTo;
                // some browsers require play to resume after setting currentTime
                if (video.paused) video.play().catch(()=>{});
              } catch (_) {}
            }
          });
          video.addEventListener('ended', () => {
            try { video.currentTime = resetTo; video.play().catch(()=>{}); } catch(_) {}
          });
        }
      };

      if (video.readyState >= 1) applyCustomLoop();
      else video.addEventListener('loadedmetadata', applyCustomLoop, { once: true });
    } catch (_) { /* ignore */ }
  })();

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

    if (window.ScrollTrigger) {
      document.querySelectorAll(".card").forEach((card) => {
        window.gsap.from(card, {
          y: 28,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        });
      });
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

  // WebGL hero (Three.js shader)
  const getCSSHexColor = (varName) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    // supports #RRGGBB
    return v || '#ffffff';
  };
  const hexToThreeColor = (hex) => {
    const THREE = window.THREE;
    return new THREE.Color(hex);
  };

  try {
    const canvas = document.getElementById('hero-canvas');
    const canUseWebGL = () => {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (_) { return false; }
    };
    const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!prefersReduced && canvas && window.THREE && canUseWebGL() && !lowPower && !saveData) {
      const THREE = window.THREE;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_accentA: { value: hexToThreeColor(getCSSHexColor('--primary')) },
        u_accentB: { value: hexToThreeColor(getCSSHexColor('--ocean')) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.3) }
      };

      const vertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `;

      const fragment = `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec3 u_accentA;
        uniform vec3 u_accentB;
        uniform vec2 u_mouse;

        // Simple fbm noise
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(in vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          for(int i=0;i<5;i++){
            v += a * noise(p);
            p *= 2.0; a *= 0.5;
          }
          return v;
        }

        void main(){
          vec2 uv = vUv;
          vec2 st = uv * u_resolution.xy / max(u_resolution.x, u_resolution.y);
          vec2 m = u_mouse;
          vec2 flow = vec2(
            fbm(st * 1.2 + m * 0.3 + u_time * 0.05),
            fbm(st * 1.1 - m * 0.2 - u_time * 0.04)
          );
          float n = fbm(st * 2.0 + flow * 1.2 + u_time * 0.06);
          float glow = smoothstep(0.35, 0.95, n);
          vec3 col = mix(u_accentA, u_accentB, glow);
          // Vignette and depth tint
          float d = distance(uv, vec2(0.7, 0.2));
          col *= 1.0 - smoothstep(0.6, 1.2, d);
          gl_FragColor = vec4(col, 0.9);
        }
      `;

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const onResize = () => {
        const { clientWidth, clientHeight } = canvas;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(dpr);
        renderer.setSize(clientWidth, clientHeight, false);
        uniforms.u_resolution.value.set(clientWidth * dpr, clientHeight * dpr);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(canvas);
      onResize();

      let rafId = 0;
      const start = performance.now();
      const tick = () => {
        uniforms.u_time.value = (performance.now() - start) / 1000;
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
      };
      tick();

      // update shader colors on theme change
      window.addEventListener('themechange', () => {
        uniforms.u_accentA.value = hexToThreeColor(getCSSHexColor('--primary'));
        uniforms.u_accentB.value = hexToThreeColor(getCSSHexColor('--ocean'));
      });

      // gentle mouse parallax
      window.addEventListener('pointermove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        uniforms.u_mouse.value.x += (x - uniforms.u_mouse.value.x) * 0.08;
        uniforms.u_mouse.value.y += (y - uniforms.u_mouse.value.y) * 0.08;
      }, { passive: true });

      // pause when tab hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(rafId); else tick();
      });
    } else if (canvas) {
      // Hide canvas if we skip WebGL
      canvas.style.display = 'none';
    }
  } catch (err) {
    // fail silently; hero gradient remains
  }

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
      if (prefersReduced || !window.gsap || !overlay) {
        if (window.__lenis) {
          window.__lenis.scrollTo(target, { offset: -64 });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        focusFirstHeading(target);
        // ensure reveals inside target are visible after nav
        target.querySelectorAll('.reveal').forEach((el)=>el.classList.add('is-visible'));
        if (sr) sr.textContent = `Navigated to ${hash.replace('#','')}`;
        if (mainEl) mainEl.removeAttribute('aria-busy');
        return;
      }
      return new Promise((resolve) => {
        overlay.style.transformOrigin = 'top center';
        window.gsap.timeline({ onComplete: resolve })
          .to(overlay, { duration: 0.28, ease: 'power2.in', scaleY: 1 })
          .add(() => {
            if (window.__lenis) {
              window.__lenis.scrollTo(target, { immediate: true, offset: -64 });
            } else {
              const top = target.getBoundingClientRect().top + window.pageYOffset - 64;
              window.scrollTo({ top, left: 0, behavior: 'auto' });
            }
            focusFirstHeading(target);
            overlay.style.transformOrigin = 'bottom center';
            // ensure reveals inside target are visible
            target.querySelectorAll('.reveal').forEach((el)=>el.classList.add('is-visible'));
            if (sr) sr.textContent = `Navigated to ${hash.replace('#','')}`;
          })
          .to(overlay, { duration: 0.38, ease: 'power3.out', scaleY: 0, onComplete(){ if (mainEl) mainEl.removeAttribute('aria-busy'); } });
      });
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

  // Theme picker logic
  (function initThemePicker(){
    const swatches = Array.from(document.querySelectorAll('.theme-swatches .swatch'));
    const apply = (val) => {
      document.documentElement.setAttribute('data-theme', val);
      localStorage.setItem('theme', val);
      window.dispatchEvent(new Event('themechange'));
      swatches.forEach(btn => btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme') === val)));
    };
    const saved = localStorage.getItem('theme');
    const initial = saved || 'palette-1';
    apply(initial);
    swatches.forEach(btn => btn.addEventListener('click', () => apply(btn.getAttribute('data-theme'))));
  })();

  // Animated kinetic logo interactions
  (function initKineticLogo(){
    const el = document.querySelector('.logo-kinetic svg');
    if (!el || !window.gsap) return;
    const orbits = el.querySelector('#orbits');
    // slow continuous rotation
    window.gsap.to(orbits, { rotate: 360, transformOrigin: '32px 32px', repeat: -1, duration: 18, ease: 'none' });
    // hover pulse
    const wrapper = document.querySelector('.logo-kinetic');
    if (wrapper){
      wrapper.addEventListener('pointerenter', () => {
        window.gsap.to(wrapper, { duration: 0.3, scale: 1.06, ease: 'power2.out' });
      });
      wrapper.addEventListener('pointerleave', () => {
        window.gsap.to(wrapper, { duration: 0.4, scale: 1.0, ease: 'power3.out' });
      });
      wrapper.addEventListener('pointermove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        window.gsap.to(el, { duration: 0.3, rotateX: y * -8, rotateY: x * 8, transformOrigin: 'center' });
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
});


