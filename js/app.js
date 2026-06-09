// Global variables for parallax effect
const parallax_el = document.querySelectorAll(".parallax");
const main = document.querySelector("main");

let xValue = 0, yValue = 0;
let rotateDegree = 0;
let timeline; // Make timeline globally accessible

// Set main content height based on screen size
if(window.innerWidth >= 768){
    if (main) main.style.maxHeight = `${window.innerWidth * 0.6}px`;
} else {
    if (main) main.style.maxHeight = `${window.innerWidth * 1.6}px`;
}

document.addEventListener("DOMContentLoaded", function () {
    // Set initial body opacity to 1 for the loading screen
    document.body.style.opacity = 1;
    
    // Set main content opacity to 0 (will be shown after loader)
    const mainContent = document.querySelector("main");
    if (mainContent) {
        mainContent.style.opacity = 0;
    }
    
    // Only call this once
    splitTextIntoSpans(".logo p");
    
    // Start the loader animation
    startLoader();
    
    // Set up hamburger menu
    setupHamburgerMenu();
});

// Parallax effect update function
function update(cursorposition) {
    parallax_el.forEach((el) => {
        if (el.closest('header')) return;  // Exclude navbar from transformations
        let isInLeft = parseFloat(getComputedStyle(el).left) < window.innerWidth / 2 ? 1 : -1;
        let zValue = (cursorposition - parseFloat(getComputedStyle(el).left)) * isInLeft * 0.05;
    
        let speedx = el.dataset.speedx;
        let speedy = el.dataset.speedy;
        let speedz = el.dataset.speedz;
        let rotateSpeed = el.dataset.rotation;
    
        el.style.transform = `rotateY(${rotateDegree * rotateSpeed}deg) 
                              translateX(calc(-50% + ${-xValue * speedx}px)) 
                              translateY(calc(-50% + ${yValue * speedy}px)) 
                              perspective(2300px) 
                              translateZ(${Math.min(zValue * speedz, 50)}px)`;
    });
}

// Mouse move event for parallax effect
window.addEventListener("mousemove", (e) => {
    if (timeline && timeline.isActive()) return;

    xValue = e.clientX - window.innerWidth / 2;
    yValue = e.clientY - window.innerHeight / 2;

    rotateDegree = (xValue / (window.innerWidth / 2)) * 20;

    update(e.clientX);
});

// Hamburger menu setup
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');
    
    // Check if elements exist before adding event listeners
    if (hamburger && menu) {
        hamburger.addEventListener('click', function() {
            menu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const menuLinks = document.querySelectorAll('.menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = menu.contains(event.target);
            const isClickOnHamburger = hamburger.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnHamburger && menu.classList.contains('active')) {
                menu.classList.remove('active');
            }
        });
    } else {
        console.warn('Hamburger menu or navigation elements not found');
    }
}

// Text splitting function for animation
function splitTextIntoSpans(selector) {
    var element = document.querySelector(selector);
    if (element) {
        var text = element.innerText;
        var splitText = text.split("").map((char) => `<span>${char}</span>`).join("");
        element.innerHTML = splitText;
        
        // Make sure all spans are visible initially
        var spans = element.querySelectorAll("span");
        spans.forEach(span => {
            span.style.display = "inline-block";
            span.style.position = "relative";
            span.style.color = "#ffffff";
            
            // For logo spans specifically
            if (element.closest(".logo")) {
                span.style.top = "200px"; // Match CSS initial position
            }
        });
    }
}

