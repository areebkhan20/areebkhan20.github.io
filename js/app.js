const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let lenis = null;
const scrollStateKey = 'areeb-khan-scroll-y';
const initialHash = window.location.hash;
const navigationEntry = performance.getEntriesByType('navigation')[0];
const isReload = navigationEntry?.type === 'reload';
let restoredScrollY = 0;
let scrollRestored = false;

try {
    restoredScrollY = isReload ? Number(sessionStorage.getItem(scrollStateKey) || 0) : 0;
} catch (_) {
    restoredScrollY = 0;
}

// Pinned scroll stories need to calculate from a known position. Browser scroll
// restoration can otherwise restore a mid-page offset while the loader is
// locking overflow, leaving ScrollTrigger and the smooth scroller out of sync.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (initialHash) {
    history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}`);
}
window.scrollTo(0, 0);

const saveScrollPosition = () => {
    // While the loader still has the page parked at the top, a second refresh
    // would otherwise overwrite the saved position with 0 and lose it.
    const value = (isReload && !scrollRestored) ? restoredScrollY : window.scrollY;
    try {
        sessionStorage.setItem(scrollStateKey, String(value));
    } catch (_) { }
};

window.addEventListener('pagehide', saveScrollPosition);
window.addEventListener('beforeunload', saveScrollPosition);
window.addEventListener('pageshow', event => {
    if (!event.persisted) {
        window.scrollTo(0, 0);
        return;
    }
    lenis?.resize();
    window.ScrollTrigger?.refresh();
    window.ScrollTrigger?.update();
});

document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('is-ready');
    setupNavigation();
    setupReveals();
    setupHeroParallax();
    setupOctivisParallax();
    setupMarqueeDrag();

    if (!reduceMotion.matches && window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        setupDesktopScrollStories();
        setupLazyImageRefresh();
    }

    if (!reduceMotion.matches && window.gsap) {
        setupHeroEntrance();
    }

    await setupLoader();

    setupSmoothScroll();
    window.ScrollTrigger?.refresh();

    // Jump first so lazy content near the destination starts loading, then run a
    // full refresh at the restored position: pins and scrubbed timelines hard-sync
    // to the real layout instead of easing from measurements taken at the top.
    window.scrollTo(0, getInitialScrollDestination());
    window.ScrollTrigger?.refresh();

    const destination = getInitialScrollDestination();
    window.scrollTo(0, destination);
    lenis?.scrollTo(destination, { immediate: true, force: true });
    window.ScrollTrigger?.update();
    scrollRestored = true;

    if (initialHash) {
        history.replaceState(
            history.state,
            '',
            `${window.location.pathname}${window.location.search}${initialHash}`
        );
    }
});

function setupLazyImageRefresh() {
    // Lazy images that finish loading after the triggers were measured can move
    // every section below them, so re-measure once the burst of loads settles.
    let refreshTimer;
    document.querySelectorAll('img[loading="lazy"]').forEach(image => {
        if (image.complete) return;
        image.addEventListener('load', () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => window.ScrollTrigger?.refresh(), 220);
        }, { once: true });
    });
}

function getInitialScrollDestination() {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    if (initialHash === '#home') return 0;

    if (initialHash === '#sec') {
        const story = document.querySelector('.hero-work-story.story-hydrated');
        if (story) {
            const storyTop = story.getBoundingClientRect().top + window.scrollY;
            const storyTravel = Math.max(0, story.offsetHeight - window.innerHeight);
            return Math.min(maxScroll, storyTop + storyTravel * 0.82);
        }
    }

    if (initialHash) {
        const target = document.querySelector(initialHash);
        if (target) {
            const targetY = target.getBoundingClientRect().top + window.scrollY;
            return Math.max(0, Math.min(maxScroll, targetY));
        }
    }

    return Math.max(0, Math.min(maxScroll, restoredScrollY));
}

function setupSmoothScroll() {
    if (reduceMotion.matches || typeof Lenis === 'undefined') return;

    lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 1,
        smoothWheel: true
    });
    window.lenis = lenis;

    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(time => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        // Halt Lenis while ScrollTrigger measures: pin reverts shift the page
        // mid-refresh, and if Lenis re-asserts its cached position during that
        // window the triggers record positions offset by the scroll amount.
        ScrollTrigger.addEventListener('refreshInit', () => lenis?.stop());
        // pin spacers change the page height after Lenis measures it
        ScrollTrigger.addEventListener('refresh', () => {
            lenis?.resize();
            lenis?.start();
        });
    } else {
        const raf = time => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
    }
}

function smoothScrollTo(target, options = {}) {
    if (lenis) {
        lenis.scrollTo(target, { duration: 1.1, force: true, ...options });
        return;
    }
    const top = typeof target === 'number'
        ? target
        : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function setupLoader() {
    const loader = document.querySelector('.site-loader');
    if (!loader) {
        document.documentElement.classList.remove('is-loading');
        return Promise.resolve();
    }

    loader.classList.add('is-running');
    const startedAt = performance.now();
    const minimumDisplay = reduceMotion.matches ? 650 : 1600;
    const maximumDisplay = reduceMotion.matches ? 3000 : 7000;

    const pageLoaded = document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

    const criticalImages = [...document.querySelectorAll('main img, .work-reveal img')];
    criticalImages.forEach(image => { image.loading = 'eager'; });
    const imagesReady = Promise.all(criticalImages.map(image => {
        if (image.complete) return image.decode?.().catch(() => {}) || Promise.resolve();
        return new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        });
    }));

    const fontsReady = document.fonts?.ready?.catch(() => {}) || Promise.resolve();
    const layoutSettled = new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const ready = Promise.all([pageLoaded, imagesReady, fontsReady, layoutSettled]);
    const timeout = new Promise(resolve => setTimeout(resolve, maximumDisplay));

    return Promise.race([ready, timeout]).then(() => {
        const remaining = Math.max(0, minimumDisplay - (performance.now() - startedAt));
        return new Promise(resolve => setTimeout(resolve, remaining));
    }).then(() => new Promise(resolve => {
        loader.classList.add('is-complete');
        document.documentElement.classList.remove('is-loading');
        window.setTimeout(() => {
            loader.remove();
            resolve();
        }, reduceMotion.matches ? 80 : 620);
    }));
}

function setupNavigation() {
    const header = document.querySelector('header');
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');
    const progress = document.getElementById('scroll-progress');
    let ticking = false;

    if (hamburger && menu) {
        hamburger.addEventListener('click', () => menu.classList.toggle('active'));
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('active');
            });
        });
        document.addEventListener('click', event => {
            if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
                menu.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            const hash = link.getAttribute('href');
            if (!hash || hash === '#') return;

            if (hash === '#home') {
                event.preventDefault();
                smoothScrollTo(0);
                return;
            }

            if (hash === '#sec') {
                const story = document.querySelector('.hero-work-story.story-hydrated');
                if (story) {
                    event.preventDefault();
                    const storyTop = story.getBoundingClientRect().top + window.scrollY;
                    const storyTravel = Math.max(0, story.offsetHeight - window.innerHeight);
                    smoothScrollTo(storyTop + storyTravel * 0.82);
                    return;
                }
            }

            const target = document.querySelector(hash);
            if (!target) return;
            event.preventDefault();
            smoothScrollTo(target);
        });
    });

    const paintScrollUI = () => {
        const scrollY = window.scrollY;
        header?.classList.toggle('nav-scrolled', scrollY > 48);

        if (progress) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const value = max > 0 ? Math.min(1, scrollY / max) : 0;
            progress.style.transform = `scaleX(${value})`;
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(paintScrollUI);
        }
    }, { passive: true });
    paintScrollUI();
}

function setupReveals() {
    const targets = [
        ...document.querySelectorAll('.octivis-case__header, .life__header, .contact-card')
    ];

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        targets.forEach(element => element.classList.add('is-visible'));
        return;
    }

    targets.forEach(element => element.classList.add('reveal-item'));
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(element => observer.observe(element));
}

function setupMarqueeDrag() {
    if (!window.gsap) return;

    document.querySelectorAll('.marquee').forEach(marquee => {
        const track = marquee.querySelector('.marquee__track');
        if (!track) return;

        // JS drives the loop from here on; the CSS keyframes are disabled via
        // this class so drag flicks can speed the ride up or pull it backwards.
        marquee.classList.add('marquee--interactive');
        const direction = track.classList.contains('marquee__track--right') ? 1 : -1;
        let half = 0;
        let offset = 0;
        let velocity = 0;
        let dragging = false;
        let lastX = 0;

        const measure = () => { half = track.scrollWidth / 2; };
        measure();
        window.addEventListener('resize', measure, { passive: true });

        // The track holds two copies of the same frames, so any offset in
        // (-half, 0] shows a seamless strip.
        const wrap = value => {
            if (!half) return 0;
            let wrapped = value % half;
            if (wrapped > 0) wrapped -= half;
            return wrapped;
        };

        const render = () => {
            track.style.transform = `translate3d(${offset}px, 0, 0)`;
        };

        gsap.ticker.add((_, deltaTime) => {
            if (dragging) return;
            const dt = Math.min(deltaTime / 1000, 0.1);
            const base = reduceMotion.matches ? 0 : direction * (half / 45);
            offset = wrap(offset + (base + velocity) * dt);
            velocity *= Math.exp(-2.6 * dt);
            if (Math.abs(velocity) < 2) velocity = 0;
            render();
        });

        marquee.addEventListener('dragstart', event => event.preventDefault());
        marquee.addEventListener('pointerdown', event => {
            dragging = true;
            lastX = event.clientX;
            velocity = 0;
            try { marquee.setPointerCapture(event.pointerId); } catch (_) { }
            marquee.classList.add('is-dragging');
        });
        marquee.addEventListener('pointermove', event => {
            if (!dragging) return;
            const dx = event.clientX - lastX;
            lastX = event.clientX;
            offset = wrap(offset + dx);
            velocity = dx * 60;
            render();
        });
        const release = () => {
            if (!dragging) return;
            dragging = false;
            marquee.classList.remove('is-dragging');
        };
        marquee.addEventListener('pointerup', release);
        marquee.addEventListener('pointercancel', release);
    });
}

function setupOctivisParallax() {
    if (reduceMotion.matches) return;

    const section = document.querySelector('.octivis-case');
    const images = section ? [...section.querySelectorAll('.octivis-story__media img')] : [];
    if (!section || !images.length) return;

    section.classList.add('octivis-parallax');
    let frame = 0;

    const render = () => {
        frame = 0;
        const viewHeight = window.innerHeight;

        images.forEach(image => {
            const rect = image.parentElement.getBoundingClientRect();
            if (rect.bottom < -120 || rect.top > viewHeight + 120) return;

            // -1..1 progress of the frame's centre through the viewport
            const progressY = ((rect.top + rect.height / 2) - viewHeight / 2) / ((viewHeight + rect.height) / 2);
            image.style.transform = `translate3d(0, ${progressY * -16}%, 0) scale(1.25)`;
        });
    };

    const requestRender = () => {
        if (!frame) frame = requestAnimationFrame(render);
    };

    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender, { passive: true });
    render();
}

function setupHeroEntrance() {
    gsap.from('.hero-intro > *', {
        y: 22,
        opacity: 0,
        duration: 0.75,
        stagger: 0.09,
        ease: 'power2.out',
        delay: 0.12
    });
}

function bindHeroTap(element, onTap) {
    let startPoint = null;

    const isInteractive = target => target instanceof Element
        && Boolean(target.closest('a, button, input, textarea, select, label'));

    const handlePointerDown = event => {
        if (event.pointerType === 'mouse' || event.isPrimary === false || isInteractive(event.target)) {
            startPoint = null;
            return;
        }

        startPoint = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    };

    const handlePointerUp = event => {
        if (!startPoint || event.pointerId !== startPoint.pointerId) return;

        const distance = Math.hypot(
            event.clientX - startPoint.x,
            event.clientY - startPoint.y
        );
        startPoint = null;

        // A short stationary gesture is a tap. Longer movement is page scroll.
        if (distance <= 18) onTap(event);
    };

    const cancelTap = () => { startPoint = null; };

    element.addEventListener('pointerdown', handlePointerDown, { passive: true });
    element.addEventListener('pointerup', handlePointerUp, { passive: true });
    element.addEventListener('pointercancel', cancelTap, { passive: true });

    return () => {
        element.removeEventListener('pointerdown', handlePointerDown);
        element.removeEventListener('pointerup', handlePointerUp);
        element.removeEventListener('pointercancel', cancelTap);
    };
}

function setupHeroParallax() {
    const hero = document.querySelector('main');
    if (!hero || reduceMotion.matches) return;

    const layers = [...hero.querySelectorAll('.parallax')].map(element => ({
        element,
        speedX: Number(element.dataset.speedx || 0),
        speedY: Number(element.dataset.speedy || 0),
        speedZ: Number(element.dataset.speedz || 0),
        rotation: Number(element.dataset.rotation || 0)
    }));

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;
    const render = () => {
        const ease = 0.16;
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        const rotationDegree = (currentX / Math.max(hero.clientWidth / 2, 1)) * 20;

        layers.forEach(({ element, speedX, speedY, speedZ, rotation }) => {
            const x = -currentX * speedX;
            const y = currentY * speedY;
            const z = Math.max(-50, Math.min(50, currentX * speedZ * 0.08));
            const r = rotationDegree * rotation;
            element.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${r}deg)`;
        });

        if (Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15) {
            frame = requestAnimationFrame(render);
        } else {
            frame = 0;
        }
    };

    const requestRender = () => {
        if (!frame) frame = requestAnimationFrame(render);
    };

    if (finePointer.matches) {
        hero.addEventListener('pointermove', event => {
            // Mobile scroll motion owns these transforms at this breakpoint.
            if (window.matchMedia('(max-width: 900px)').matches) return;

            const rect = hero.getBoundingClientRect();
            targetX = event.clientX - rect.left - rect.width / 2;
            targetY = event.clientY - rect.top - rect.height / 2;
            requestRender();
        }, { passive: true });
    }

    // Touch-first tablets wider than the mobile breakpoint use the same layer
    // math as desktop, but a tap supplies the target instead of a cursor.
    bindHeroTap(hero, event => {
        if (window.matchMedia('(max-width: 900px)').matches) return;

        const rect = hero.getBoundingClientRect();
        targetX = event.clientX - rect.left - rect.width / 2;
        targetY = event.clientY - rect.top - rect.height / 2;
        requestRender();
    });

    // Apply the neutral transform immediately so the layered hero is correct
    // before the first pointer event. When the pointer leaves, the last target
    // remains in place instead of snapping the composition back to center.
    render();
}

