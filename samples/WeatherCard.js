let properties = [
    {"name": "fps", "valueType": "number", "value": "1"},
    {"name": "city", "valueType": "string", "value": "Cupertino"},
    {"name": "temp", "valueType": "string", "value": "72°F"}
];

const prop = name => String(properties.find(p => p.name === name).value);

render = () => view([
    HStack([
        Image('sun.max.fill').fontSize(30).textColor('#FFCC00FF'),
        VStack([
            Text(prop('temp') + '  ' + prop('city')).fontSize(18).bold().textColor('white'),
            Text(new Date().toLocaleTimeString()).fontSize(12).textColor('#FFFFFF99')
        ]).spacing(2)
    ])
    .spacing(12)
    .padding(14)
    .background('#0A1E32D9')
    .cornerRadius(12)
]);

plugin.export = { properties, render };
