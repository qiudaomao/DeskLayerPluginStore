let properties = [
    {"name": "interval", "valueType": "number", "value": "1"}
];

let events = [];

$server.on('POST', (event, body) => {
    let label = body;
    try { const j = JSON.parse(body); label = j.tool || j.event || j.type || body; } catch (e) {}
    events.unshift({ at: new Date().toLocaleTimeString(), text: String(label).slice(0, 40) });
    events = events.slice(0, 6);
    console.log('hook ' + event.method + ' ' + event.path + ': ' + label);
});
console.log('registered POST handler (app listens on 127.0.0.1:8787)');

render = () => {
    const rows = events.length
        ? events.map(e => HStack([
            Text(e.at).fontSize(10).textColor('#FFFFFF66').frame(70, 14),
            Text(e.text).fontSize(12).textColor('white')
          ]).spacing(4))
        : [Text('waiting for POST to :8787…').fontSize(12).textColor('#FFFFFF88')];
    return view([
        VStack([
            HStack([
                Image('antenna.radiowaves.left.and.right').fontSize(13).textColor('#4CD964FF'),
                Text('Hooks :8787').fontSize(13).bold().textColor('white')
            ]).spacing(6)
        ].concat(rows)).spacing(4).padding(14).background('#0C0E16E6').cornerRadius(14)
    ]);
};

plugin.export = { permissions: ['server'], properties, render };