function setupDesktopScrollStories() {
    const media = gsap.matchMedia();
    media.add('(min-width: 901px)', () => {
        const cleanups = [
            setupProjectStory(),
            setupAboutOctivisTransition(),
            setupRecognitionStory(),
            setupExperienceStory(),
            setupEducationStory()
        ].filter(Boolean);

        return () => cleanups.forEach(cleanup => cleanup());
    });

    // Phones and small tablets get lighter, unpinned takes on the same stories.
    // gsap.matchMedia() reverts everything created here when the breakpoint flips.
    media.add('(max-width: 900px)', () => {
        return setupMobileStories();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 180);
    }, { passive: true });

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

function setupMobileStories() {
    const revealFrom = (target, vars, start = 'top 87%') => {
        gsap.from(target, {
            ease: 'power2.out',
            duration: 0.7,
            ...vars,
            scrollTrigger: {
                trigger: vars.trigger || target,
                start,
                toggleActions: 'play none none reverse'
            }
        });
    };

    const hero = document.querySelector('main');
    const touchLayers = [];

    // Scroll supplies the base drift. Tap offsets are kept separately and
    // added on top, so the composition stays where the user moved it even
    // after the tap animation settles.
    gsap.utils.toArray('main .parallax').forEach(layer => {
        const speedY = Number(layer.dataset.speedy || 0.06);
        const speedX = Number(layer.dataset.speedx || 0);
        const speedZ = Number(layer.dataset.speedz || 0);
        const rotation = Number(layer.dataset.rotation || 0);
        const state = {
            scrollX: 0,
            scrollY: 0,
            tapX: 0,
            tapY: 0,
            tapZ: 0,
            tapRotation: 0
        };
        gsap.set(layer, {
            xPercent: -50,
            yPercent: -50,
            transformPerspective: 900,
            force3D: true
        });
        const setX = gsap.quickSetter(layer, 'x', 'px');
        const setY = gsap.quickSetter(layer, 'y', 'px');
        const setZ = gsap.quickSetter(layer, 'z', 'px');
        const setRotation = gsap.quickSetter(layer, 'rotationY', 'deg');
        const renderLayer = () => {
            setX(state.scrollX + state.tapX);
            setY(state.scrollY + state.tapY);
            setZ(state.tapZ);
            setRotation(state.tapRotation);
        };

        renderLayer();
        gsap.fromTo(state, { scrollX: 0, scrollY: 0 }, {
            scrollY: () => -speedY * window.innerHeight * 1.5,
            scrollX: () => speedX * 50,
            ease: 'none',
            onUpdate: renderLayer,
            scrollTrigger: {
                trigger: 'main',
                start: 'top top',
                end: 'bottom top',
                scrub: 0.3,
                invalidateOnRefresh: true
            }
        });

        touchLayers.push({ state, speedX, speedY, speedZ, rotation, renderLayer, tapTween: null });
    });

    const removeTapHandler = hero ? bindHeroTap(hero, event => {
        const rect = hero.getBoundingClientRect();
        const targetX = event.clientX - rect.left - rect.width / 2;
        const targetY = event.clientY - rect.top - rect.height / 2;
        const rotationDegree = (targetX / Math.max(rect.width / 2, 1)) * 16;

        touchLayers.forEach(entry => {
            entry.tapTween?.kill();
            entry.tapTween = gsap.to(entry.state, {
                tapX: -targetX * entry.speedX,
                tapY: targetY * entry.speedY,
                tapZ: Math.max(-40, Math.min(40, targetX * entry.speedZ * 0.08)),
                tapRotation: rotationDegree * entry.rotation,
                duration: 0.78,
                ease: 'power3.out',
                overwrite: 'auto',
                onUpdate: entry.renderLayer
            });
        });
    }) : () => {};

    // Hero recedes as the work scrolls up over it — mobile echo of the desktop
    // pull-back story.
    gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: 'main',
            start: 'top top',
            end: 'bottom 30%',
            scrub: 0.35
        }
    })
        .to('main', { scale: 0.92, yPercent: 6, opacity: 0.3, borderRadius: 26 }, 0)
        .to('.hero-intro', { opacity: 0, y: -26, duration: 0.55 }, 0);

    revealFrom('.showcase__heading', { y: 44, opacity: 0 });
    gsap.utils.toArray('.scatter-item').forEach((item, index) => {
        revealFrom(item, {
            y: 58,
            x: index % 2 ? 30 : -30,
            rotation: index % 2 ? 2.4 : -2.4,
            scale: 0.94,
            opacity: 0,
            duration: 0.75
        }, 'top 90%');
    });

    // Octivis rises in with the rounded clip hand-off from the desktop story.
    gsap.from('.octivis-case', {
        y: 90,
        scale: 0.965,
        clipPath: 'inset(4% 4% 0% 4% round 26px 26px 0 0)',
        transformOrigin: '50% 0%',
        ease: 'none',
        scrollTrigger: {
            trigger: '.octivis-case',
            start: 'top 96%',
            end: 'top 42%',
            scrub: 0.4
        }
    });

    revealFrom('.recog__heading', { y: 40, opacity: 0 });
    gsap.utils.toArray('.recog-frame').forEach((frame, index) => {
        revealFrom(frame, {
            y: 60,
            rotation: index % 2 ? 2.6 : -2.6,
            opacity: 0
        }, 'top 92%');
    });

    revealFrom('.exp-h__intro', { y: 40, opacity: 0 });
    gsap.utils.toArray('.exp-h__card').forEach(card => {
        revealFrom(card, { y: 54, scale: 0.97, opacity: 0, duration: 0.65 }, 'top 92%');
    });

    // Education wordmark slides together around the tower, like the desktop pin.
    gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: '.education-story__statement',
            start: 'top 92%',
            end: 'top 40%',
            scrub: 0.35
        }
    })
        .from('.education-story__word--left', { x: -46, opacity: 0.25 }, 0)
        .from('.education-story__word--right', { x: 46, opacity: 0.25 }, 0)
        .from('.education-story__image', { scaleY: 0.62, transformOrigin: '50% 100%' }, 0);

    revealFrom('.education-story__meta', { y: 26, opacity: 0 });
    gsap.utils.toArray('.education__card').forEach(card => {
        revealFrom(card, { y: 42, opacity: 0 }, 'top 93%');
    });

    return () => {
        removeTapHandler();
        touchLayers.forEach(entry => entry.tapTween?.kill());
    };
}

