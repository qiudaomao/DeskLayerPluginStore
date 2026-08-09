let properties = [
    {"name": "interval", "valueType": "number", "value": "2"},
    {"name": "title", "valueType": "string", "value": "remote"},
    {"name": "accent", "valueType": "color", "value": "#34C759FF"},
    {"name": "warnColor", "valueType": "color", "value": "#FF9F0AFF"}
];

const prop = n => String(properties.find(p => p.name === n).value);

// One entry per configured server: { stats, prev, status }.
const servers = {};

// Portable probe: works on Linux (/proc) and macOS (sysctl/vm_stat/
// netstat/iostat). Emits the same "KEY value…" lines either way.
// printf "%.0f" everywhere: awk's default %g prints big counters as
// 9.9e+11, and the lost precision would wreck the rate diffs.
const PROBE = [
    'sh', '-c',
    'if [ -r /proc/loadavg ]; then ' +
        'echo "L $(cut -d\" \" -f1 /proc/loadavg) $(nproc)"; ' +
        // M used total cached free
        'free -k | awk \'/Mem:/{printf "M %.0f %.0f %.0f %.0f\\n", $3, $2, $6, $4}\'; ' +
        'echo "T $(cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1 || echo 0)"; ' +
        'awk \'$1 ~ /^(eth|ens|enp|eno|wl)/ {gsub(":"," ");rx+=$2;tx+=$10} END{printf "N %.0f %.0f\\n", rx, tx}\' /proc/net/dev; ' +
        'awk \'$3 ~ /^(sd|nvme|vd|hd)/ {r+=$6;w+=$10} END{printf "D %.0f %.0f\\n", r*512, w*512}\' /proc/diskstats; ' +
    'else ' +
        'echo "L $(sysctl -n vm.loadavg | awk \'{print $2}\') $(sysctl -n hw.ncpu)"; ' +
        // active+wired+compressed = used, inactive ≈ cached, free = free
        'vm_stat | awk -v p=$(sysctl -n hw.pagesize) -v t=$(sysctl -n hw.memsize) ' +
            '\'/Pages free/{f=$3} /Pages active/{a=$3} /Pages inactive/{i=$3} ' +
            '/Pages wired/{w=$4} /Pages occupied by compressor/{c=$5} ' +
            'END{gsub("\\\\.","",f);gsub("\\\\.","",a);gsub("\\\\.","",i);gsub("\\\\.","",w);gsub("\\\\.","",c); ' +
            'printf "M %.0f %.0f %.0f %.0f\\n", (a+w+c)*p/1024, t/1024, i*p/1024, f*p/1024}\'; ' +
        'echo "T 0"; ' +
        'netstat -ib | awk \'$1 ~ /^en/ && $4 !~ /:/ {rx+=$7; tx+=$10} END{printf "N %.0f %.0f\\n", rx, tx}\'; ' +
        // macOS iostat reports combined throughput only; -1 marks the
        // write column unavailable so the UI shows a single io/s figure.
        'iostat -Id disk0 2>/dev/null | awk \'NR==3{printf "D %.0f -1\\n", $3*1048576}\' || echo "D 0 -1"; ' +
    'fi'
];

function refreshOne(name) {
    ssh(PROBE, name).then(r => {
        const e = servers[name] || (servers[name] = {});
        if (r.status !== 0) {
            // Keep enough of stderr to be actionable — "exit 255" alone
            // says nothing about why the connection failed.
            e.status = 'exit ' + r.status + ' ' +
                (r.stderr || '').trim().replace(/\s+/g, ' ').slice(0, 180);
            return;
        }
        const s = { time: Date.now() / 1000 };
        r.stdout.trim().split('\n').forEach(line => {
            const f = line.trim().split(/\s+/);
            if (f[0] === 'L') { s.load = parseFloat(f[1]) || 0; s.cores = parseInt(f[2]) || 1; }
            else if (f[0] === 'M') {
                s.memUsed = +f[1] || 0; s.memTotal = +f[2] || 1;
                s.memCached = +f[3] || 0; s.memFree = +f[4] || 0;
            }
            else if (f[0] === 'T') { s.temp = (+f[1] || 0) / 1000; }
            else if (f[0] === 'N') { s.rx = +f[1] || 0; s.tx = +f[2] || 0; }
            else if (f[0] === 'D') { s.dr = +f[1] || 0; s.dw = +f[2] || 0; }
        });
        e.prev = e.stats; e.stats = s; e.status = 'ok';
    }).catch(err => {
        const e = servers[name] || (servers[name] = {});
        e.status = err.message;
    });
}

function refresh() {
    const names = ($ssh.hosts && $ssh.hosts.length) ? $ssh.hosts : [];
    if (!names.length) { servers['—'] = { status: 'no SSH destination configured' }; return; }
    names.forEach(refreshOne);
}
setTimeout(refresh, 0);              // host APIs are ready after load
setInterval(refresh, 2000);

