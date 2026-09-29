# Framed: development plan

- **Status:** accepted
- **Date:** 2026-09-29

## 1. Vision

Framed replaces the printed wall label in art galleries with an NFC card. A visitor taps the
card with their phone and the artwork opens in their language, with accessibility options, the
full story behind the piece and, when the gallery allows it, its price. They can share it, save
it for later and tell the gallery they are interested in buying it.

Framed is a **white-glove service**: the gallery sends its list of artworks, and Framed
translates the content, encodes the cards and hands them over ready to hang.

Portfolio goal: a public repository that shows production-grade engineering end to end
(product, data, auth, security, testing, CI/CD, documentation and a clean history).

## 2. Scope

### Users and zones

| Zone                 | Who                        | What they do                                                                                                          |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Operator console** | Framed operators           | Onboard galleries, import artworks (CSV), translate (AI proposes, human reviews), encode cards, print labels, publish |
| **Gallery portal**   | Gallery staff and admins   | See their artworks, mark them available/sold, edit prices, read analytics and leads                                   |
| **Public pages**     | Visitors (anonymous first) | Tap or scan, read in their language, accessibility options, share, save, "I'm interested"                             |

### In scope (MVP, v0.1–v0.4)

- Galleries only (museums later: price and leads are gallery features).
- Content: text and images. Languages: **ES, EN, FR, DE**.
- Cards encoded by Framed with a permanent random ID; a QR code on the printed label as fallback.
- A public **demo gallery** with public-domain artworks and scannable QR codes in the README.

### Out of scope (for now)

- Payments or checkout: buying art is a conversation, so Framed captures leads.
- Audio and video content.
- Native mobile apps: phones open NFC URLs in the browser natively.
- Museums, exhibitions/collections and offline mode (see roadmap).

### Business model (fictional, shapes the product)

One-off **setup fee per artwork** (card, translation, label) plus a **monthly fee per gallery**
(hosting, analytics, leads). No billing code: only a pricing section on the landing page.

## 3. Key flows

1. **Import:** the operator uploads the gallery's CSV. Rows are validated with Zod and shown as
   a preview with per-row errors before anything is saved.
2. **Translate:** for each artwork and language, AI proposes a translation. The operator
   reviews, edits and approves it. Nothing is published without approval.
3. **Encode:** an encoding station in the console (Android + Chrome, Web NFC). "Encode next"
   writes the card URL, locks the tag read-only and links it to the artwork.
4. **Print:** printable labels (PDF) with title, artist, year and a QR fallback.
5. **Visit:** `framed.app/t/<tagId>` resolves the tag, records an anonymous scan and redirects
   to the artwork page in the browser's language (switchable).
6. **Save and share:** saved artworks live in the browser; an optional magic link or passkey
   syncs them across devices. Each artwork has an Open Graph image for sharing.
7. **Lead:** "I'm interested" sends a rate-limited, validated inquiry to the gallery portal.
8. **Analytics:** scans per artwork, language and hour; most saved artworks; leads.

## 4. Stack

| Area          | Choice                                                                                   | Why                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| App           | Next.js 16 (App Router, Server Actions, Cache Components) · React 19 · TypeScript strict | One app, end-to-end types                                                |
| UI            | Tailwind CSS v4 · shadcn/ui                                                              | Accessible primitives, fast iteration                                    |
| Database      | **Neon Postgres**                                                                        | A database branch per PR: every preview gets isolated data               |
| Schema/ORM    | **Drizzle**                                                                              | Schema in TypeScript, versioned migrations, RLS declared with `pgPolicy` |
| Auth          | **Better Auth**                                                                          | Organizations plugin (multi-tenant + roles), passkeys, magic links       |
| Images        | **Vercel Blob** + `next/image`                                                           | Optimised artwork photos                                                 |
| i18n          | **next-intl**                                                                            | UI strings; translated content lives in the database                     |
| AI            | AI SDK v6 via AI Gateway · Zod-validated output                                          | Translation proposals reviewed by a human                                |
| Rate limiting | **Upstash Redis**                                                                        | Protects public endpoints (scans, leads)                                 |
| Quality       | Vitest · Playwright · axe · Lighthouse CI                                                | Unit, E2E, accessibility and performance gates                           |
| Observability | Sentry · Vercel Speed Insights                                                           | Errors and real-user performance                                         |

Each choice gets an ADR. Differences from the previous project (Supabase) are deliberate.

## 5. Architecture

Single Next.js app, route groups per zone:

```
src/app/(public)/t/[tagId]         tag resolver → artwork page
src/app/(public)/[locale]/a/[slug] public artwork page
src/app/(public)/[locale]/saved    saved artworks
src/app/(portal)/g/[gallery]/…     gallery portal
src/app/(console)/console/…        operator console
src/lib/<domain>/                  business logic (pure, unit tested)
src/db/                            Drizzle schema, migrations, RLS policies, seed
```

### Data model (first sketch)

| Table                      | Notes                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| `organizations`, `members` | Galleries and their staff (Better Auth organizations), roles `admin`/`staff`   |
| `artists`                  | Per gallery                                                                    |
| `artworks`                 | Title, year, medium, dimensions, price, availability, status (draft/published) |
| `artwork_translations`     | One row per artwork and locale; status proposed/approved                       |
| `artwork_images`           | Blob URLs, alt text per locale                                                 |
| `tags`                     | Random public ID (not sequential), status unassigned/assigned/retired, artwork |
| `tag_batches`              | Encoding batches per gallery                                                   |
| `scans`                    | Tag, locale, time. **No personal data**                                        |
| `saved_artworks`           | For visitors who opt in to an account                                          |
| `leads`                    | Artwork, contact, message, status                                              |

Tenant isolation is enforced in Postgres with RLS, tested with pgTAP-style tests in CI.