function setupAboutOctivisTransition() {
    const about = document.querySelector('.about-reveal');
    const aboutGrid = about?.querySelector('.about-grid');
    const section = document.querySelector('.octivis-case');
    const logo = section?.querySelector('.octivis-case__logo');
    const intro = section ? [...section.querySelectorAll('.octivis-case__intro > *')] : [];
    if (!about || !aboutGrid || !section || !logo) return;

    section.classList.add('octivis-transition-hydrated');
    gsap.set(section, {
        y: 130,
        scale: 0.94,
        clipPath: 'inset(9% 3.5% 0% 3.5% round 34px 34px 0 0)',
        transformOrigin: '50% 0%'
    });
    gsap.set(logo, { opacity: 0, scale: 0.78, y: 24 });
    gsap.set(intro, { opacity: 0, x: 54 });

    const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: section,
            start: 'top 98%',
            end: 'top 10%',
            scrub: 0.4,
            invalidateOnRefresh: true
        }
    });

    // Explicit from-values keep a mid-scroll ScrollTrigger.refresh() from
    // re-recording animated states as the new baseline (see setupProjectStory).
    timeline
        .fromTo(aboutGrid, { scale: 1, y: 0, opacity: 1 }, {
            scale: 0.9, y: -84, opacity: 0.18, duration: 1, immediateRender: false
        }, 0)
        .fromTo(section, {
            y: 130,
            scale: 0.94,
            clipPath: 'inset(9% 3.5% 0% 3.5% round 34px 34px 0 0)'
        }, {
            y: 0,
            scale: 1,
            clipPath: 'inset(0% 0% 0% 0% round 0px)',
            duration: 1
        }, 0)
        .fromTo(logo, { opacity: 0, scale: 0.78, y: 24 }, {
            opacity: 1, scale: 1, y: 0, duration: 0.58, ease: 'power2.out', immediateRender: false
        }, 0.28)
        .fromTo(intro, { opacity: 0, x: 54 }, {
            opacity: 1, x: 0, stagger: 0.08, duration: 0.56, ease: 'power2.out', immediateRender: false
        }, 0.34);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('octivis-transition-hydrated');
        gsap.set([section, aboutGrid, logo, ...intro], { clearProps: 'transform,opacity,clipPath' });
    };
}