// 102 K / 1.2 M — value and unit split so they can be styled separately.
function rate(bytesPerSec) {
    const u = ['', 'K', 'M', 'G'];
    let n = bytesPerSec || 0, i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return { n: n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 0 : 1), u: u[i] };
}

function perSec(e, key) {
    if (!e.prev || !e.stats) return 0;
    const dt = Math.max(e.stats.time - e.prev.time, 0.001);
    return Math.max(0, (e.stats[key] - e.prev[key]) / dt);
}

// Big green number + small unit, with a caption underneath.
function stat(value, caption, accent) {
    const v = rate(value);
    return VStack([
        HStack([
            Text(v.n).fontSize(26).bold().textColor(accent),
            Text(v.u).fontSize(13).textColor('#FFFFFF99')
        ]).spacing(3),
        Text(caption).fontSize(11).textColor('#FFFFFF99')
    ]).spacing(0).frame(78, 52, 'center');
}

function gauge(inner, caption) {
    return VStack([ inner.frame(52, 52), Text(caption).fontSize(11).textColor('#FFFFFF99') ]).spacing(4);
}

// Segmented memory ring from Ring(from, to) arcs:
//   used = green (accent), cached = gray, free = the dim remainder.
function memoryRing(s, accent, warn) {
    const total = s.memTotal || 1;
    const used = Math.min(Math.max(s.memUsed / total, 0), 1);
    const cached = Math.min(Math.max((s.memCached || 0) / total, 0), 1 - used);
    return ZStack([
        Ring(0, 1).lineWidth(6).ringColor('#FFFFFF14'),                  // free
        Ring(0, used).lineWidth(6).ringColor(used > 0.9 ? warn : accent), // used
        Ring(used, used + cached).lineWidth(6).ringColor('#C7C7CCCC'),   // cached
        Text(Math.round(used * 100) + '%').fontSize(12).textColor('#FFFFFFCC')
    ]);
}

// One server block: header + gauges + rates.
function serverView(name, e, accent, warn) {
    if (!e || e.status !== 'ok' || !e.stats) {
        return VStack([
            HStack([ Text(name).fontSize(15).bold().textColor('white'), Spacer() ]),
            Text((e && e.status) || 'connecting…').fontSize(11).textColor(warn).lineLimit(4)
        ]).spacing(3);
    }
    const s = e.stats;
    const loadFrac = Math.min(s.load / s.cores, 1);
    const memFrac = s.memUsed / s.memTotal;

    return VStack([
        HStack([
            Text(name).fontSize(15).bold().textColor('white'),
            Spacer(),
            Text(s.temp > 0 ? Math.round(s.temp) + '°C' : '').fontSize(13).textColor('#FFFFFF99')
        ]),
        HStack([
            // Load: outer ring = 1-min load per core.
            gauge(ZStack([
                Ring(loadFrac).lineWidth(6)
                    .ringColor(loadFrac > 0.8 ? warn : accent).trackColor('#FFFFFF1A'),
                Ring(Math.min(s.load / (s.cores * 2), 1)).lineWidth(6)
                    .ringColor(accent).trackColor('#00000000').frame(28, 28)
            ]), 'load'),
            // Memory ring, segmented in JS: used, then cached (light
            // gray), then free (green) — stacked Ring(from, to) arcs.
            gauge(memoryRing(s, accent, warn), 'memory'),
            Spacer(),
            VStack([ stat(perSec(e, 'tx'), '↑/s', accent), stat(perSec(e, 'rx'), '↓/s', accent) ]).spacing(0),
            // macOS reports combined disk throughput (dw === -1).
            s.dw < 0
                ? VStack([ stat(perSec(e, 'dr'), 'io/s', accent) ]).spacing(0)
                : VStack([ stat(perSec(e, 'dr'), 'read/s', accent), stat(perSec(e, 'dw'), 'write/s', accent) ]).spacing(0)
        ]).spacing(12)
    ]).spacing(4);
}

render = () => {
    const accent = prop('accent');
    const warn = prop('warnColor');
    const names = ($ssh.hosts && $ssh.hosts.length) ? $ssh.hosts : Object.keys(servers);
    const blocks = [];
    names.forEach((n, i) => {
        // null width = flexible, so the rule spans the card without
        // forcing the stack wider than the item.
        if (i > 0) blocks.push(Rect().frame(null, 1).background('#FFFFFF14'));
        blocks.push(serverView(n, servers[n], accent, warn));
    });
    if (!blocks.length) {
        blocks.push(Text('no SSH destination configured').fontSize(12).textColor(warn));
    }
    return view([
        VStack(blocks).spacing(10).padding(16).background('#141414F2').cornerRadius(16)
    ]);
};

plugin.export = {
    version: "1.1.0",
    author: "DeskLayer",
    description: "Remote host dashboard over SSH: load and memory rings, network and disk I/O rates.",
    width: 430, height: 190,
    // Height follows the number of servers; width stays whatever you set.
    scaleMode: "free",
    autoSize: "height",
    minWidth: 340, maxWidth: 760,
    permissions: ['ssh'],
    properties,
    render
};
