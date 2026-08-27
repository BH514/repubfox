import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const UPSTREAM_ID = "repubfox@jrockwar";
const STAGE_DIR = "dist";
const XPI = "repubfox.xpi";

const addonId = process.env["FIREFOX_ADDON_ID"];
if (!addonId || addonId === UPSTREAM_ID) {
  console.error(
    `Set FIREFOX_ADDON_ID to an id you own. AMO rejects signing under "${UPSTREAM_ID}".`,
  );
  process.exit(1);
}

const apiKey = process.env["MOZILLA_API_KEY"];
const apiSecret = process.env["MOZILLA_API_SECRET"];
if (!apiKey || !apiSecret) {
  console.error(
    "Set MOZILLA_API_KEY and MOZILLA_API_SECRET. Create a pair at https://addons.mozilla.org/developers/addon/api/key/",
  );
  process.exit(1);
}

// sign the exact bytes that ship in the xpi rather than a re-collected tree
rmSync(STAGE_DIR, { recursive: true, force: true });
mkdirSync(STAGE_DIR, { recursive: true });
const unzip = spawnSync("unzip", ["-q", XPI, "-d", STAGE_DIR], {
  stdio: "inherit",
});
if (unzip.status !== 0) {
  console.error(`Could not unpack ${XPI}. Run "bun xpi" first.`);
  process.exit(unzip.status ?? 1);
}

const manifestPath = `${STAGE_DIR}/manifest.json`;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.browser_specific_settings.gecko.id = addonId;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Signing ${addonId} v${manifest.version} as unlisted...`);

const proxy =
  process.env["HTTPS_PROXY"] ??
  process.env["https_proxy"] ??
  process.env["HTTP_PROXY"] ??
  process.env["http_proxy"];

// behind a proxy node's fetch ignores the proxy env vars, and its bundled CA
// store misses TLS-intercepting corporate roots
const nodeOptions = process.env["NODE_OPTIONS"] ?? "";
const proxyEnv = proxy
  ? {
      NODE_USE_ENV_PROXY: "1",
      NODE_OPTIONS: nodeOptions.includes("--use-system-ca")
        ? nodeOptions
        : `${nodeOptions} --use-system-ca`.trim(),
    }
  : {};

const { status } = spawnSync(
  "npx",
  [
    "--yes",
    "web-ext@latest",
    "sign",
    "--source-dir",
    STAGE_DIR,
    "--artifacts-dir",
    "web-ext-artifacts",
    "--channel",
    "unlisted",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      // credentials go through the environment so they stay out of the process list
      WEB_EXT_API_KEY: apiKey,
      WEB_EXT_API_SECRET: apiSecret,
      ...proxyEnv,
    },
  },
);

if (status === 0) {
  console.log("Signed xpi is in web-ext-artifacts/");
}
process.exit(status ?? 1);
