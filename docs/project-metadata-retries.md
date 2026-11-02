# Project metadata collection and Pages outcomes

The existing Pages build still collects public repository metadata, retains the
last valid snapshot on collection failure, validates/builds, then deploys. No
credentials, new secret, scheduler or hosting service is added. Codex credentials
and its local daily collection are unchanged.

Requests remain sequential. Each repository has at most three attempts and each
request keeps the existing 30-second timeout. All repositories together share a
120-second retry-wait budget. Network/timeout/5xx errors wait 2 then 4 seconds.
An unexplained 403 is retried once after 60 seconds; a known permission 403 or 401/404
fails immediately. A secondary limit without headers waits at least 60 seconds,
then uses exponential backoff. Retry-After (seconds or HTTP date) and primary
rate-limit reset deadlines are honored; if the required wait exceeds the remaining
budget, collection stops instead of retrying earlier than permitted.

Each safe JSON event contains Beijing time, collection stage, repository,
attempt, failure category, HTTP status, and retry wait/stop decision. Successful
recovery logs `retry_succeeded`; an exhausted failure logs `snapshot_retained`.
Raw response bodies, headers, error messages and credentials are never logged or
saved. A 403 without supporting evidence remains `http_403_unclassified`, not an
invented diagnosis of rate limiting or authentication expiry.

If any repository fails, the entire previous project list and updatedAt remain;
lastAttemptAt advances, status becomes stale/unavailable, and error records the
safe category, repository, HTTP status, attempts and stop reason. No partially
refreshed list is published. The collector exits nonzero and emits an Actions
warning; Pages continues using valid fallback data, and report remains failed.
A recovered retry exits successfully without suppressing a genuine final failure.

The existing report job now writes a table to the Actions summary with separate
contribution/project/analytics collection, build and Pages deployment outcomes.
Collection failure plus deployment success is explicitly reported as such;
deployment/build failure is distinct. The report still exits nonzero for final
collection failure or unsuccessful build/deployment. Daily analytics-only runs
continue to skip the GitHub/project collectors.

Reference: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