function setupProjectStory() {
    const story = document.querySelector('.hero-work-story');
    const stage = story?.querySelector('.hero-work-stage');
    const main = story?.querySelector('main');
    const reveal = story?.querySelector('.work-reveal');
    const about = story?.querySelector('.about-reveal');
    if (!story || !stage || !main || !reveal || !about) return;

    story.classList.add('story-hydrated');
    const scatter = reveal.querySelector('.scatter');
    const items = gsap.utils.toArray('.work-reveal .scatter-item');
    const heading = reveal.querySelector('.showcase__heading');
    const heroIntro = main.querySelector('.hero-intro');
    const aboutGrid = about.querySelector('.about-grid');
    const aboutHold = { progress: 0 };

    gsap.set(reveal, { autoAlpha: 0 });
    gsap.set(items, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.72, y: 70 });
    gsap.set(heading, { opacity: 0, y: 24 });
    gsap.set(about, { yPercent: 100 });
    gsap.set(aboutGrid, { opacity: 0, y: 52 });

    const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: story,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.32,
            invalidateOnRefresh: true
        }
    });

    // Every tween declares explicit from-values: with invalidateOnRefresh, a
    // ScrollTrigger.refresh() mid-story (lazy image load, resize) would
    // otherwise re-record the current mid-animation state as the new start and
    // the story could never scrub back to its resting look.
    timeline
        .fromTo(main, { scale: 1, y: 0, borderRadius: 0 }, {
            scale: 0.32,
            y: () => window.innerHeight * 0.34,
            borderRadius: 24,
            duration: 0.54
        }, 0)
        .fromTo(heroIntro, { opacity: 1 }, { opacity: 0, duration: 0.18, immediateRender: false }, 0.04)
        .fromTo(reveal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, immediateRender: false }, 0.12)
        .fromTo(heading, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.28, immediateRender: false }, 0.18)
        .fromTo(items, { opacity: 0, scale: 0.72, y: 70 }, {
            opacity: 1,
            scale: 1,
            y: 0,
            rotation: 0,
            stagger: 0.045,
            duration: 0.34,
            immediateRender: false
        }, 0.2)
        .fromTo(reveal, { autoAlpha: 1, y: 0 }, { autoAlpha: 0.2, y: -40, duration: 0.22, immediateRender: false }, 1.0)
        .fromTo(main, { opacity: 1 }, { opacity: 0.12, duration: 0.2, immediateRender: false }, 1.0)
        .fromTo(about, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: 'power2.inOut', immediateRender: false }, 1.0)
        .fromTo(aboutGrid, { opacity: 0, y: 52 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', immediateRender: false }, 1.12)
        .to(aboutHold, { progress: 1, duration: 0.55, ease: 'none' });

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        story.classList.remove('story-hydrated');
        gsap.set(main, { clearProps: 'transform,borderRadius,opacity' });
        gsap.set(reveal, { clearProps: 'transform,opacity,visibility' });
        gsap.set([heroIntro, heading, about, aboutGrid], { clearProps: 'transform,opacity' });
        gsap.set(items, { clearProps: 'transform,opacity' });
    };
}

