// Run with: node tools/check-interactions.cjs
// Test the actual animation handlers without adding browser-test dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`));
let observers = [], frames = [], events = {}, order = [];
class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
}
const items = [0, 1].map(index => {
    const media = { getBoundingClientRect() { order.push('read'); return { top: 200 + index * 200, height: 300 }; } };
    const image = {
        style: new Proxy({}, { set(object, key, value) { if (key === 'transform') order.push('write'); object[key] = value; return true; } }),
        closest: () => media
    };
    return { media, image };
});
const section = { classList: { add() {} }, querySelectorAll: () => items.map(item => item.image) };
const context = {
    reduceMotion: { matches: false },
    window: { innerHeight: 900, IntersectionObserver: Observer, addEventListener: (name, callback) => { events[name] = callback; } },
    document: { hidden: false, querySelector: () => section, addEventListener() {} },
    IntersectionObserver: Observer,
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
};
vm.createContext(context);
vm.runInContext(extract('setupOctivisParallax', 'setupHeroEntrance') + '; setupOctivisParallax();', context);
assert.equal(frames.length, 0);
events.scroll();
assert.equal(frames.length, 0, 'offscreen scrolling schedules no animation');
observers[0].callback(items.map(item => ({ target: item.media, isIntersecting: true })));
frames.shift()();
assert.deepEqual(order, ['read', 'read', 'write', 'write'], 'read geometry before writing styles');
observers[0].callback(items.map(item => ({ target: item.media, isIntersecting: false })));
events.scroll();
assert.equal(frames.length, 0);
assert.equal(items[0].image.style.willChange, 'auto');
context.document.hidden = true;
observers[0].callback([{ target: items[0].media, isIntersecting: true }]);
order = [];
frames.shift()();
assert.equal(order.length, 0, 'background tabs do no layout work');
context.document.hidden = false;
context.reduceMotion.matches = true;
events.scroll();
frames.shift()();
assert.equal(order.length, 0, 'reduced motion stops updates');

// Photo strips must remain idle offscreen and resume as they enter view.
let tick;
const track = { scrollWidth: 2000, style: {}, classList: { contains: () => false } };
const marquee = { querySelector: () => track, classList: { add() {} }, addEventListener() {} };
context.document.querySelectorAll = () => [marquee];
context.window.gsap = context.gsap = { ticker: { add: callback => { tick = callback; } } };
context.reduceMotion.matches = false;
vm.runInContext(extract('setupMarqueeDrag', 'setupOctivisParallax') + '; setupMarqueeDrag();', context);
tick(0, 16);
assert.equal(track.style.transform, undefined);
observers.at(-1).callback([{ isIntersecting: true }]);
tick(0, 16);
assert.ok(track.style.transform);
const lastTransform = track.style.transform;
observers.at(-1).callback([{ isIntersecting: false }]);
tick(0, 16);
assert.equal(track.style.transform, lastTransform);
assert.equal(track.style.willChange, 'auto');
console.log('PASS: visible/offscreen animation, batched layout, reduced motion, hidden tabs, and photo-strip pause/resume.');