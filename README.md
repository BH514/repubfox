# rePubFox

A reMarkable ePub generator for Firefox.

A fork of [jrockwar/repubfox](https://github.com/jrockwar/repubfox), which is in
turn a Firefox port of [rePub](https://github.com/hafaio/repub).

[![build](https://github.com/BH514/repubfox/actions/workflows/build.yml/badge.svg)](https://github.com/BH514/repubfox/actions/workflows/build.yml)
[![license](https://img.shields.io/github/license/BH514/repubfox)](LICENSE)

## Why this fork exists

reMarkable migrated accounts to sync schema version 4. The upstream Firefox fork
pins `rmapi-js` at v6, which cannot write to that schema, so ePub generation
succeeded while every upload was rejected. rePub fixed this upstream in
[hafaio/repub#23](https://github.com/hafaio/repub/issues/23); this fork ports the
change across.

It also adds a packaged `.xpi` build and an optional signing step, because
release Firefox refuses to install unsigned add-ons.

## Info on rePub

https://github.com/hafaio/repub

A reMarkable ePub generator. This is essentially an open source version of
[Read on reMarkable](https://chrome.google.com/webstore/detail/read-on-remarkable/bfhkfdnddlhfippjbflipboognpdpoeh).
In contast to that extension, this will include images in the generated ePub
files. It originally offered more configuration options over the original
extension, but those are disabled until a new API can be found.

However this doesn't replicate the printer adapter, so if you want to upload
PDFs it still recommended to keep the Read on reMarkable extension for those
uploads.

## Installing

Release Firefox only installs add-ons signed by Mozilla, so there are two routes.

**Signed, permanent.** Run the [build workflow](https://github.com/BH514/repubfox/actions/workflows/build.yml)
manually and download the `repubfox-signed-xpi` artifact, then install it from
`about:addons` -> gear icon -> "Install Add-on From File...". This needs the
signing setup below.

**Unsigned, temporary.** Load `manifest.json` from a local build through
`about:debugging#/runtime/this-firefox` -> "Load Temporary Add-on...". No
credentials required, but Firefox discards it on restart.

Either way, pair the extension from its options page with a one-time code from
https://my.remarkable.com/device/browser/connect.

## Building

```shell
bun install
bun xpi
```

This produces `repubfox.xpi`. The `xpi` script skips `export:images`, so the
icons in `images/` must already exist. Regenerate them with `bun export:images`,
which needs an SVG renderer such as `rsvg-convert` or ImageMagick 7.

Every push also builds the extension in CI and attaches it as the `repubfox-xpi`
artifact.

## Signing

Signing publishes an unlisted add-on to your own
[addons.mozilla.org](https://addons.mozilla.org) account. `FIREFOX_ADDON_ID` must
be an id you own, since the id in `manifest.json` belongs to the upstream fork
and AMO will reject it. Only the packaged copy is rewritten, so the committed
manifest keeps its original id.

Locally, with credentials from
https://addons.mozilla.org/developers/addon/api/key/:

```shell
export FIREFOX_ADDON_ID='repubfox@example'
export MOZILLA_API_KEY='user:XXXXXXX:XXX'
read -rs "MOZILLA_API_SECRET?AMO secret: " && export MOZILLA_API_SECRET

bun run sign
```

The signed `.xpi` lands in `web-ext-artifacts/`.

In CI, set the repository variable `FIREFOX_ADDON_ID` plus the secrets
`MOZILLA_API_KEY` and `MOZILLA_API_SECRET`, then start the build workflow from
the Actions tab. The signing job is skipped until the variable is set, and runs
only on a tag or a manual dispatch, never on a pull request.

AMO rejects a version it has already accepted, so bump `version` in
`manifest.json` before each signing run.
