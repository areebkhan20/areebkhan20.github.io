const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let lenis = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('is-ready');
    setupSmoothScroll();
    setupNavigation();
    setupReveals();
    setupHeroParallax();
    setupOctivisParallax();

    if (!reduceMotion.matches && window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        setupDesktopScrollStories();
    }

    await setupLoader();

    if (!reduceMotion.matches && window.gsap) {
        setupHeroEntrance();
    }

    window.ScrollTrigger?.refresh();
});

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
        // pin spacers change the page height after Lenis measures it
        ScrollTrigger.addEventListener('refresh', () => lenis?.resize());
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
        lenis.scrollTo(target, { duration: 1.1, ...options });
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
    const minimumDisplay = reduceMotion.matches ? 120 : 520;
    const maximumDisplay = reduceMotion.matches ? 450 : 2100;

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

    const ready = Promise.all([pageLoaded, imagesReady]);
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
            image.style.transform = `translate3d(0, ${progressY * -6}%, 0) scale(1.16)`;
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

function setupHeroParallax() {
    const hero = document.querySelector('main');
    if (!hero || reduceMotion.matches || !finePointer.matches) return;

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
    let returning = false;

    const render = () => {
        const ease = returning ? 0.055 : 0.16;
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

    hero.addEventListener('pointermove', event => {
        const rect = hero.getBoundingClientRect();
        returning = false;
        targetX = event.clientX - rect.left - rect.width / 2;
        targetY = event.clientY - rect.top - rect.height / 2;
        requestRender();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
        returning = true;
        targetX = 0;
        targetY = 0;
        requestRender();
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) return;
        returning = true;
        targetX = 0;
        targetY = 0;
        requestRender();
    });
}

function setupDesktopScrollStories() {
    const media = gsap.matchMedia();
    media.add('(min-width: 901px)', () => {
        const cleanups = [
            setupProjectStory(),
            setupRecognitionStory(),
            setupExperienceStory(),
            setupEducationStory()
        ].filter(Boolean);

        return () => cleanups.forEach(cleanup => cleanup());
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 180);
    }, { passive: true });

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
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

    timeline
        .to(main, {
            scale: 0.32,
            y: () => window.innerHeight * 0.34,
            borderRadius: 24,
            duration: 0.54
        }, 0)
        .to(heroIntro, { opacity: 0, duration: 0.18 }, 0.04)
        .to(reveal, { autoAlpha: 1, duration: 0.18 }, 0.12)
        .to(heading, { opacity: 1, y: 0, duration: 0.28 }, 0.18)
        .to(items, {
            opacity: 1,
            scale: 1,
            y: 0,
            rotation: 0,
            stagger: 0.055,
            duration: 0.44
        }, 0.24)
        .to(reveal, { autoAlpha: 0.2, y: -40, duration: 0.3 }, 0.7)
        .to(main, { opacity: 0.12, duration: 0.24 }, 0.7)
        .to(about, { yPercent: 0, duration: 0.3, ease: 'power2.inOut' }, 0.7)
        .to(aboutGrid, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.8)
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

    timeline
        .to(heading, { opacity: 1, y: 0, duration: 0.22, ease: 'none' }, 0)
        .to(frames, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.16,
            ease: 'power2.out'
        }, 0.15)
        .to(frames, { opacity: 0.12, y: -30, duration: 0.34, ease: 'power1.in' }, 1.58)
        .to(heading, { opacity: 0, y: -22, duration: 0.28, ease: 'none' }, 1.7);

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

    timeline
        .to(intro, { opacity: 1, y: 0, duration: 0.12, ease: 'none' }, 0)
        .to(cards, { opacity: 1, y: 0, stagger: 0.02, duration: 0.16, ease: 'power1.out' }, 0.02)
        .to(track, { x: () => -distance(), duration: 0.88, ease: 'none' }, 0.12);

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

    timeline
        .to(meta, { opacity: 1, y: 0, duration: 0.16, ease: 'none' }, 0)
        .to(leftWord, { x: 0, opacity: 1, duration: 0.26, ease: 'power2.out' }, 0.02)
        .to(rightWord, { x: 0, opacity: 1, duration: 0.26, ease: 'power2.out' }, 0.02)
        .to(image, {
            width: () => Math.min(window.innerWidth * 0.32, 560),
            height: () => Math.min(window.innerHeight * 0.58, 610),
            borderRadius: 8,
            duration: 0.46,
            ease: 'power2.inOut'
        }, 0.18)
        .to(statement, {
            y: () => -window.innerHeight * 0.11,
            duration: 0.34,
            ease: 'power2.inOut'
        }, 0.42)
        .to(details, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }, 0.57)
        .to(cards, { opacity: 1, y: 0, stagger: 0.05, duration: 0.24, ease: 'power2.out' }, 0.6);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('education-hydrated');
        gsap.set([meta, leftWord, rightWord, statement, image, details, ...cards], {
            clearProps: 'transform,opacity,width,height,borderRadius'
        });
    };
}
