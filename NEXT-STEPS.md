# Where this stands and what is left

Last updated 20 September 2026. Read this first if you come back to this cold.

## What exists

| Thing | State |
|---|---|
| The app | Built, tested, deployed |
| Atlassian app id | `ari:cloud:ecosystem::app/9a59ac4a-d78d-4849-b744-b4192a4a5738` |
| App name | Mermaid Live Diagrams |
| Development environment | Deployed, v2.1.0 |
| **Production environment** | **Deployed 20 Sep 2026.** Required before listing |
| Installed on | akalbaari.atlassian.net (Confluence), development build |
| Developer Space | "Adam Albaari" |
| Source | `~/Downloads/mermaid-app` |
| Repo | https://github.com/akalbaari/mermaid-live-diagrams-confluence |
| Vendor site | https://akalbaari.github.io/mermaid-live-diagrams-confluence/ |
| Listing copy | `marketing/listing.md`, every field inside Atlassian's limits |
| Listing images | `marketing/out/`, all at required pixel sizes |
| Marketplace listing | **Does not exist.** Nobody can find the app |

## Done

1. ~~Push to GitHub and turn on Pages.~~ Live URLs, all returning 200:
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/privacy.html
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/support.html
2. ~~Fresh Atlassian API token.~~
3. ~~Deploy to the production environment.~~

## What is left

4. **Marketplace partner profile.** This is Adam's, and it cannot be delegated.
   marketplace.atlassian.com/manage/vendors asks for a one-time passcode sent
   to akalbaari@gmail.com before it will let anyone in. That is a second
   factor, and the whole point of it is to confirm a person is present, so
   Claude does not complete it. Sign in there, create the partner profile.
5. **Create the listing.** marketplace.atlassian.com/manage/apps/create, pick
   the Forge app, paste the copy from `marketing/listing.md`, upload the
   images from `marketing/out/`. The three URLs above go in the privacy,
   support and vendor fields.
6. **Retake the screenshots inside real Confluence** before submitting. The
   current ones are the real UI but have no Confluence chrome around them.
   Do this once the production build is installed on a site.
7. **Submit for approval.** Atlassian takes 10 to 15 business days. Free apps
   are reviewed the same as paid ones.

## The one open technical question

Export. Print a page with a diagram to PDF, and separately export to Word.
The app deliberately does not declare `adfExport`. Atlassian's bug
CONFCLOUD-83083 says declaring it degrades PDF but fixes Word; community
reports say the opposite about PDF. Only this test settles it. Both fixes are
written up in README.md under "Still outstanding: export".

## Honest read on the odds

About 2.6% of new apps reach 100 installs. There are at least ten Mermaid apps
on the Marketplace, not eight as the original research said. The best-rated
competitor (weweave, 2,156 installs, 4.6 stars, paid) already has live preview,
templates and theming, so that is not a differentiator against them.

The actual opening is narrower and still real: the **free** slot is held by
Atlassian Labs' app at 7,408 installs and a 2.99 rating, with specific
complaints this app fixes. Being the better free option is the whole bet.

## Commands worth keeping

```bash
cd ~/Downloads/mermaid-app

NODE_ENV=development npm install --include=dev --ignore-scripts
NODE_ENV=production npm run build
npm test
node validate-manifest.mjs

export FORGE_DISABLE_ANALYTICS=true
export FORGE_EMAIL="akalbaari@gmail.com"
export FORGE_API_TOKEN="<a fresh token>"
./node_modules/.bin/forge deploy -e production
./node_modules/.bin/forge install -e production -p confluence -s akalbaari.atlassian.net
```

Three Mac quirks that will bite again: `NODE_ENV=production` is set in the
shell and makes npm skip devDependencies; `@forge/cli`'s install script fails
looking for `ts-node`, so use `--ignore-scripts`; and several `forge` commands
refuse to run without a real terminal, so wrap them:
`{ sleep 2; printf '\n'; sleep 60; } | script -q /dev/null bash -lc '...'`

GitHub CLI lives at `~/.local/bin/gh` and is already authenticated.
