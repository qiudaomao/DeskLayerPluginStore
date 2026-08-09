let properties = [
    {"name": "interval", "valueType": "number", "value": "1"},
    {"name": "accent", "valueType": "color", "value": "#4CD964FF"}
];

const LABEL_W = 54;   // aligned label column
const PCT_W = 38;     // aligned percentage column
const BAR_W = 66;     // aligned bar column
let lastNet = null;

// Bar drawn from Rects so it matches the accent color exactly (and
// renders identically on the wallpaper, in widgets, and in snapshots).
function bar(fraction, accent) {
    const filled = Math.max(2, Math.min(BAR_W, BAR_W * fraction));
    return ZStack([
        HStack([
            Rect().frame(BAR_W, 5).background('#FFFFFF26').cornerRadius(2.5),
            Spacer()
        ]),
        HStack([
            Rect().frame(filled, 5).background(accent).cornerRadius(2.5),
            Spacer()
        ])
    ]).frame(BAR_W, 5, 'leading');
}

// Compact: 21.1G rather than "21.1 GB", so rows never wrap.
function fmt(n) {
    const u = ['B', 'K', 'M', 'G', 'T'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + u[i];
}

// label | percent | bar | detail — every column fixed so rows line up.
function metric(label, fraction, detail, accent) {
    return HStack([
        Text(label).fontSize(11).textColor('#FFFFFF99').frame(LABEL_W, 14, 'leading'),
        Text(Math.round(fraction * 100) + '%').fontSize(12).bold()
            .textColor(accent).frame(PCT_W, 14, 'trailing'),
        bar(fraction, accent),
        Text(detail).fontSize(10).textColor('#FFFFFF99').lineLimit(1),
        Spacer()
    ]).spacing(8);
}

render = () => {
    const s = $system.stats();
    const accent = String(properties.find(p => p.name === 'accent').value);
    const memUsed = s.memory.used / s.memory.total;
    const diskUsed = (s.disk.total - s.disk.free) / s.disk.total;

    let down = 0, up = 0;
    if (lastNet) {
        const dt = Math.max(s.time - lastNet.time, 0.001);
        down = (s.network.rxBytes - lastNet.rxBytes) / dt;
        up = (s.network.txBytes - lastNet.txBytes) / dt;
    }
    lastNet = { time: s.time, rxBytes: s.network.rxBytes, txBytes: s.network.txBytes };

    return view([
        VStack([
            HStack([
                Image('gauge.medium').fontSize(12).textColor(accent),
                Text('System').fontSize(13).bold().textColor('white'),
                Spacer()
            ]).spacing(6),

            metric('CPU', s.cpu, s.cores + ' cores', accent),
            metric('Memory', memUsed, fmt(s.memory.used) + '/' + fmt(s.memory.total), accent),
            metric('Disk', diskUsed, fmt(s.disk.free) + ' free', accent),

            // Net has no percentage — keep the same column grid so it
            // still lines up with the rows above.
            HStack([
                Text('Net').fontSize(11).textColor('#FFFFFF99').frame(LABEL_W, 14, 'leading'),
                Text('↓ ' + fmt(down) + '/s').fontSize(11).textColor('#FFFFFFCC').lineLimit(1),
                Text('↑ ' + fmt(up) + '/s').fontSize(11).textColor('#FFFFFFCC').lineLimit(1),
                Spacer()
            ]).spacing(8)
        ]).spacing(7).padding(14).background('#0C0E16E6').cornerRadius(14)
    ]);
};

plugin.export = {
    version: "1.1.0",
    author: "DeskLayer",
    description: "Live CPU, memory, disk, and network gauges.",
    width: 320, height: 170,
    scaleMode: "free",         // rows reflow, so width and height are independent
    minWidth: 260, maxWidth: 640, minHeight: 120, maxHeight: 360,
    properties,
    render
};
