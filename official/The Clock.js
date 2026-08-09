let properties = [
    // 4fps is enough for a crisp half-second blink; drop it to 1 (and turn
    // showSeconds off) if you want the dial to idle.
    {"name": "fps", "valueType": "number", "value": "4"},
    {"name": "label", "valueType": "string", "value": "THE CLOCK"},
    {"name": "faceColor", "valueType": "color", "value": "#2A2E34FF"},
    {"name": "inkColor", "valueType": "color", "value": "#C6CCD4FF"},
    {"name": "litColor", "valueType": "color", "value": "#FFFFFFFF"},
    {"name": "showSeconds", "valueType": "boolean", "value": "true"}
];

const prop = n => properties.find(p => p.name === n).value;

// The face has no gradient support in ctx, so the sheen is layered:
// translucent circles drifting toward the upper-left, like light
// falling across brushed metal.
function drawFace(ctx, cx, cy, R, face) {
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2, false); ctx.fill();

    // Many thin layers rather than few thick ones: fewer steps leave
    // visible concentric banding.
    const STEPS = 64;
    for (let i = 0; i < STEPS; i++) {
        const t = i / STEPS;
        ctx.globalAlpha = 0.006;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - R * 0.16 * t, cy - R * 0.20 * t, R * (1 - 0.72 * t), 0, Math.PI * 2, false);
        ctx.fill();
    }
    // A touch of shade along the lower-right edge for depth.
    for (let i = 0; i < 26; i++) {
        const t = i / 26;
        ctx.globalAlpha = 0.007;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx + R * 0.30 * t, cy + R * 0.34 * t, R * (1 - 0.30 * t), 0, Math.PI * 2, false);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// 60 fine ticks, one per minute; the quarter marks are longer. Instead of
