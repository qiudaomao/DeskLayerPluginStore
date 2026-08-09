let properties = [
    {"name": "interval", "valueType": "number", "value": "5"},
    {"name": "url", "valueType": "string", "value": "https://api.github.com/zen"},
    {"name": "refreshSeconds", "valueType": "number", "value": "60"}
];

let text = 'loading…';
let status = '';
let fetchedAt = '';

function refresh() {
    console.log('fetching ' + properties.find(p => p.name === 'url').value);
    fetch(String(properties.find(p => p.name === 'url').value))
        .then(r => { status = 'HTTP ' + r.status; return r.text(); })
        .then(body => {
            text = body.slice(0, 80);
            fetchedAt = new Date().toLocaleTimeString();
            console.log(status + ': ' + text.slice(0, 40));
        })
        .catch(e => { text = 'error: ' + e.message; console.log('fetch failed: ' + e.message); });
}

refresh();
setInterval(refresh, (Number(properties.find(p => p.name === 'refreshSeconds').value) || 60) * 1000);

function render(ctx) {
    const w = ctx.width, h = ctx.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,17,26,0.85)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Helvetica';
    ctx.fillText('fetch demo · ' + status + ' · ' + fetchedAt, 12, 20);

    ctx.fillStyle = 'white';
    ctx.font = '14px Helvetica';
    // naive wrap
    const words = String(text).split(' ');
    let line = '', y = 46;
    for (const word of words) {
        const probe = line ? line + ' ' + word : word;
        if (ctx.measureText(probe).width > w - 24 && line) {
            ctx.fillText(line, 12, y);
            y += 20;
            line = word;
        } else {
            line = probe;
        }
    }
    if (line) ctx.fillText(line, 12, y);
}

plugin.export = { properties, render };
