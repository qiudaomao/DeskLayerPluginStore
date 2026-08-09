let properties = [
    {"name": "fps", "valueType": "number", "value": "60"},
    {"name": "count", "valueType": "number", "value": "200"},
    {"name": "trail", "valueType": "color", "value": "#0A0C1459"}
];

const COLORS = ['#5ac8fa', '#ff9500', '#ff2d55', '#4cd964', '#ffcc00', '#af52de'];
let parts = null;
let last = 0;

function init(w, h) {
    const n = Number(ctxCount()) || 200;
    parts = [];
    for (let i = 0; i < n; i++) {
        parts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 160,
            vy: (Math.random() - 0.5) * 160,
            r: 2 + Math.random() * 4,
            c: COLORS[i % COLORS.length]
        });
    }
}

let ctxCount = function () { return 200; };

function render(ctx) {
    ctxCount = function () { return ctx.getProp('count'); };
    const w = ctx.width, h = ctx.height;
    if (!parts) init(w, h);
    const t = Date.now() / 1000;
    const dt = last ? Math.min(t - last, 0.1) : 1 / 60;
    last = t;

    ctx.fillStyle = ctx.getProp('trail') || 'rgba(10,12,20,0.35)';
    ctx.fillRect(0, 0, w, h);

    for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < p.r) { p.x = p.r; p.vx = -p.vx; }
        if (p.x > w - p.r) { p.x = w - p.r; p.vx = -p.vx; }
        if (p.y < p.r) { p.y = p.r; p.vy = -p.vy; }
        if (p.y > h - p.r) { p.y = h - p.r; p.vy = -p.vy; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.28318530718, false);
        ctx.fillStyle = p.c;
        ctx.fill();
    }
}

plugin.export = { properties, render };
