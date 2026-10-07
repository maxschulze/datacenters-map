# Heiße-Luft-Karte

*Map of data centers in Germany*

https://okfde.github.io/datacenters-map/

data is exported from the [Data Center Database API](https://github.com/LeitmotivDigital/dc-db-client)
via [`lm-dc-db-client`](https://www.npmjs.com/package/lm-dc-db-client).

## Setup

```bash
pnpm install
cp .env.example .env.local
# set BASE_URL and API_KEY
```

## Data pipeline

```bash
pnpm build:data   # → public/data/datacenters.geojson + datacenters.csv
```

Exports records whose `data_source` is `Data Center Rebellion (Germany dataset)` and that have coordinates (active and dismissed). Operational sites additionally need a `commissioning_date` year ≥ 2026.

A GitLab pipeline schedule runs `pnpm build:data` daily (00:00 UTC, [.gitlab-ci.yml](.gitlab-ci.yml)). It commits only when the GeoJSON/CSV content changed (ignoring `fetched_at`); the push triggers the Coolify redeploy. Requires CI/CD variables `BASE_URL` and `API_KEY`, and job-token push access enabled on the project.

The GitHub Actions workflows in `.github/` are upstream's (GitHub Pages deploy + daily update) and stay disabled on our fork.

## Deployment

https://map.heisseluft.org, embedded on heisseluft.org. Coolify (team Heisseluft) builds the [Dockerfile](Dockerfile) on every push to `main` on GitLab: a static `vite build` served by nginx ([deploy/nginx.conf](deploy/nginx.conf)), health check at `/healthz`.

## Remotes

| Remote | URL | Role |
|--------|-----|------|
| `origin` | `ssh://git@gitlab.naughty-narwhal.coolify.ided.digital:2222/heisseluft/datacenters-map.git` | Primary; deployed by Coolify |
| `github` | `git@github.com:maxschulze/datacenters-map.git` | Our fork, for PRs to upstream |
| `upstream` | `https://github.com/okfde/datacenters-map.git` | okfde original, fetch only |

```bash
git remote add github git@github.com:maxschulze/datacenters-map.git
git remote add upstream https://github.com/okfde/datacenters-map.git
git remote set-url --push upstream DISABLED

scripts/sync-upstream.sh   # merge upstream/main, push to origin + github
git push origin main && git push github main   # after your own changes
```

Upstream also commits a data export every night, so merges conflict on the two generated data files; `sync-upstream.sh` resolves those to upstream's version and stops on any other conflict. To send changes upstream, push a branch to `github` and open a PR against `okfde/datacenters-map`.

## Dev / build

```bash
pnpm dev
pnpm build
```

## URL parameters

| Param | Values | Effect |
|-------|--------|--------|
| `start` | `cover` (default), `story` / `intro`, `explore` | Entry mode |
| `scene` | `intro`, `status`, `energy`, `energyGas`, `water`, `waterStress`, `waterBaruth`, `bigtech`, `bigtechSearch`, `protests`, `protestsLayer`, `outro`, `outroFaq` | Story scene |
| `status` | comma list | Filter `operational_status` (`unknown` = null) |
| `protest` | `1` / `0` | Protest sites only |
| `view` | `icon` (default) / `floor` / `site` / `power` | Clustered rack icons, circle by building area (ha), site area (ha), or power |
| `q` | text | Search |
| `feature` | UUID | Open detail panel |

The map keeps these in its own URL as you use it (`replaceState`). When embedded in an iframe it also posts every change to the parent page as `{ type: "heisseluft-map:state", search }`, where `search` is the query string with `start` always included. heisseluft.org's `map-embed.js` mirrors that into its address bar and forwards the same parameters from its own URL into the iframe, so links like `heisseluft.org/?feature=<uuid>` open the map on one data center.

