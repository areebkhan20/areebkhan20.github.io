const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('is-ready');
    setupNavigation();
    setupReveals();
    setupHeroParallax();
    setupOctivisCarousel();

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

    document.querySelectorAll('a[href="#sec"]').forEach(link => {
        link.addEventListener('click', event => {
            const story = document.querySelector('.hero-work-story.story-hydrated');
            if (!story) return;

            event.preventDefault();
            const storyTop = story.getBoundingClientRect().top + window.scrollY;
            const storyTravel = Math.max(0, story.offsetHeight - window.innerHeight);
            window.scrollTo({
                top: storyTop + storyTravel * 0.82,
                behavior: reduceMotion.matches ? 'auto' : 'smooth'
            });
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

function setupOctivisCarousel() {
    const viewport = document.querySelector('.octivis-case__viewport');
    const track = viewport?.querySelector('.octivis-case__track');
    const cards = viewport ? [...viewport.querySelectorAll('.octivis-story')] : [];
    const previous = document.querySelector('[data-octivis-prev]');
    const next = document.querySelector('[data-octivis-next]');
    const count = document.querySelector('.octivis-case__count b');
    if (!viewport || !track || !cards.length || !previous || !next || !count) return;

    let activeIndex = 0;
    let ticking = false;

    const updateUI = index => {
        activeIndex = Math.max(0, Math.min(cards.length - 1, index));
        count.textContent = String(activeIndex + 1).padStart(2, '0');
        previous.disabled = activeIndex === 0;
        next.disabled = activeIndex === cards.length - 1;
    };

    const goTo = index => {
        const targetIndex = Math.max(0, Math.min(cards.length - 1, index));
        const viewportRect = viewport.getBoundingClientRect();
        const cardRect = cards[targetIndex].getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        viewport.scrollTo({
            left: viewport.scrollLeft + cardRect.left - viewportRect.left - inset,
            behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
        updateUI(targetIndex);
    };

    const findClosestCard = () => {
        const viewportRect = viewport.getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const targetX = viewportRect.left + inset;
        let closestIndex = 0;
        let closestDistance = Infinity;

        cards.forEach((card, index) => {
            const distance = Math.abs(card.getBoundingClientRect().left - targetX);
            if (distance >= closestDistance) return;
            closestDistance = distance;
            closestIndex = index;
        });

        updateUI(closestIndex);
        ticking = false;
    };

    previous.addEventListener('click', () => goTo(activeIndex - 1));
    next.addEventListener('click', () => goTo(activeIndex + 1));
    viewport.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        goTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    viewport.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(findClosestCard);
    }, { passive: true });

    updateUI(0);
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
    const awards = frames;
    const topFrames = awards.slice(0, 2);
    const bottomFrames = awards.slice(2, 4);
    const heading = section.querySelector('.recog__heading');

    gsap.set(frames, { xPercent: -50, yPercent: -50 });
    gsap.set(awards, {
        y: () => -window.innerHeight * 0.82,
        opacity: 0,
        rotation: (_, target) => Number(target.dataset.rot0 || -24)
    });
    gsap.set(topFrames, { zIndex: 3 });
    gsap.set(bottomFrames, { zIndex: 2 });
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

    timeline.to(heading, { opacity: 1, y: 0, duration: 0.22, ease: 'none' }, 0);

    bottomFrames.forEach((frame, index) => {
        const restingRotation = Number(frame.dataset.rot || 0);
        const start = 0.12 + index * 0.13;
        timeline
            .to(frame, {
                y: 20,
                opacity: 1,
                rotation: restingRotation * 1.18,
                duration: 0.36,
                ease: 'power3.in'
            }, start)
            .to(frame, {
                y: -8,
                rotation: restingRotation * 0.88,
                duration: 0.11,
                ease: 'power2.out'
            }, start + 0.36)
            .to(frame, {
                y: 0,
                rotation: restingRotation,
                duration: 0.14,
                ease: 'bounce.out'
            }, start + 0.47);
    });

    topFrames.forEach((frame, index) => {
        const base = bottomFrames[index];
        if (!base) return;
        const restingRotation = Number(frame.dataset.rot || 0);
        const baseRotation = Number(base.dataset.rot || 0);
        const impact = 0.74 + index * 0.17;

        timeline
            .to(frame, {
                y: 12,
                opacity: 1,
                rotation: restingRotation * 1.15,
                duration: 0.38,
                ease: 'power3.in'
            }, impact)
            .to(base, {
                y: 29,
                rotation: baseRotation + (index === 0 ? 2.5 : -2.5),
                duration: 0.08,
                ease: 'power2.out'
            }, impact + 0.38)
            .to(frame, {
                y: -10,
                rotation: restingRotation * 0.84,
                duration: 0.12,
                ease: 'power2.out'
            }, impact + 0.38)
            .to(base, {
                y: -6,
                rotation: baseRotation * 0.92,
                duration: 0.11,
                ease: 'power2.out'
            }, impact + 0.46)
            .to(frame, {
                y: 0,
                rotation: restingRotation,
                duration: 0.15,
                ease: 'bounce.out'
            }, impact + 0.5)
            .to(base, {
                y: 0,
                rotation: baseRotation,
                duration: 0.14,
                ease: 'bounce.out'
            }, impact + 0.57);
    });

    timeline
        .to(awards, { opacity: 0.12, y: -30, duration: 0.34, ease: 'power1.in' }, 1.58)
        .to(heading, { opacity: 0, y: -22, duration: 0.28, ease: 'none' }, 1.7);

    return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.classList.remove('recog-hydrated');
        gsap.set([heading, ...frames], { clearProps: 'transform,opacity,zIndex' });
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
