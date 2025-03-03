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
            ease: "power3.inOut",
            duration: 1,
            delay: 4,
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
        });
        
        gsap.to(".logo p span", {
            top: "-400px",
            stagger: 0.1,
            ease: "power3.inOut",
            duration: 1,
            delay: 3,
            onComplete: startParallaxAnimation // Start parallax animation when text is completely gone
        });
        
        gsap.to(".overlay", {
            opacity: 0,
            ease: "power3.inOut",
            duration: 1,
            delay: 4
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
        },
        "0.5"
    );
}
const bgImg = document.querySelector("body");

function isInView(element) {
    const rect = element.getBoundingClientRect();
    const offset = 150; // Adjust as needed
    return rect.top < window.innerHeight - offset && rect.bottom > offset;
}

let isScrolling = false;

document.addEventListener("scroll", () => {
    if (!isScrolling) {
        isScrolling = true;
        

        requestAnimationFrame(() => {
            if (isInView(bgImg)) {
                bgImg.style.animation = "bg-img-animation linear forwards";
            }
            isScrolling = false;
        });
    }
});


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

    let runAnimation = gsap.timeline({
        scrollTrigger: {
            trigger: ".titleawards",
            start: "10% top",
            end: "100%",
            markers: false,
            scrub: true,
            pin: true
        }
    });

    runAnimation
        .to("body", {
            duration: 2,
            backgroundColor: "#131127",
        })
        .to("body", {
            duration: 2,
            backgroundColor: "#2c244d",
        })
        .to("body", {
            duration: 2,
            backgroundColor: "#251e39",
        })
        .to("body", {
            duration: 2,
            backgroundColor: "#312c45",
        })
        .to("body", {
            duration: 2,
            backgroundColor: "#050815",
        });
}



setAnimationScroll();

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
    const coords = { x: 0, y: 0 };
    const circles = document.querySelectorAll(".circle");

    circles.forEach(function (circle) {
        circle.x = 0;
        circle.y = 0;
    });

    window.addEventListener("mousemove", function (e) {
        coords.x = e.clientX + window.scrollX;
        coords.y = e.clientY + window.scrollY;
    });

    function animateCircles() {
        let x = coords.x;
        let y = coords.y;

        circles.forEach(function (circle, index) {
            circle.style.left = x - 12 + "px";
            circle.style.top = y - 12 + "px";

            circle.style.scale = (10 - index) / 10;

            circle.x = x;
            circle.y = y;

            const nextCircle = circles[index + 1] || circles[0];
            x += (nextCircle.x - x) * 0.3;
            y += (nextCircle.y - y) * 0.3;
        });

        requestAnimationFrame(animateCircles);
    }

    animateCircles();

});

document.addEventListener('DOMContentLoaded', () => {
    const sr = ScrollReveal({
      origin: 'top',
      distance: '60px',
      duration: 2500,
      delay: 300
    });
  
    sr.reveal('.titleawards', {origin: left, delay: 200});
    sr.reveal('.awards .container1', {delay: 400, interval: 100});
    sr.reveal('.experiencetitle', {origin: right, delay: 200});
    sr.reveal('.experience__card', {delay: 400, interval: 100});
    sr.reveal('.projectstitle', {origin: left, delay: 200});
    sr.reveal('.projects__card', {delay: 400, interval: 100});
    sr.reveal('.banner');
    sr.reveal('.formcontainer', { delay: 100, interval: 100});
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







    

