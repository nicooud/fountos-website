---
created: "[[2026-07-16]]"
type: project-readme
status: active
project-lead: Nico
predecessor-context: "[[20-Areas/NicOS-Product/Brand/20260709 - Claude-Design-Briefing-FountOS-Website-v2-Definitief]]"
related:
  - "[[60-Decisions/2026/20260610 - fountos-website-opzet-besloten]]"
  - "[[60-Decisions/2026/20260709 - fountos-website-v2-darkmode-academy-roadmap]]"
  - "[[60-Decisions/2026/20260716 - fountos-website-light-first-dark-teruggedraaid]]"
---

# FountOS Website — repo (GitHub Pages)

Lokale working copy voor de FountOS-marketingsite. Tech-stack en repo-conventies zijn bewust gespiegeld op de Springcast-site (`20-Areas/Springcast/Website/Github/springcastio_/`), met **GitHub Pages** i.p.v. eigen server als hostingkeuze (besloten 16/7).

## Tech-stack (lokaal, geen build-step)

- **HTML5** — één bestand per pagina, plain markup
- **Tailwind CSS via CDN** — geen build-step in development
- **Vanilla JavaScript** — alleen voor interactie (drawer, accordion, form-validation), geen framework
- **i18n** — `/en/` (primair) en `/nl/` als aparte folders, root `index.html` redirect naar `/en/`

## Hosting: GitHub Pages

- **Bron:** repo-instellingen → Pages → Source: branch `main`, root (`/`)
- **Custom domain:** `CNAME`-bestand in deze repo bevat `fountos.com` — **verifieer dit tegen de definitieve domeinkeuze** vóór live-gang
- **DNS bij de registrar:** 4x A-record naar GitHub Pages IP's (185.199.108.153 / .109.153 / .110.153 / .111.153) + optioneel CNAME `www` → `<github-username>.github.io`. Daarna in repo-settings "Enforce HTTPS" aanvinken zodra DNS gepropageerd is.
- **Geen Jekyll-processing:** `.nojekyll` staat in de repo-root zodat GitHub Pages de site as-is serveert.

## Branch-strategie (zelfde patroon als Springcast)

- **`main`** = live (GitHub Pages deployt automatisch bij elke push naar `main`)
- **`dev`** = werkbranch, dagelijkse ontwikkeling
- **Naar live = via pull request `dev → main`.** Geen directe commits/pushes naar `main`.
- Verschil met Springcast: **geen handmatig deploy-script nodig** — GitHub Pages deployt zelf bij merge naar `main`.

## Wat nog moet gebeuren (buiten deze sandbox — geen GitHub-credentials hier)

1. GitHub-repo aanmaken (account/org nog te bepalen door Nico)
2. Deze map pushen: zie commando's onderaan
3. Repo-settings → Pages inschakelen (branch `main`, root)
4. DNS instellen bij de domeinregistrar van fountos.com
5. Placeholder-HTML in `en/index.html` en `nl/index.html` vervangen door de definitieve build (bron: Claude Design output + [[20-Areas/NicOS-Product/Brand/20260714 - Website-Copy-v2-Founder-First-EN]])

### Commando's om te pushen (uit te voeren op Nico's eigen Mac / via Claude Code, met eigen git-credentials)

```bash
cd "/pad/naar/deze/map/fountos-website"
git init -b main
git add .
git commit -m "chore: initial scaffold — plain HTML/Tailwind CDN/vanilla JS, GitHub Pages setup"
gh repo create <owner>/fountos-website --public --source=. --remote=origin --push
# of zonder gh CLI:
# git remote add origin https://github.com/<owner>/fountos-website.git
# git push -u origin main
git checkout -b dev
git push -u origin dev
```

## Status

Scaffold klaar (16/7). Wacht op: (a) definitieve HTML voor `en/`/`nl/` homepage, (b) GitHub-account/org-keuze, (c) DNS-toegang tot fountos.com. Uitvoeringsdetails/backlog van de bredere FountOS-website-build lopen via het Linear-project **FountOS Website** (v6.15) — dit repo-scaffold is puur de technische basis.

## Eigenaar

Nico. Bouw/uitvoering via Claude Code op eigen machine (repo leeft straks ook op GitHub, niet alleen in de vault).
