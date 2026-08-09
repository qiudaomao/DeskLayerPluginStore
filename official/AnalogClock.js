let properties = [
    {"name": "fps", "valueType": "number", "value": "30"},
    {"name": "faceColor", "valueType": "color", "value": "#12141ED9"},
    {"name": "label", "valueType": "string", "value": ""}
];

function render(ctx) {
    const w = ctx.width, h = ctx.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
    ctx.fillStyle = ctx.getProp('faceColor') || 'rgba(18,20,30,0.85)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
        ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
        ctx.stroke();
    }

    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    function hand(angle, length, width, style) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle - Math.PI / 2);
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-length * 0.15, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        ctx.restore();
    }

    hand(hr * Math.PI / 6, r * 0.5, 6, 'white');
    hand(min * Math.PI / 30, r * 0.75, 4, 'white');
    hand(sec * Math.PI / 30, r * 0.85, 2, 'red');

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2, false);
    ctx.fillStyle = 'red';
    ctx.fill();

    ctx.font = 'bold 16px Helvetica';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const label = now.toLocaleTimeString();
    const m = ctx.measureText(label);
    ctx.fillText(label, cx - m.width / 2, cy + r * 0.55);

    const custom = String(ctx.getProp('label') || '');
    if (custom) {
        ctx.font = '12px Helvetica';
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        const cm = ctx.measureText(custom);
        ctx.fillText(custom, cx - cm.width / 2, cy - r * 0.35);
    }
}

plugin.export = {
    version: "1.0.0",
    author: "DeskLayer",
    description: "An analog clock with a custom face color and label.",
    width: 260, height: 260,   // square: rect matches the round face
    scaleMode: "ratio",        // stays circular when resized
    minWidth: 120, maxWidth: 600, minHeight: 120, maxHeight: 600,
    properties,
    render
};