function setupRecognitionStory() {
    const section = document.querySelector('.recog');
    if (!section) return;

    section.classList.add('recog-hydrated');
    const frames = gsap.utils.toArray('.recog .recog-frame');
    const heading = section.querySelector('.recog__heading');

    gsap.set(frames, {
        xPercent: -50,
        yPercent: -50,
        y: 64,
        opacity: 0,
        rotation: (_, target) => Number(target.dataset.rot || 0)
    });
    gsap.set(heading, { opacity: 0, y: 24 });

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${window.innerHeight * 2.35}`,
            pin: true,
            scrub: 0.24,
            anticipatePin: 1,
            invalidateOnRefresh: true
        }
    });

    // Explicit from-values keep a mid-scroll ScrollTrigger.refresh() from
    // re-recording animated states as the new baseline (see setupProjectStory).
    timeline
        .fromTo(heading, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.22, ease: 'none' }, 0)
        .fromTo(frames, { y: 64, opacity: 0 }, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.16,
            ease: 'power2.out',
            immediateRender: false
        }, 0.15)
        .fromTo(frames, { opacity: 1, y: 0 }, { opacity: 0.12, y: -30, duration: 0.34, ease: 'power1.in', immediateRender: false }, 1.58)
        .fromTo(heading, { opacity: 1, y: 0 }, { opacity: 0, y: -22, duration: 0.28, ease: 'none', immediateRender: false }, 1.7);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('recog-hydrated');
        gsap.set([heading, ...frames], { clearProps: 'transform,opacity' });
    };
}

function setupExperienceStory() {
    const section = document.querySelector('.exp-h');
    const track = section?.querySelector('.exp-h__track');
    if (!section || !track) return;

    section.classList.add('exp-hydrated');
    const intro = section.querySelector('.exp-h__intro');
    const cards = gsap.utils.toArray('.exp-h__card');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.07);
    gsap.set(intro, { opacity: 0, y: 34 });
    gsap.set(cards, { opacity: 0.36, y: 54 });

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.35}`,
            pin: true,
            scrub: 0.2,
            anticipatePin: 1,
            invalidateOnRefresh: true
        }
    });

    // Explicit from-values keep a mid-scroll ScrollTrigger.refresh() from
    // re-recording animated states as the new baseline (see setupProjectStory).
    timeline
        .fromTo(intro, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.12, ease: 'none' }, 0)
        .fromTo(cards, { opacity: 0.36, y: 54 }, {
            opacity: 1, y: 0, stagger: 0.02, duration: 0.16, ease: 'power1.out', immediateRender: false
        }, 0.02)
        .fromTo(track, { x: 0 }, { x: () => -distance(), duration: 0.88, ease: 'none', immediateRender: false }, 0.12);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('exp-hydrated');
        gsap.set([track, intro, ...cards], { clearProps: 'transform,opacity' });
    };
}

