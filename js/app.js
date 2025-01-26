const parallax_el = document.querySelectorAll(".parallax");
const main = document.querySelector("main");

let xValue = 0, yValue = 0;

let rotateDegree = 0;

function update(cursorposition) {
    parallax_el.forEach((el) => {
        let isInLeft = parseFloat(getComputedStyle(el).left) < window.innerWidth / 2 ? 1 : -1;
        let zValue = (cursorposition - parseFloat(getComputedStyle(el).left)) * isInLeft * 0.1;

        let speedx = el.dataset.speedx;
        let speedy = el.dataset.speedy;
        let speedz = el.dataset.speedz;
        let rotateSpeed = el.dataset.rotation;

        el.style.transform = `rotateY(${rotateDegree * rotateSpeed}deg) translateX(calc(-50% + ${-xValue * speedx}px)) translateY(calc(-50% + ${yValue * speedy}px)) perspective(2300px) translateZ(${zValue * speedz}px)`;
    });
}

update(0);

window.addEventListener("mousemove", (e) => {
    if (timeline.isActive()) return;

    xValue = e.clientX - window.innerWidth / 2;
    yValue = e.clientY - window.innerHeight / 2;

    rotateDegree = (xValue / (window.innerWidth / 2)) * 20;

    update(e.clientX);
});

if(window.innerWidth >= 725){
    main.style.maxHeight = `${window.innerWidth * 0.6}px`;
} else {
    main.style.maxHeight = `${window.innerWidth * 1.6}px`;
}

// GSAP ANIMATION

// Create a GSAP timeline
const timeline = gsap.timeline();

Array.from(parallax_el)
    .filter(el => !el.classList.contains("lname") && !el.classList.contains("fname"))
    .forEach(el => {
        // Ensure the element has a data-distance attribute
        const distance = el.dataset.distance || 0;
        const originalTop = getComputedStyle(el).top;

        // Animate each element
        timeline.fromTo(el, {
            top: `${el.offsetHeight / 2 + parseFloat(distance)}px`,
        }, {
            top: originalTop,
            duration: 0.2,
            ease: "power3.out",
        });
    });

// Get computed styles
const fnameElement = document.querySelector(".fname");
const lnameElement = document.querySelector(".lname");

// Check if elements are found
if (!fnameElement || !lnameElement) {
    console.error("Elements with class .fname or .lname not found.");
} else {
    const fntop = getComputedStyle(fnameElement).top;
    const lntop = getComputedStyle(lnameElement).top;

    console.log("fntop:", fntop);
    console.log("lntop:", lntop);

    const timeline = gsap.timeline();

    // Ensure gsap is defined
    if (!timeline) {
        console.error("GSAP timeline is not defined.");
    } else {
        timeline.fromTo(
            "body", 
            {
                opacity: 0,
            },
            {
                duration: 2,
                opacity: 1,
            },
            "0.5"
        ).fromTo(
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
            "0.5"
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
            "1"
        );
    }
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
    sr.reveal('.formcontainer', {origin:bottom, delay: 100, interval: 100});
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







    