// Loading counter animation
function startLoader() {
    var counterElement = document.querySelector(".counter p");
    
    // If counter element doesn't exist, check if we need to create loading structure
    if (!counterElement) {
        console.warn("Counter element not found, checking if overlay exists");
        
        // Check if overlay exists
        let overlay = document.querySelector(".overlay");
        
        // If no overlay, create the loading structure
        if (!overlay) {
            console.log("Creating loading structure");
            const loadingHTML = `
                <div class="overlay">
                    <div class="overlay-content">
                        <div class="counter"><p>0</p></div>
                        <div class="logo"><p>VOIDSCAPE</p></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('afterbegin', loadingHTML);
            
            // Re-get the counter element
            counterElement = document.querySelector(".counter p");
            
            // Also call splitTextIntoSpans for the logo again
            splitTextIntoSpans(".logo p");
        }
    }
    
    if (!counterElement) {
        console.error("Counter element still not found after attempts to create it");
        return;
    }
    
    var currentValue = 0;
    
    function updateCounter() {
        if (currentValue === 100) {
            animateText();
            return;
        }
        
        currentValue += Math.floor(Math.random() * 10) + 1;
        currentValue = currentValue > 100 ? 100 : currentValue;
        
        // Create spans for counter digits
        counterElement.innerHTML = currentValue.toString().split("").map((char) => 
            `<span style="position:relative; display:inline-block; color:#ffffff;">${char}</span>`).join("") + 
            `<span style="position:relative; display:inline-block; color:#ffffff;">%</span>`;
        
        var delay = Math.floor(Math.random() * 200) + 100;
        setTimeout(updateCounter, delay);
    }
    
    // Start the counter
    updateCounter();
}

// Text animation after loading counter reaches 100%
function animateText() {
    setTimeout(() => {
        // Ensure counter elements are visible before animating
        document.querySelectorAll(".counter p span").forEach(span => {
            span.style.position = "relative";
            span.style.display = "inline-block";
            span.style.color = "#ffffff";
        });
        
        gsap.to(".counter p span", {
            top: "-400px",
            stagger: 0.1,
            ease: "power3.inOut",
            duration: 1,
        });
        
        gsap.to(".loading", {
            opacity: 0,
            pointerEvents: "none", // This prevents click capturing when invisible
            zIndex: -1, // Move it below other content
            ease: "power3.inOut",
            duration: 1,
            delay: 3,
        });

        
        
        // Ensure logo spans are visible
        document.querySelectorAll(".logo p span").forEach(span => {
            span.style.position = "relative";
            span.style.display = "inline-block";
            span.style.color = "#ffffff";
        });
        
        gsap.to(".logo p span", {
            top: 0,
            stagger: 0.1,
            ease: "power3.inOut",
            duration: 1,
            onComplete: startParallaxAnimation // Start parallax animation when text is completely gone
        });
        
        gsap.to(".logo p span", {
            top: "-400px",
            stagger: 0.1,
            ease: "power3.inOut",
            duration: 1,
            delay: 2,
        });
        
        gsap.to(".overlay", {
            opacity: 0,
            ease: "power3.inOut",
            duration: 1,
            delay: 3
        });
    }, 300);
}

// Function to start parallax animation after loader is complete
function startParallaxAnimation() {
    // Fade in the main content
    const mainContent = document.querySelector("main");
    if (mainContent) {
        gsap.to(mainContent, {
            opacity: 1,
            duration: 1,
            ease: "power2.inOut",
            onComplete: function() {
                // Initialize the parallax effect
                update(window.innerWidth / 2); // Initial update with center position
            }
        });
    }
    
    // Create a GSAP timeline for initial animations
    timeline = gsap.timeline();

    // Animate parallax elements
    Array.from(parallax_el)
        .filter(el => !el.classList.contains("lname") && !el.classList.contains("fname"))
        .forEach(el => {
            // Get original position from computed style
            const originalTop = getComputedStyle(el).top;

            // Animate each element
            timeline.fromTo(el, {
                opacity: 0
            }, {
                opacity: 1,
                duration: 0.3,
                ease: "power3.out",
            }, "<0.1"); // Stagger slightly
        });

    // Get name elements
    const fnameElement = document.querySelector(".fname");
    const lnameElement = document.querySelector(".lname");

    // Check if elements are found
    if (!fnameElement || !lnameElement) {
        console.error("Elements with class .fname or .lname not found.");
        return;
    }

    const fntop = getComputedStyle(fnameElement).top;
    const lntop = getComputedStyle(lnameElement).top;

    // Name animation timeline - with a slight delay after the body fade-in
    const nameTimeline = gsap.timeline({
        delay: 0.3
    });

    nameTimeline.fromTo(
        ".lname", 
        {
            top: window.innerHeight - fnameElement.getBoundingClientRect().top,
            opacity: 0,
        },
        {
            top: lntop,
            duration: 1,
            opacity: 1,
            delay: 2,
        },
        "0"
    ).fromTo(
        ".fname",
        {
            top: "-150px",
            opacity: 0,
        },
        {
            top: fntop,
            duration: 1,
            opacity: 1,
            delay: 2,
        },
        "0.5"
    );
}
document.addEventListener("DOMContentLoaded", () => {
    const sec = document.getElementById("sec");

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                sec.classList.add("visible");
            } else {
                sec.classList.remove("visible");
            }
        },
        { threshold: 0.1 }
    );

    observer.observe(sec);
});


// Function to adjust the width
function adjustArrowWidth() {
    const screenWidth = window.innerWidth; // Get the screen width
    const newWidth = screenWidth; // Subtract 100px
    const arrowElement = document.querySelector('.awards .arrow');
    
    if (arrowElement) {
        arrowElement.style.width = `${newWidth}px`; // Set the new width
    }
}

// Adjust width on page load
adjustArrowWidth();

// Adjust width when the window is resized
window.addEventListener('resize', adjustArrowWidth);


const containers = document.querySelectorAll(".awards .container");
let counter = 0;

function left() {
    counter--;
    scroll();
}

function right() {
    counter++;
    scroll();
}

function setAnimationScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // Smooth (non-pinned) background-tone shift as the user moves through
    // the experience / projects / awards block — subtle "deep city night" feel.
    gsap.timeline({
        scrollTrigger: {
            trigger: ".experiencetitle",
            start: "top bottom",
            endTrigger: ".titleawards",
            end: "bottom center",
            scrub: 1
        }
    })
    .to("body", { backgroundColor: "#0a0a1f", ease: "none" })
    .to("body", { backgroundColor: "#0d0a24", ease: "none" })
    .to("body", { backgroundColor: "#050815", ease: "none" });
}



setAnimationScroll();

// ============================================================
//  INTERACTIVITY & SCROLL EFFECTS (redesign)
// ============================================================
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('DOMContentLoaded', () => {
        if (window.gsap) gsap.registerPlugin(ScrollTrigger);

        /* ---- 1. Animated stat counters (count up on scroll into view) ---- */
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                const numEl = entry.target.querySelector('.stat__num');
                if (numEl && !numEl.dataset.done) {
                    numEl.dataset.done = '1';
                    animateCount(numEl);
                }
                statObserver.unobserve(entry.target);
            });
        }, { threshold: 0.35 });
        document.querySelectorAll('.stat').forEach(el => statObserver.observe(el));

        function animateCount(el) {
            const target = parseFloat(el.dataset.count) || 0;
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            const suffix = el.dataset.suffix || '';
            if (reduce) { el.textContent = target.toFixed(decimals) + suffix; return; }
            const duration = 1600;
            const start = performance.now();
            (function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
                el.textContent = (target * eased).toFixed(decimals) + suffix;
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target.toFixed(decimals) + suffix;
            })(start);
        }

        if (reduce || !window.gsap) return;

        /* ---- 2. Experience timeline scroll-fill + node activation ---- */
        const expContainer = document.querySelector('.experience__container');
        if (expContainer) {
            const fill = document.createElement('div');
            fill.className = 'timeline-fill';
            expContainer.appendChild(fill);
            gsap.to(fill, {
                height: '100%',
                ease: 'none',
                scrollTrigger: { trigger: expContainer, start: 'top 70%', end: 'bottom 75%', scrub: 0.5 }
            });
            document.querySelectorAll('.experience__card').forEach(card => {
                ScrollTrigger.create({
                    trigger: card,
                    start: 'top 65%',
                    end: 'bottom 65%',
                    onToggle: self => card.classList.toggle('node-on', self.isActive)
                });
            });
        }

        /* ---- 3. Drifting aurora glow blobs ---- */
        document.querySelectorAll('.aurora').forEach(el => {
            const speed = parseFloat(el.dataset.aurora) || 0.1;
            gsap.to(el, {
                y: speed * 650,
                ease: 'none',
                scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 }
            });
        });

        /* ---- 4. Subtle parallax on section headings ---- */
        gsap.utils.toArray('.experiencetitle h2, .projectstitle h2, .titleawards h2, .educationtitle h2')
            .forEach(h => {
                gsap.fromTo(h, { y: 30 }, {
                    y: -30, ease: 'none',
                    scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true }
                });
            });

        /* ---- 5. Hero scroll cue fades out as you leave the hero ---- */
        const cue = document.querySelector('.scroll-cue');
        if (cue) {
            gsap.to(cue, {
                opacity: 0, ease: 'none',
                scrollTrigger: { trigger: 'main', start: 'top top', end: '40% top', scrub: true }
            });
        }

        /* ---- 6. 3D tilt on project cards ---- */
        document.querySelectorAll('.projects__card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                card.style.transform =
                    `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateY(-8px)`;
            });
            card.addEventListener('mouseleave', () => { card.style.transform = ''; });
        });

        /* ---- 7. Magnetic buttons / icons ---- */
        document.querySelectorAll('.btn, .projects__button, .socialicons a, .cert__badge').forEach(btn => {
            btn.addEventListener('mousemove', e => {
                const r = btn.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                btn.style.setProperty('transform', `translate(${x * 0.3}px, ${y * 0.45}px)`, 'important');
            });
            btn.addEventListener('mouseleave', () => { btn.style.setProperty('transform', '', ''); });
        });

        /* ---- 8. Custom cursor reacts to interactive targets ---- */
        const circles = document.querySelectorAll('.circle');
        if (circles.length) {
            const setActive = on => circles.forEach(c => c.classList.toggle('cursor-active', on));
            document.querySelectorAll('a, button, .icon, .frame, .projects__card, .stat, .experience__data, .education__card')
                .forEach(el => {
                    el.addEventListener('mouseenter', () => setActive(true));
                    el.addEventListener('mouseleave', () => setActive(false));
                });
        }

        ScrollTrigger.refresh();
    });
})();

/*const track = document.getElementById("image-track");

window.onmousedown = e => {
    track.dataset.mouseDownAt = e.clientX;
}

window.onmousemove = e => {
    if(track.dataset.mouseDownAt === "0") return;

    const mouseDelta = parseFloat(track.dataset.mouseDownAt) - e.clientX,
        maxDelta = window.innerWidth / 2;

    const percentage = (mouseDelta / maxDelta) * -100;

    track.style.transform = 'translate(${percentage}%, -50%)';
}
*/



document.addEventListener("DOMContentLoaded", function () {
    const circles = document.querySelectorAll(".circle");
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorMoved = false;

    circles.forEach(function (circle) {
        circle.x = mouseX;
        circle.y = mouseY;
    });

    window.addEventListener("mousemove", function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!cursorMoved) {
            cursorMoved = true;
            circles.forEach(c => {
                c.x = mouseX;
                c.y = mouseY;
                c.classList.add("cursor-visible");
            });
        }
    });

    function animateCircles() {
        let x = mouseX;
        let y = mouseY;

        circles.forEach(function (circle, index) {
            circle.style.left = x - 8 + "px";
            circle.style.top  = y - 8 + "px";
            circle.style.scale = (circles.length - index) / circles.length;

            circle.x = x;
            circle.y = y;

            const nextCircle = circles[index + 1] || circles[0];
            x += (nextCircle.x - x) * 0.25;
            y += (nextCircle.y - y) * 0.25;
        });

        requestAnimationFrame(animateCircles);
    }

    animateCircles();

    // Nav scroll glass effect
    const header = document.querySelector("header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 80) {
            header.classList.add("nav-scrolled");
        } else {
            header.classList.remove("nav-scrolled");
        }
    }, { passive: true });

    // Scroll progress bar
    const progressBar = document.getElementById("scroll-progress");
    if (progressBar) {
        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.width = (scrollTop / docHeight * 100) + "%";
        }, { passive: true });
    }
});

// ============================================================
//  SCROLL REVEAL SYSTEM — different effect per section
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    const tag = (el, effect, delay = 0) => {
        if (!el) return;
        el.setAttribute('data-reveal', effect);
        if (delay) el.style.transitionDelay = delay + 's';
        revealObserver.observe(el);
    };

    // Section titles — fade up
    document.querySelectorAll('.experiencetitle, .educationtitle, .projectstitle, .titleawards')
        .forEach(el => tag(el, 'fade-up'));

    // Experience cards — alternating slide from sides (timeline reveal)
    document.querySelectorAll('.experience__card')
        .forEach((el, i) => tag(el, i % 2 ? 'slide-right' : 'slide-left'));

    // Education cards — 3D flip
    document.querySelectorAll('.education__card')
        .forEach((el, i) => tag(el, 'flip', i * 0.12));

    // Certification badges — zoom in
    document.querySelectorAll('.cert__badge')
        .forEach((el, i) => tag(el, 'zoom', i * 0.1));

    // Project cards — blur-in with stagger
    document.querySelectorAll('.projects__card')
        .forEach((el, i) => tag(el, 'blur-in', (i % 4) * 0.1));

    // Award cards — fade up with stagger
    document.querySelectorAll('.awards .card')
        .forEach((el, i) => tag(el, 'fade-up', (i % 4) * 0.1));

    // Life-in-frames header — fade up
    document.querySelectorAll('.life__header[data-reveal]')
        .forEach(el => revealObserver.observe(el));

    // Contact card — zoom in
    tag(document.querySelector('.contact-card'), 'fade-up');
});
  



/*
document.addEventListener("DOMContentLoaded", function () {
    const track = document.getElementById("image-track");

    const handleOnDown = e => track.dataset.mouseDownAt = e.clientX;

    const handleOnUp = () => {
    track.dataset.mouseDownAt = "0";  
    track.dataset.prevPercentage = track.dataset.percentage;
    }

    const handleOnMove = e => {
    if(track.dataset.mouseDownAt === "0") return;
    
    const mouseDelta = parseFloat(track.dataset.mouseDownAt) - e.clientX,
            maxDelta = window.innerWidth / 2;
    
    const percentage = (mouseDelta / maxDelta) * -80,
            nextPercentageUnconstrained = parseFloat(track.dataset.prevPercentage) + percentage,
            nextPercentage = Math.max(Math.min(nextPercentageUnconstrained, 0), -100);
    
    track.dataset.percentage = nextPercentage;

    
    
    track.animate({
        transform: `translate(${nextPercentage}%, -50%)`
    }, { duration: 1200, fill: "forwards" });
    
    for(const image of track.getElementsByClassName("image")) {
        image.animate({
        objectPosition: `${100 + nextPercentage}% center`
        }, { duration: 1200, fill: "forwards" });
    }
}

    /* -- Had to add extra lines for touch events 

    window.onmousedown = e => handleOnDown(e);

    window.ontouchstart = e => handleOnDown(e.touches[0]);

    window.onmouseup = e => handleOnUp(e);

    window.ontouchend = e => handleOnUp(e.touches[0]);

    window.onmousemove = e => handleOnMove(e);

    window.ontouchmove = e => handleOnMove(e.touches[0]);

});*/







    

