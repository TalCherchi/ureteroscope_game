# Ureteroscopy Mini-Game

Small educational web game that simulates guiding a ureteroscope tube through a ureter path to reach a kidney stone and fire a laser to break it.

Files:
- `index.html` — main page with layout and SVG overlay
- `style.css` — visual styling and responsive layout
- `game.js` — all game logic (path sampling, dragging, collision, laser, particles)
- `assets/urinary_system.png`, `assets/ureteroscope.png`, `assets/stone.png` — placeholder images

How to run:
1. Open `index.html` in a modern browser (Chrome, Edge, Firefox). No server needed.
2. Drag the green tip (on the scope) along the guide line — it will snap to the allowed ureter path.
3. Move the tip to the stone. When the tip reaches the stone it gets highlighted.
4. Click "Activate Laser" to fire a laser pulse and break the stone.

Notes and implementation details:
- The draggable tip is constrained to a predefined SVG path (`#ureterPath`).
- The code samples the path into discrete points and snaps the tip to the nearest sample.
- Collision uses a simple distance threshold between the tip and the stone center.
- The laser is an animated SVG line and the stone breaking is simulated by spawning fading particle circles.

Compatibility: Desktop and mobile pointer events are supported (pointerdown/pointermove/pointerup).

If you want enhancements, consider:
- Replacing placeholder images with real assets.
- Smoothing the snapping by using a small local projection algorithm rather than fixed samples.
- Adding sound and scoring.
