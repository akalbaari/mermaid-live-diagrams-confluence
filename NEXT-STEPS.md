# Where this stands and what is left

Written 20 September 2026. Read this first if you come back to this cold.

## What exists

| Thing | State |
|---|---|
| The app | Built, tested, deployed |
| Atlassian app id | `ari:cloud:ecosystem::app/9a59ac4a-d78d-4849-b744-b4192a4a5738` |
| App name | Mermaid Live Diagrams |
| Deployed to | `development` environment, v2.1.0 |
| Installed on | akalbaari.atlassian.net (Confluence) |
| Developer Space | "Adam Albaari" |
| Source | `~/Downloads/mermaid-app`, committed to git |
| Listing copy | `marketing/listing.md`, every field inside Atlassian's limits |
| Listing images | `marketing/out/`, all at required pixel sizes |
| Vendor site | **Live** at https://akalbaari.github.io/mermaid-live-diagrams-confluence/ |
| Repo | https://github.com/akalbaari/mermaid-live-diagrams-confluence |
| Marketplace listing | **Does not exist.** Nobody can find the app |

## What is left, in order

1. ~~Push to GitHub and turn on Pages.~~ **Done 20 Sep 2026.** Live URLs:
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/privacy.html
   - https://akalbaari.github.io/mermaid-live-diagrams-confluence/support.html
2. **New Atlassian API token.** The old one was revoked, correctly. Make one at
   id.atlassian.com/manage-profile/security/api-tokens
3. **Deploy to the production environment.** `forge deploy -e production`.
   Only `development` has been deployed so far.
4. **Marketplace partner profile.** Identity, so it has to be Adam.
   marketplace.atlassian.com
5. **Create the listing**, link the Forge app, paste the copy, upload the images.
6. **Submit for approval.** Atlassian takes 10 to 15 business days. Free apps
   are reviewed the same as paid ones.
7. **Retake the screenshots inside real Confluence** before submitting. The
   current ones are the real UI but have no Confluence chrome around them.

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

# build and test
NODE_ENV=development npm install --include=dev --ignore-scripts
NODE_ENV=production npm run build
npm test
node validate-manifest.mjs

# deploy (needs a fresh token in the environment)
export FORGE_DISABLE_ANALYTICS=true
export FORGE_EMAIL="akalbaari@gmail.com"
export FORGE_API_TOKEN="<new token>"
./node_modules/.bin/forge deploy -e development
./node_modules/.bin/forge install -e development -p confluence -s akalbaari.atlassian.net
```

Three Mac quirks that will bite again: `NODE_ENV=production` is set in the
shell and makes npm skip devDependencies; `@forge/cli`'s install script fails
looking for `ts-node`, so use `--ignore-scripts`; and several `forge` commands
refuse to run without a real terminal.
