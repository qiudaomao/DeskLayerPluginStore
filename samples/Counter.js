let properties = [];
let count = 0;
let name = "friend";

render = () => view([
    VStack([
        Text("Hi, " + name + "!").fontSize(16).bold().textColor("white"),
        TextField("your name", (e) => { name = e.text || "friend"; }).value(name),
        HStack([
            Button("−", () => { count = Math.max(0, count - 1); }).textColor("#FF453A"),
            Text(String(count)).fontSize(22).bold().textColor("white").frame(48, 28),
            Button("+", () => { count += 1; }).textColor("#32D74B")
        ]).spacing(10),
        ProgressBar(Math.min(count / 10, 1)),
        Text("tap the card").fontSize(10).textColor("#FFFFFF66")
            .onTapGesture((e) => { count += 1; })
    ]).spacing(10).padding(16).background("#0C0E16E6").cornerRadius(14)
]);

plugin.export = {
    version: "1.0.0",
    author: "DeskLayer",
    description: "Interactive counter — buttons, a text field, and tap callbacks. Use as a floating window.",
    width: 260, height: 220,
    resizable: false,   // fixed-size card: SwiftUI lays it out at its natural size
    properties,
    render
};
