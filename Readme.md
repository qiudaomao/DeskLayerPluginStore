# DeskLayer Plugin Store

Plugin catalogs for [DeskLayer](https://github.com/qiudaomao/DeskLayer). The app
ships with no plugins; you add a store and install from it.

| Store | Catalog URL |
| --- | --- |
| Official | `https://raw.githubusercontent.com/qiudaomao/DeskLayerPluginStore/main/official/catalog.json` |
| Samples | `https://raw.githubusercontent.com/qiudaomao/DeskLayerPluginStore/main/samples/catalog.json` |

Both are offered by name in DeskLayer's ＋ menu, so you normally don't need to
paste a URL.

## Layout

```
official/            plugins the project maintains
  catalog.json       the store's index
  AnalogClock.js     a plugin
  AnalogClock.json   its update manifest: { version, url }
samples/             examples to read and copy
```

`catalog.json` is what a store serves:

```json
{
  "name": "DeskLayer Official",
  "plugins": [
    { "name": "AnalogClock",
      "description": "An analog clock with a custom face color and label.",
      "preview": "https://…/analogclock.png",
      "url": "https://…/official/AnalogClock.js",
      "version": "1.0.0",
      "author": "DeskLayer" }
  ]
}
```

`preview` is optional and shown in the inspector before installing.

## Mirrors

`raw.githubusercontent.com` is unreachable on some networks, so both the
catalog and each plugin can list `mirrors`. DeskLayer tries the primary URL
first, then each mirror in order, and remembers whichever one answered so the
next fetch starts there instead of paying for the timeout again.

```json
{
  "url": "https://raw.githubusercontent.com/.../official/catalog.json",
  "mirrors": ["https://cdn.jsdelivr.net/gh/qiudaomao/DeskLayerPluginStore@main/official/catalog.json"]
}
```

These catalogs mirror through jsDelivr, which serves this same repository. The
mirrors a catalog declares are remembered by the app, so a store only has to be
reachable once for its fallbacks to be learned; the two built-in stores also
ship their mirror in the app, so even the very first fetch has a fallback.

## Updating a plugin

Bump `version` in the plugin's `plugin.export`, then regenerate the catalog and
the sibling `<Name>.json` manifest so both carry the new version. DeskLayer
checks the manifest first (a few hundred bytes) and only downloads the `.js`
when it is actually newer; a store with no manifest still works, since the app
falls back to reading the version out of the JavaScript.

Catalogs are cached by the app for 24 hours. The Refresh button on a store
category fetches immediately.

## Writing plugins

**[docs/plugin-guide.md](docs/plugin-guide.md)** is the complete guide: the
plugin shape, properties, render cadence, canvas and declarative rendering,
webview mode, timers and networking, the host APIs (`$system`, `shell()`,
`applescript()`, `ssh()`, `$server`) and their permissions, per-item settings,
debugging, and a full reference.

**[docs/plugin.d.ts](docs/plugin.d.ts)** declares the same API as TypeScript,
so an editor can complete it and catch mistakes:

```js
/// <reference path="./plugin.d.ts" />
```

Read a plugin in `samples/` alongside both — each one is small and exercises a
different part of the API.
