# xr-lab-library

The Lone Star XR Lab's app library — shows the XR apps the lab has already reviewed and currently has approved and/or installed. Live at [lone-star-xr-lab.github.io/xr-lab-library](https://lone-star-xr-lab.github.io/xr-lab-library/).

This is a thin site: almost all of the actual logic, styling, and app data lives in [xr-app-data](https://github.com/Lone-Star-XR-Lab/xr-app-data), loaded at runtime from a jsdelivr CDN mirror of that repo. See that repo's README for the data schema, the filtering/rendering code, and — most importantly — how deploys work.

## Contents

- `index.html` — the whole site. Contains the page shell, this site's specific copy/branding, and an Alpine.js `x-data="app({ site: 'library' })"` root that pulls in the shared `ui/app.js`/`ui/styles.css` from xr-app-data. There is no other HTML/JS/CSS in this repo — don't fork a local copy of the shared UI code here.
- `images/logo/` — the one asset that *is* local rather than CDN-hosted (the lab's logo, referenced with a relative path in `index.html`).

## How apps get on this site

An app shows up here only if its `visibility.library` field is `true` in `xr-app-data`'s `data/apps.json` — meaning it's currently approved for lab use and/or installed. Everything else in the XR ecosystem, owned or not, lives in the companion [xr-lab-catalogue](https://github.com/Lone-Star-XR-Lab/xr-lab-catalogue) site instead.

## Deploying a change

`index.html` loads `ui/app.js` and `ui/styles.css` from xr-app-data via a **pinned commit SHA** (not `@main` — that was tried and abandoned because jsdelivr's caching for a mutable branch ref proved unreliable and wouldn't reliably refresh even after a manual purge). This means:

- Editing this site's own copy/branding/layout in `index.html` is a normal push, no special steps.
- Picking up *any* change made in xr-app-data (new data, a UI fix, a new app) requires updating the SHA in the `<script src="...">`/`<link href="...">` tags at the top of `index.html` to the latest commit from that repo, then pushing here. Follow the exact sequence in xr-app-data's README under "Deploying a change" — this site is the last step in that sequence, not something to update on its own.
