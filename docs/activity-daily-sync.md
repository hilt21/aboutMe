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

## Operational logs and publication status

New log lines are JSON with `time_beijing` (explicit +08:00), `run_id`, `stage`,
`event`, `scheduled_day`, attempt number and `retry_result`. Command failures log
only a safe stage, exit code and failure category, never command stderr or
credentials. The final retry result is `succeeded`, `failed`, `pending` (first
failure awaiting retry), or `not_needed`. Concurrent-lock skips have a timestamp
and lock stage but cannot safely read the other process's state.

`published_this_run` means this invocation successfully pushed a snapshot.
`publication_day` is a Beijing civil date, distinct from the 21:00 schedule day.
`published_today` is cumulative for this local sync task on that civil day:
true means a snapshot push is known, false means no push recorded since a known
new-day boundary, and null means unknown. An unchanged repeat can therefore log
`published_this_run:false, published_today:true`. These fields describe GitHub
submission, not Pages completion; continue checking Actions for deployment status.

Before pushing, the task atomically records the pending snapshot commit locally.
If push times out, the next fetch checks whether origin/main contains that exact
commit. Confirmation logs `previous_push_confirmed_remote` and preserves the day
publication flag without falsely claiming a second push. A cross-midnight timeout
cannot establish which civil day accepted the push and stays unknown unless an
actual current-day push is known. Pending snapshot-only retry and all existing
dirty-check/validation/publication safeguards remain in place.

Legacy `published:true` can establish a same-day publication. Legacy false cannot
establish absence of a prior push, so it migrates to null. Old logs are retained
unchanged; missing historical timestamps are not reconstructed. State and pending
commit metadata remain local and use the existing atomic state file.