// hands, the segments from 12 o'clock up to the current minute are lit —
// and the segment at the current second blinks on and off once a second.
// The ring is 60 segments either way, so seconds and minutes share it.
function drawTicks(ctx, cx, cy, R, ink, lit, minute, second, blinkOn, showSeconds) {
    for (let i = 0; i < 60; i++) {
        const a = i * Math.PI / 30 - Math.PI / 2;
        const isHour = i % 5 === 0;
        const isNow = i === minute;
        // The blinking second wins over the minute arc, so it reads as a
        // gap travelling through the lit segments as well as a pulse
        // outside them.
        const on = (showSeconds && i === second) ? blinkOn : i <= minute;
        const len = R * (isHour ? 0.070 : 0.042) * (on ? 1.28 : 1);
        const outer = R * 0.955;
        ctx.strokeStyle = on ? lit : ink;
        ctx.globalAlpha = on ? (isNow ? 1 : 0.82) : (isHour ? 0.42 : 0.24);
        ctx.lineWidth = Math.max(1, R * (isHour || on ? 0.013 : 0.008));
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (outer - len), cy + Math.sin(a) * (outer - len));
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// The current hour reads as lit: full-strength in a heavier weight, while
// the other eleven stay thin and faint. No glow — layered circles read as
// a smudge rather than light.
function drawNumerals(ctx, cx, cy, R, ink, lit, hour) {
    const size = Math.max(9, R * 0.135);
    for (let n = 1; n <= 12; n++) {
        const on = n === hour;
        const a = n * Math.PI / 6 - Math.PI / 2;
        const r = R * 0.775;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        ctx.font = size * (on ? 1.06 : 1) +
            'px HelveticaNeue-' + (on ? 'Medium' : 'Thin');
        ctx.fillStyle = on ? lit : ink;
        ctx.globalAlpha = on ? 1 : 0.55;
        const text = String(n);
        const m = ctx.measureText(text);
        // measureText gives width only; nudge down by ~⅓ em to center.
        ctx.fillText(text, px - m.width / 2, py + size * 0.35);
    }
    ctx.globalAlpha = 1;
}

// Crescent drawn as one path — the lune between two circles. Carving with
// a face-coloured disc instead would paint over the face's shading.
function drawMoon(ctx, x, y, r, ink, alpha) {
    const bx = x + r * 0.52, by = y - r * 0.28, br = r * 0.94;
    const dx = bx - x, dy = by - y;
    const d = Math.hypot(dx, dy);
    const a = (r * r - br * br + d * d) / (2 * d);
    const hh = Math.sqrt(Math.max(0, r * r - a * a));
    // The two circles meet here; the crescent runs between these points.
    const mx = x + a * dx / d, my = y + a * dy / d;
    const p1 = [mx + hh * -dy / d, my + hh * dx / d];
    const p2 = [mx - hh * -dy / d, my - hh * dx / d];
    // `keeps` decides which of the two ways round the circle bounds the
    // crescent; the other way would cut across it.
    const arc = (cxx, cyy, rr, from, to, keeps) => {
        let sweep = to - from;
        while (sweep > Math.PI) sweep -= Math.PI * 2;
        while (sweep < -Math.PI) sweep += Math.PI * 2;
        const mid = from + sweep / 2;
        if (!keeps(cxx + Math.cos(mid) * rr, cyy + Math.sin(mid) * rr)) {
            sweep += sweep > 0 ? -Math.PI * 2 : Math.PI * 2;
        }
        const steps = 28;
        for (let i = 0; i <= steps; i++) {
            const t = from + sweep * (i / steps);
            ctx.lineTo(cxx + Math.cos(t) * rr, cyy + Math.sin(t) * rr);
        }
    };
    const ang = (cxx, cyy, p) => Math.atan2(p[1] - cyy, p[0] - cxx);
    const outsideCarve = (px, py) => Math.hypot(px - bx, py - by) > br;
    const insideDisc = (px, py) => Math.hypot(px - x, py - y) < r;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    arc(x, y, r, ang(x, y, p1), ang(x, y, p2), outsideCarve);
    arc(bx, by, br, ang(bx, by, p2), ang(bx, by, p1), insideDisc);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawSun(ctx, x, y, r, ink, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(x, y, r * 0.46, 0, Math.PI * 2, false); ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
        ctx.lineTo(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function render(ctx) {
    const w = ctx.width, h = ctx.height;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - Math.max(2, Math.min(w, h) * 0.01);
    const face = String(prop('faceColor'));
    const ink = String(prop('inkColor'));
    const lit = String(prop('litColor'));

    ctx.clearRect(0, 0, w, h);
    drawFace(ctx, cx, cy, R, face);

    // Hairline rim, and a thin circle just inside the tick ring.
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = Math.max(1, R * 0.006);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.995, 0, Math.PI * 2, false); ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.885, 0, Math.PI * 2, false); ctx.stroke();
    ctx.globalAlpha = 1;

    // No hands: the hour numeral lights up and the minute ring fills from
    // 12 o'clock round to the current minute.
    const now = new Date();
    const minute = now.getMinutes();
    const hour = (now.getHours() % 12) || 12;

    drawTicks(ctx, cx, cy, R, ink, lit, minute, now.getSeconds(),
              now.getMilliseconds() < 500,
              String(prop('showSeconds')) === 'true');
    drawNumerals(ctx, cx, cy, R, ink, lit, hour);

    // Moon above the wordmark, sun below it. Whichever half of the day it
    // is lights up; the other stays a faint engraving.
    const isPM = now.getHours() >= 12;
    const mark = R * 0.072;
    drawMoon(ctx, cx, cy - R * 0.34, mark, isPM ? lit : ink, isPM ? 1 : 0.28);
    drawSun(ctx, cx, cy + R * 0.34, mark, isPM ? ink : lit, isPM ? 0.28 : 1);

    // Wordmark, letter-spaced by hand for the sparse look.
    const label = String(prop('label') || '');
    if (label) {
        const size = Math.max(7, R * 0.085);
        ctx.font = size + 'px HelveticaNeue-Medium';
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.8;
        const spacing = size * 0.24;
        let total = 0;
        for (const ch of label) total += ctx.measureText(ch).width + spacing;
        total -= spacing;
        let x = cx - total / 2;
        for (const ch of label) {
            ctx.fillText(ch, x, cy + size * 0.34);
            x += ctx.measureText(ch).width + spacing;
        }
        ctx.globalAlpha = 1;
    }
}

plugin.export = {
    version: "1.0.0",
    author: "DeskLayer",
    description: "A minimal graphite dial with no hands: the hour numeral lights up, the minute ring fills segment by segment, the current second blinks, and the sun or moon marks the half of the day.",
    width: 300, height: 300,
    scaleMode: "ratio",
    minWidth: 140, maxWidth: 700, minHeight: 140, maxHeight: 700,
    properties,
    render
};