function setupEducationStory() {
    const section = document.querySelector('.education-story');
    const stage = section?.querySelector('.education-story__stage');
    const statement = section?.querySelector('.education-story__statement');
    const image = section?.querySelector('.education-story__image');
    const meta = section?.querySelector('.education-story__meta');
    const leftWord = section?.querySelector('.education-story__word--left');
    const rightWord = section?.querySelector('.education-story__word--right');
    const details = section?.querySelector('.education__container');
    const cards = section ? gsap.utils.toArray('.education-story .education__card') : [];
    if (!section || !stage || !statement || !image || !meta || !leftWord || !rightWord || !details) return;

    section.classList.add('education-hydrated');
    gsap.set(meta, { opacity: 0, y: -18 });
    gsap.set(leftWord, { x: -70, opacity: 0.28 });
    gsap.set(rightWord, { x: 70, opacity: 0.28 });
    gsap.set(details, { opacity: 0, y: 54 });
    gsap.set(cards, { opacity: 0, y: 28 });

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${window.innerHeight * 2.15}`,
            pin: true,
            scrub: 0.2,
            anticipatePin: 1,
            invalidateOnRefresh: true
        }
    });

    // Explicit from-values keep a mid-scroll ScrollTrigger.refresh() from
    // re-recording animated states as the new baseline (see setupProjectStory).
    // The image's from mirrors its stylesheet size so invalidation re-records
    // the same resting frame.
    timeline
        .fromTo(meta, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.16, ease: 'none' }, 0)
        .fromTo(leftWord, { x: -70, opacity: 0.28 }, { x: 0, opacity: 1, duration: 0.26, ease: 'power2.out', immediateRender: false }, 0.02)
        .fromTo(rightWord, { x: 70, opacity: 0.28 }, { x: 0, opacity: 1, duration: 0.26, ease: 'power2.out', immediateRender: false }, 0.02)
        .fromTo(image, {
            width: () => Math.min(Math.max(78, window.innerWidth * 0.07), 124),
            height: () => Math.min(Math.max(190, window.innerHeight * 0.3), 300),
            borderRadius: 5
        }, {
            width: () => Math.min(window.innerWidth * 0.32, 560),
            height: () => Math.min(window.innerHeight * 0.58, 610),
            borderRadius: 8,
            duration: 0.46,
            ease: 'power2.inOut',
            immediateRender: false
        }, 0.18)
        .fromTo(statement, { y: 0 }, {
            y: () => -window.innerHeight * 0.11,
            duration: 0.34,
            ease: 'power2.inOut',
            immediateRender: false
        }, 0.42)
        .fromTo(details, { opacity: 0, y: 54 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', immediateRender: false }, 0.57)
        .fromTo(cards, { opacity: 0, y: 28 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.24, ease: 'power2.out', immediateRender: false }, 0.6);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('education-hydrated');
        gsap.set([meta, leftWord, rightWord, statement, image, details, ...cards], {
            clearProps: 'transform,opacity,width,height,borderRadius'
        });
    };
}
