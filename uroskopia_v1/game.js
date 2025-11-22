/*
  game.js
  Implements the path-constrained draggable tube, collision detection with the stone,
  and the laser + particle animation. Uses only vanilla JavaScript and SVG.

  Key ideas:
  - A predefined SVG <path id="ureterPath"> is used as the allowed route.
  - We sample many points along that path and snap the draggable tip to the closest sample.
  - The visible tube is drawn by creating a path from the start of the ureter to the current tip length.
  - Collision is distance-based between the tube tip and the stone image center.
  - Laser is a simple animated line; stone break is implemented with small particle circles.
*/

// Wait until DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Grab DOM elements
  const svg = document.getElementById('overlay');
  const ureterPath = document.getElementById('ureterPath');
  const tubeTip = document.getElementById('tubeTip');
  const tubePath = document.getElementById('tubePath');
  const stoneImg = document.getElementById('stone');
  const laserBeam = document.getElementById('laserBeam');
  const activateBtn = document.getElementById('activateLaser');
  const tooltip = document.getElementById('tooltip');
  const particlesGroup = document.getElementById('particles');

  // Sampling resolution and state
  const SAMPLE_STEP = 4; // pixels along path
  const samples = []; // {x,y,len}
  let pathLength = 0;

  // State for dragging and collision
  let dragging = false;
  let currentLength = 0;
  let reachedStone = false;

  // Convert client coordinates to SVG coordinates
  function clientToSvgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // Build sampled points along the ureterPath for quick nearest-point queries
  function buildSamples() {
    pathLength = ureterPath.getTotalLength();
    samples.length = 0;
    for (let s = 0; s <= pathLength; s += SAMPLE_STEP) {
      const p = ureterPath.getPointAtLength(s);
      samples.push({ x: p.x, y: p.y, len: s });
    }
    // include final point exactly
    const p = ureterPath.getPointAtLength(pathLength);
    samples.push({ x: p.x, y: p.y, len: pathLength });
  }

  // Set the tip to a specific length along the path and redraw the tube
  function setTipToLength(len) {
    // clamp
    len = Math.max(0, Math.min(len, pathLength));
    currentLength = len;

    // update tip position
    const pos = ureterPath.getPointAtLength(len);
    tubeTip.setAttribute('cx', pos.x);
    tubeTip.setAttribute('cy', pos.y);

    // Build the tube path data with intermediate points for a smooth visible tube
    const step = 8; // step for drawing
    let d = '';
    for (let s = 0; s <= len; s += step) {
      const p = ureterPath.getPointAtLength(s);
      if (s === 0) d += `M ${p.x} ${p.y}`;
      else d += ` L ${p.x} ${p.y}`;
    }
    // ensure last point is exactly current tip
    const tip = ureterPath.getPointAtLength(len);
    if (d === '') d = `M ${tip.x} ${tip.y}`;
    else d += ` L ${tip.x} ${tip.y}`;
    tubePath.setAttribute('d', d);

    // Check collision with the stone whenever tip moves
    checkCollisionWithStone(pos.x, pos.y);
  }

  // Find nearest sample length to point (x,y)
  function nearestLengthToPoint(x, y) {
    let best = samples[0];
    let bestDist = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const dx = samples[i].x - x;
      const dy = samples[i].y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; best = samples[i]; }
    }
    return best.len;
  }

  // Check collision: tip at (tx,ty) and stone at its center
  function checkCollisionWithStone(tx, ty) {
    const sx = parseFloat(stoneImg.getAttribute('x')) || 0;
    const sy = parseFloat(stoneImg.getAttribute('y')) || 0;
    const sw = parseFloat(stoneImg.getAttribute('width')) || 0;
    const sh = parseFloat(stoneImg.getAttribute('height')) || 0;
    const centerX = sx + sw / 2;
    const centerY = sy + sh / 2;
    const dx = tx - centerX;
    const dy = ty - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.max(sw, sh) * 0.8; // collision threshold

    if (dist <= threshold) {
      // tip reached stone
      stoneImg.classList.add('stone-highlight');
      reachedStone = true;
    } else {
      stoneImg.classList.remove('stone-highlight');
      reachedStone = false;
    }
  }

  // Show a brief tooltip message near the Activate button
  function showTooltip(text) {
    tooltip.textContent = text;
    tooltip.classList.remove('hidden');
    setTimeout(() => tooltip.classList.add('hidden'), 1600);
  }

  // Laser activation sequence: draw beam and spawn particles breaking the stone
  function activateLaser() {
    if (!reachedStone) {
      showTooltip('You must reach the stone first');
      return;
    }

    // compute tip and stone center
    const tipPos = ureterPath.getPointAtLength(currentLength);
    const sx = parseFloat(stoneImg.getAttribute('x')) || 0;
    const sy = parseFloat(stoneImg.getAttribute('y')) || 0;
    const sw = parseFloat(stoneImg.getAttribute('width')) || 0;
    const sh = parseFloat(stoneImg.getAttribute('height')) || 0;
    const stoneCenterX = sx + sw / 2;
    const stoneCenterY = sy + sh / 2;

    // Setup and animate laser beam: simple pulse
    laserBeam.setAttribute('x1', tipPos.x);
    laserBeam.setAttribute('y1', tipPos.y);
    laserBeam.setAttribute('x2', stoneCenterX);
    laserBeam.setAttribute('y2', stoneCenterY);
    laserBeam.style.transition = 'opacity 150ms ease, stroke-width 150ms ease';
    laserBeam.style.opacity = 1;
    laserBeam.setAttribute('stroke-width', 12);

    // pulse effect and then hide
    setTimeout(() => {
      laserBeam.setAttribute('stroke-width', 6);
      laserBeam.style.opacity = 0.8;
    }, 120);
    setTimeout(() => {
      laserBeam.style.opacity = 0;
    }, 420);

    // Break the stone: spawn particles. Keep the stone visually stationary,
    // then fade it out and remove it after the particle animation completes.
    spawnParticles(stoneCenterX, stoneCenterY);

    // Remove highlight immediately so the stone doesn't keep scaling during fade.
    stoneImg.classList.remove('stone-highlight');

    // Fade out the stone after a short delay so particles are visible first.
    const FADE_DELAY = 200; // ms before the stone starts fading
    const FADE_DURATION = 700; // ms of fade duration (matches CSS transition)
    setTimeout(() => {
      // start fade
      stoneImg.style.transition = `opacity ${FADE_DURATION}ms ease`;
      stoneImg.style.opacity = 0;
      // after fade finished, remove from DOM (or hide)
      setTimeout(() => {
        try { stoneImg.setAttribute('display', 'none'); } catch (e) {}
      }, FADE_DURATION + 20);
    }, FADE_DELAY);
  }

  // Spawn small particles at (x,y) with random velocities and fade them out
  function spawnParticles(x, y) {
    const count = 22;
    const lifetime = 900; // ms
    const now = performance.now();

    const particles = [];
    for (let i = 0; i < count; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const r = 2 + Math.random() * 3;
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', r);
      c.setAttribute('class', 'particle');
      c.style.opacity = 1;
      particlesGroup.appendChild(c);

      // random velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.6; // px per ms
      particles.push({ el: c, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born: now, r });
    }

    // animate particles with requestAnimationFrame
    let rafId = null;
    function step(t) {
      const elapsed = t - now;
      particles.forEach(p => {
        const age = t - p.born;
        // move
        const cx = parseFloat(p.el.getAttribute('cx')) + p.vx * 16; // assume ~16ms per frame
        const cy = parseFloat(p.el.getAttribute('cy')) + p.vy * 16 + 0.05 * age; // slight gravity
        p.el.setAttribute('cx', cx);
        p.el.setAttribute('cy', cy);
        // fade
        const alpha = Math.max(0, 1 - age / lifetime);
        p.el.style.opacity = alpha;
      });

      if (elapsed < lifetime) rafId = requestAnimationFrame(step);
      else {
        // cleanup
        particles.forEach(p => { try { particlesGroup.removeChild(p.el); } catch (e) {} });
        if (rafId) cancelAnimationFrame(rafId);
      }
    }
    rafId = requestAnimationFrame(step);
  }

  // Pointer handlers for dragging the tip along the path
  function onPointerDown(evt) {
    evt.preventDefault();
    dragging = true;
    tubeTip.setAttribute('cursor', 'grabbing');
    tubeTip.setPointerCapture(evt.pointerId);
  }

  function onPointerMove(evt) {
    if (!dragging) return;
    // convert to svg coords
    const p = clientToSvgPoint(evt);
    // find nearest length along the path
    const len = nearestLengthToPoint(p.x, p.y);
    setTipToLength(len);
  }

  function onPointerUp(evt) {
    dragging = false;
    tubeTip.setAttribute('cursor', 'grab');
    try { tubeTip.releasePointerCapture(evt.pointerId); } catch(e){}
  }

  // Initialize everything
  function init() {
    buildSamples();

    // place tip at start of path
    setTipToLength(0);

    // attach pointer events to tubeTip (works for mouse & touch & pen)
    tubeTip.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Activate button
    activateBtn.addEventListener('click', activateLaser);

    // Rebuild samples if window is resized because SVG can be scaled
    window.addEventListener('resize', () => { buildSamples(); setTipToLength(currentLength); });
  }

  // Kick off
  init();
});
