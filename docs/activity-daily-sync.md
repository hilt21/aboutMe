# Local daily Codex sync

Approved 2026-10-27: collect at 21:00 Asia/Shanghai, catch up after sleep/login,
and publish only changed aggregate statistics through the existing Pages workflow.

`scripts/activity/daily.mjs` runs in a dedicated main-branch checkout. Set
`ACTIVITY_SYNC_STATE` to an absolute local state file outside Git. The macOS
LaunchAgent runs at login and every five minutes; a Shanghai civil-day gate picks
the most recent 21:00 deadline. This avoids dependence on the Mac's timezone.
Missed days coalesce into one latest collection. It does not wake a sleeping Mac.
The Mac must be logged in, awake, online, and able to access its existing Codex
and Git keychain authentication. No credentials are copied into the repository,
LaunchAgent, logs, Actions secrets or browser services.

Each run holds an exclusive local lock, fast-forwards main, invokes the existing
official App Server collector, validates the snapshot and commits only
`src/data/chatgpt-activity.json`. Comparison includes source, metric, timezone,
summary and sorted daily date/value pairs, excluding acquisition timestamps and
stats cutoff metadata. Unknown stays distinct from zero. An unchanged collection
restores the previous published snapshot and records the local check time only.

Only changed statistics trigger a Git push. Existing Pages checks/build/deploy
remain the sole publishing path. The schedule gate is marked complete after a
successful collection and push (or no-change result), not after remote deployment.
Inspect Actions for deployment errors; no-change days do not re-run a failed
deployment. Retry that workflow through GitHub when needed.

Failures retry on the next five-minute invocation. An unpushed snapshot-only
commit is retried; unexpected dirty files, branch changes, divergence or stale
locks stop publication for manual inspection. Do not blindly delete locks or
force-push. A process killed mid-collection may leave a dirty snapshot/lock.
Logs and state remain local. `--force` bypasses the daily gate for a manual test;
it does not bypass the statistics comparison or validation.

Local installation: `~/Library/LaunchAgents/dev.hilt21.aboutme-codex-sync.plist`.
Disable with `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/dev.hilt21.aboutme-codex-sync.plist`.
The dedicated checkout and state directory are separate from the development
checkout. Node dependencies are installed from the repository lockfile.
