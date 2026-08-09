let properties = [
    {"name": "fps", "valueType": "number", "value": "2"},
    {"name": "url", "valueType": "string", "value": "wss://echo.websocket.org"}
];

let state = 'connecting';
let lastMessage = '';
let sent = 0;
let ws = null;

function connect() {
    ws = new WebSocket(String(properties.find(p => p.name === 'url').value));
    ws.onopen = function () {
        state = 'open';
        ws.send('hello from DeskLayer');
        sent++;
    };
    ws.onmessage = function (e) { lastMessage = String(e.data).slice(0, 60); };
    ws.onclose = function (e) { state = 'closed(' + e.code + ')'; };
    ws.onerror = function (e) { state = 'error: ' + e.message; };
}
connect();
setInterval(function () {
    if (ws && ws.readyState === 1) { ws.send('ping ' + new Date().toLocaleTimeString()); sent++; }
}, 15000);

function render(ctx) {
    const w = ctx.width, h = ctx.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,26,17,0.85)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Helvetica';
    ctx.fillText('websocket demo · ' + state + ' · sent ' + sent, 12, 20);

    ctx.fillStyle = 'white';
    ctx.font = '14px Helvetica';
    ctx.fillText(lastMessage || '(no message yet)', 12, 46);
}

plugin.export = { properties, render };