## 6. Environments

| Environment | App                | Database               | Deployed by                                            |
| ----------- | ------------------ | ---------------------- | ------------------------------------------------------ |
| Local       | `pnpm dev`         | Postgres in Docker     | developer                                              |
| CI          | GitHub Actions     | Ephemeral Postgres     | every PR                                               |
| Preview     | Vercel, one per PR | **Neon branch per PR** | Vercel + Neon integration                              |
| Production  | Vercel             | Neon `main`            | GitHub Actions, after CI and migrations, with approval |

## 7. Workflow

- **Trunk-based:** short-lived branches `<type>/<kebab-case>` from `main`. No commits or pushes
  to `main`.
- **Rebase merge:** every atomic commit lands on `main` in a linear history. Therefore every
  commit follows Conventional Commits (commitlint on each commit in CI, not only the PR title)
  and passes the checks.
- **Tests first:** new behaviour starts with a failing test, committed before or together with
  the implementation. The reviewer checks it.
- **Decisions** get an ADR in `docs/adr/`; incidents get a blameless post-mortem in
  `docs/incidents/`.
- **Releases:** semver tags and a generated CHANGELOG per version.

### Enforcement layers

| Layer              | Enforces                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Agent instructions | `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`                                                                         |
| Claude Code hooks  | No commit/push on `main`, no `--no-verify`, no force push; format on edit; session start/end checks                 |
| Claude permissions | No reading `.env*`, no production deploys or remote migrations                                                      |
| Git hooks          | Lint, format, related tests, commitlint, typecheck + unit tests on push                                             |
| CI                 | Format, lint, typecheck, unit, DB/RLS tests, build, E2E, axe, Lighthouse, coverage threshold, commitlint per commit |
| Security CI        | CodeQL, gitleaks, OSV scanner, actions pinned by SHA, Dependabot                                                    |
| Branch rules       | PR required, checks green, up to date, conversations resolved, rebase only, no force push                           |

## 8. Agent team

The main session is the **director**: it plans, writes briefs, delegates, reviews and integrates.
Small tasks it does itself; it delegates only when specialisation pays for the cold start.

| Agent               | Model  | Tools      | Owns                                                                          |
| ------------------- | ------ | ---------- | ----------------------------------------------------------------------------- |
| `db-engineer`       | Sonnet | read/write | Drizzle schema, migrations, RLS, indexes, seed, DB tests                      |
| `backend-engineer`  | Sonnet | read/write | Server Actions, route handlers, auth, validation, AI translation, rate limits |
| `frontend-engineer` | Sonnet | read/write | Pages, components, accessibility, i18n UI, performance                        |
| `qa-engineer`       | Sonnet | read/write | Unit and integration tests                                                    |
| `e2e-tester`        | Sonnet | read/write | Playwright flows, axe checks                                                  |
| `code-reviewer`     | Sonnet | read-only  | Diff review before every PR                                                   |
| `security-auditor`  | Sonnet | read-only  | OWASP review; mandatory when auth, RLS, secrets or public endpoints change    |

### Delegation protocol

- **Brief** (director → agent): goal, files in scope, files out of scope, acceptance criteria,
  commands that must pass.
- **Report** (agent → director): what changed (paths, not code dumps), test results, open
  questions, then the agent's canary token.

## 9. Session protocol

- **Start:** a SessionStart hook prints the latest handoff (`docs/sessions/`), `git status` and
  unpushed commits. The session states its goal in one line.
- **During:** one goal per session; if it grows, split it.
- **End:** write `docs/sessions/NNNN.md` (done, pending, decisions, next step). No unpushed
  commits and no orphan branches are left behind.

### Drift canaries

| Canary       | Rule                                                         | If missing                         |
| ------------ | ------------------------------------------------------------ | ---------------------------------- |
| Greeting     | Every director reply starts with "Chef"                      | Close handoff, start a new session |
| Agent token  | Every agent report ends with `[<ROLE>-ACK]`, e.g. `[DB-ACK]` | Reject the report and re-brief     |
| Handoff seal | Every handoff ends with `— end of handoff NNNN —`            | The handoff is incomplete          |

Canaries detect forgotten instructions; tests and CI are what prove the code is correct.

## 10. Roadmap

| Version  | Content                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| **v0.0** | Foundations: repo, tooling, agents, hooks, CI, security scanning, first ADRs, empty deploy                             |
| **v0.1** | Multi-tenant auth, operator console CRUD (galleries, artists, artworks, images), public artwork page, tag resolver, QR |
| **v0.2** | CSV import, 4 languages, AI translation with review, accessibility (WCAG 2.2 AA)                                       |
| **v0.3** | Encoding station (Web NFC), printable labels, demo gallery with public-domain works                                    |
| **v0.4** | Visitor: save, share (OG images), leads; gallery portal: leads and availability                                        |
| **v0.5** | Analytics for galleries                                                                                                |
| **v0.6** | NTAG 424 DNA signed URLs (SUN), offline PWA, exhibitions                                                               |

## 11. ADR backlog

1. Stack, environments and workflow (incl. rebase merge)
2. Neon + Drizzle instead of Supabase
3. Better Auth with organizations for multi-tenancy
4. Tenant isolation with Postgres RLS
5. Tag IDs: permanent random IDs, mapping in the database
6. Public URLs and locale resolution
7. AI translations as reviewed proposals
8. Visitor identity: anonymous first, optional account
9. Scan analytics without personal data
10. Rate limiting public endpoints
11. Security headers and CSP
12. Production deploy after migrations

## 12. Open questions

- Domain name for the public URLs (affects the encoded cards, so it must be decided before v0.3).
- Public-domain source for the demo gallery (Rijksmuseum or The Met API).
