# Weekly maintenance contract

Repository hilt21/aboutMe, branch main. Website https://hilt21.github.io/aboutMe/.

The user authorizes the ChatGPT task to refresh public contributions and engineering/AI highlights, commit changes and publish through the Pages workflow. Do not change biography, contacts, career claims, train or design.

1. Read current main, this contract, profile.json, github.json, projects.json and pages.yml. Do not use a stale local checkout.
2. Review hilt21 public repositories and current selections. Prioritize railway/engineering automation, industrial AI, agent harnesses, knowledge systems and demonstrated technical work. Inspect README, source/build configuration and deployment evidence. Stars and pushes do not prove maturity.
3. Refresh metadata with scripts/sync-projects.mjs and contributions with scripts/sync-github.mjs. These use public sources without credentials. If local networking is unavailable, review with connected GitHub tools and push a verified curated change or dated maintenance record so the push pipeline performs authoritative collection.
4. Keep the retained project records unless evidence supports improvement, following the existing schema. Project presentation is maintained independently in Project Atlas; keep the profile's index link and accepted layout. Update curated English and Chinese together. Preserve uncertainty in maturity; never add private data or unverified claims.
5. Validate, commit to main, and follow the exact commit's workflow. Inspect any newer data commit written by the workflow. Check collection and deployment, not just queue status. Report source commit, URL, data timestamps and selection changes.
6. If no editorial changes, append one concise entry to docs/maintenance-log.md to trigger fresh collection/build. This is an operational record, not an attempt to create artificial contribution activity.
7. On failure, preserve snapshots and report the actual blocker. Do not claim an update without deployment success. If Pages is disabled, report that setting. Do not silently change hosts.

Active recurring scheduler: ChatGPT, Monday mornings in Asia/Shanghai, starting 2026-10-26. It reviews the engineering/AI selection and triggers data refresh through a verified commit. GitHub Actions runs only on push or manual dispatch and remains the sole deployment pipeline. Do not add a second cron scheduler.

### Site Insights scope exception (approved 2026-10-26)
The Pages workflow has one daily 04:20 UTC telemetry-only schedule for
Cloudflare Web Analytics. It skips GitHub contributions and project selection.
This intentionally updates the previous no-GitHub-cron restriction for telemetry
while keeping the Monday ChatGPT editorial scheduler unchanged. Only
GitHub Actions deploys Pages.

### Codex local daily sync exception (approved 2026-10-27)

A local Mac LaunchAgent checks the latest 21:00 Asia/Shanghai deadline and catches
up after sleep/login. It may push validated, changed Codex aggregate snapshots
directly to main; acquisition timestamps alone never trigger publication.
No credentials leave the Mac. This does not alter editorial scheduling or add a
cloud collector. GitHub Actions remains the sole release pipeline.
See `docs/activity-daily-sync.md` for operation and failure boundaries.
