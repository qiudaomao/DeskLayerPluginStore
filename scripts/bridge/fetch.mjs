#!/usr/bin/env node
// Community catalog bridge: lifts `verified`-tagged topics from the forum's
// Plugin Showcase category into community/catalog.json.
//
// Flow: forum topics tagged `verified` → parse the topic template fields →
// download the plugin .js (size-capped, host-allowlisted) → static sanity
// checks (must contain plugin.export, must parse; never executed) → vendor
// the file under community/plugins/ (pins the reviewed bytes) → emit
// community/catalog.json in the exact schema the app already consumes.
//
// Env: DISCOURSE_API_KEY (required), DISCOURSE_API_USER (default: system),
//      DISCOURSE_URL (default: https://bbs.byteplayer.app)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const FORUM = (process.env.DISCOURSE_URL ?? "https://bbs.byteplayer.app").replace(/\/$/, "");
const API_KEY = process.env.DISCOURSE_API_KEY;
const API_USER = process.env.DISCOURSE_API_USER ?? "system";
const CATEGORY_SLUG = "plugin-showcase";
const VERIFIED_TAG = "verified";
const MAX_PLUGIN_BYTES = 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  new URL(FORUM).host,
  "raw.githubusercontent.com",
  "github.com",
  "gist.githubusercontent.com",
]);

const REPO_RAW = "https://raw.githubusercontent.com/qiudaomao/DeskLayerPluginStore/main";
const REPO_CDN = "https://cdn.jsdelivr.net/gh/qiudaomao/DeskLayerPluginStore@main";
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const PLUGINS_DIR = path.join(ROOT, "community", "plugins");
const CATALOG_PATH = path.join(ROOT, "community", "catalog.json");

if (!API_KEY) {
  console.error("DISCOURSE_API_KEY is not set");
  process.exit(1);
}

async function api(pathname) {
  const res = await fetch(`${FORUM}${pathname}`, {
    headers: { "Api-Key": API_KEY, "Api-Username": API_USER },
  });
  if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status}`);
  return res.json();
}

// Topic template fields look like: **Plugin name**: My Clock
function parseTemplateFields(raw) {
  const fields = {};
  for (const m of raw.matchAll(/^\*\*(.+?)\*\*\s*[:：]\s*(.*)$/gm)) {
    fields[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return fields;
}

// Extract a usable download URL: an http(s) URL in the field itself, a
// markdown link `[x](url)`, or an attachment `[file.js|attachment](upload://…)`
// resolved against the cooked HTML of the same post.
function resolveDownloadUrl(fieldValue, cooked) {
  if (!fieldValue) return null;
  const md = fieldValue.match(/\]\((upload:\/\/[^)]+|https?:\/\/[^)]+)\)/);
  const candidate = md ? md[1] : fieldValue.match(/https?:\/\/\S+/)?.[0];
  if (!candidate) return null;
  if (candidate.startsWith("upload://")) {
    // cooked contains <a class="attachment" href="/uploads/short-url/…"> or a full URL
    const hrefs = [...cooked.matchAll(/<a[^>]+href="([^"]+\.js)"/g)].map((m) => m[1]);
    const href = hrefs[0];
    if (!href) return null;
    return href.startsWith("http") ? href : `${FORUM}${href}`;
  }
  return candidate;
}

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "plugin";
}

async function download(url) {
  const u = new URL(url);
  if (!ALLOWED_HOSTS.has(u.host)) throw new Error(`host not allowlisted: ${u.host}`);
  const res = await fetch(u, { redirect: "follow", headers: u.host === new URL(FORUM).host ? { "Api-Key": API_KEY, "Api-Username": API_USER } : {} });
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_PLUGIN_BYTES) throw new Error(`plugin exceeds ${MAX_PLUGIN_BYTES} bytes`);
  return buf.toString("utf8");
}

// Static checks only — the source is parsed, never executed.
function validatePluginSource(src) {
  if (!/\bplugin\s*\.\s*export\b/.test(src)) throw new Error("source lacks plugin.export");
  new vm.Script(src, { filename: "plugin.js" }); // throws on syntax error
}

async function main() {
  const categories = (await api("/categories.json")).category_list.categories;
  const showcase = categories.find((c) => c.slug === CATEGORY_SLUG);
  if (!showcase) throw new Error(`category "${CATEGORY_SLUG}" not found`);

  const tagged = await api(`/tag/${VERIFIED_TAG}.json`);
  const topics = (tagged.topic_list?.topics ?? []).filter((t) => t.category_id === showcase.id);
  console.log(`${topics.length} verified topic(s) in ${CATEGORY_SLUG}`);

  await mkdir(PLUGINS_DIR, { recursive: true });
  const plugins = [];

  for (const topic of topics) {
    const label = `#${topic.id} "${topic.title}"`;
    try {
      const full = await api(`/t/${topic.id}.json?include_raw=1`);
      const first = full.post_stream.posts[0];
      const fields = parseTemplateFields(first.raw ?? "");

      const name = fields["plugin name"];
      const version = fields["version"];
      const downloadUrl = resolveDownloadUrl(fields["download url"], first.cooked ?? "");
      if (!name || !version || !downloadUrl) {
        console.warn(`skip ${label}: missing name/version/download url`);
        continue;
      }

      const slug = slugify(name);
      const vendored = `${slug}-${version}.js`;
      const vendoredPath = path.join(PLUGINS_DIR, vendored);

      if (existsSync(vendoredPath)) {
        // Reviewed bytes are pinned: never overwrite an existing version.
        console.log(`keep ${label}: ${vendored} already vendored`);
      } else {
        const src = await download(downloadUrl);
        validatePluginSource(src);
        await writeFile(vendoredPath, src, "utf8");
        console.log(`vendor ${label} -> community/plugins/${vendored}`);
      }

      const permissions = fields["required permissions"];
      const descriptionParts = [fields["description"] ?? ""];
      if (permissions && !/^none$/i.test(permissions)) descriptionParts.push(`Permissions: ${permissions}.`);
      descriptionParts.push(`Discuss & cheer: ${FORUM}/t/${topic.slug}/${topic.id}`);

      const previewUrl = resolveDownloadUrl(fields["preview image"], first.cooked ?? "");
      const entry = {
        name,
        description: descriptionParts.filter(Boolean).join(" "),
        url: `${REPO_RAW}/community/plugins/${vendored}`,
        mirrors: [`${REPO_CDN}/community/plugins/${vendored}`],
        version,
        author: first.username,
        cheers: topic.like_count ?? 0,
      };
      if (previewUrl && !previewUrl.startsWith("upload://")) entry.preview = previewUrl;
      plugins.push(entry);
    } catch (err) {
      console.warn(`skip ${label}: ${err.message}`);
    }
  }

  plugins.sort((a, b) => b.cheers - a.cheers || a.name.localeCompare(b.name));

  const catalog = {
    name: "DeskLayer Community",
    url: `${REPO_RAW}/community/catalog.json`,
    mirrors: [`${REPO_CDN}/community/catalog.json`],
    website: FORUM,
    plugins,
  };

  const next = JSON.stringify(catalog, null, 2) + "\n";
  const prev = existsSync(CATALOG_PATH) ? await readFile(CATALOG_PATH, "utf8") : "";
  if (next !== prev) {
    await writeFile(CATALOG_PATH, next, "utf8");
    console.log(`wrote community/catalog.json with ${plugins.length} plugin(s)`);
  } else {
    console.log("catalog unchanged");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
