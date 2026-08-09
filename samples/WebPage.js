let properties = [
    {"name": "url", "valueType": "string", "value": "https://example.com"},
    {"name": "offsetX", "valueType": "number", "value": "0"},
    {"name": "offsetY", "valueType": "number", "value": "0"},
    {"name": "zoom", "valueType": "number", "value": "1"}
];

plugin.export = {
    mode: "webview",
    version: "1.0.0",
    author: "DeskLayer",
    description: "Shows a web page. Edit URL, scroll offset, and zoom in the inspector.",
    properties,
    webview: {
        // userAgent: "Mozilla/5.0 …",
        // headers: { "X-Example": "1" },
        // cookies: [{ name: "session", value: "…", domain: "example.com", path: "/" }]
    }
};
