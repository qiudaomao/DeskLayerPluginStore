let properties = [
    {"name": "title", "valueType": "string", "value": "Hello, World!"},
    {"name": "subtitle", "valueType": "string", "value": "rendered as native SwiftUI"},
    {"name": "accent", "valueType": "color", "value": "#4CD964FF"}
];

const prop = name => String(properties.find(p => p.name === name).value);

render = () => view([
    Section([
        Paragraph(prop('title'))
            .textColor(prop('accent'))
            .fontSize(28)
            .bold(),
        Paragraph(prop('subtitle'))
            .textColor('#FFFFFFAA')
            .fontSize(13)
    ])
    .spacing(6)
    .padding(18)
    .background('#101420CC')
    .cornerRadius(14)
]);

plugin.export = { properties, render };
