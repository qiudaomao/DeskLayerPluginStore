let properties = [
    {"name": "fps", "valueType": "number", "value": "30"},
    {"name": "blades", "valueType": "number", "value": "6"},
    {"name": "showPercent", "valueType": "boolean", "value": "true"},
    {"name": "colors", "valueType": "string",
     "value": "#FF3B30,#FF9500,#FFCC00,#34C759,#5AC8FA,#AF52DE"}
];

// Idle drift plus the extra revolutions per second added at 100% CPU.
const IDLE_RPS = 0.15;
const FULL_RPS = 2.5;
const SAMPLE_MS = 800;   // stats() cadence; frames interpolate between

let angle = 0;
let cpu = 0, cpuTarget = 0;
let lastFrame = 0, lastSample = 0;

function render(ctx) {
    const now = Date.now();
    // Clamp dt so the wheel doesn't leap after a pause (sleep, lock,
    // fullscreen app) — rendering stops during those, not the clock.
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;

    // $system.cpu measures "since the last call", so sample on a fixed
    // clock rather than per frame — per-frame windows are too short to
    // be stable — and ease the spin speed toward each new reading.
    if (now - lastSample >= SAMPLE_MS) {
        lastSample = now;
        cpuTarget = $system.stats().cpu;
    }
    cpu += (cpuTarget - cpu) * Math.min(1, dt * 4);
    angle = (angle + (IDLE_RPS + FULL_RPS * cpu) * 2 * Math.PI * dt) % (2 * Math.PI);

    const w = ctx.width, h = ctx.height;
    ctx.clearRect(0, 0, w, h);

    const showPercent = String(ctx.getProp('showPercent')) !== 'false';
    const blades = Math.min(12, Math.max(3, parseInt(String(ctx.getProp('blades')), 10) || 6));
    const palette = String(ctx.getProp('colors')).split(',')
        .map(c => c.trim()).filter(c => c.length);
    if (!palette.length) palette.push('#4CD964');

    const fontSize = Math.max(9, Math.round(Math.min(w, h) * 0.07));
    const labelSpace = showPercent ? fontSize * 1.9 : 0;
    const avail = h - labelSpace;
    const R = Math.min(w, avail) * 0.46;
    const cx = w / 2, cy = avail / 2;

    // Each blade is a "D" lying on its spoke: a straight edge along the
    // x-axis and a circular arc from hub to tip through center (R/2, m).
    // The tangent-chord angle alpha sets how fat the blade is (bulge =
    // alpha/2); tying it to the spacing keeps blades at 3/4 of their
    // sector with a 1/4 gap at any count, capped at 75° so few-bladed
    // wheels stay pinwheel-shaped. Same chirality all around.
    const spacing = 2 * Math.PI / blades;
    const alpha = Math.min(1.31, 1.5 * spacing);
    const m = R / (2 * Math.tan(alpha));
    const arcR = Math.sqrt(R * R / 4 + m * m);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    for (let i = 0; i < blades; i++) {
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(R / 2, m, arcR, Math.atan2(-m, -R / 2), Math.atan2(-m, R / 2), false);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(spacing);
    }
    ctx.restore();

    // Hub pin on top of the blade roots.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.14, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.055, 0, 2 * Math.PI, false);
    ctx.fill();

    if (showPercent) {
        const label = 'CPU ' + Math.round(cpu * 100) + '%';
        ctx.font = fontSize + 'px HelveticaNeue-Medium';
        ctx.fillStyle = '#FFFFFFAA';
        const m = ctx.measureText(label);
        ctx.fillText(label, cx - m.width / 2, cy + R + fontSize * 1.2);
    }
}

plugin.export = {
    version: "1.1.0",
    author: "DeskLayer",
    description: "A pinwheel that spins with your CPU — the busier the Mac, the faster it turns.",
    width: 240, height: 260,
    scaleMode: "ratio",
    minWidth: 90, maxWidth: 600, minHeight: 98, maxHeight: 650,
    properties,
    render
};
