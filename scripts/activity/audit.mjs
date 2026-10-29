import { randomUUID } from 'node:crypto';

// Local operational metadata only; never include command output or credentials.
export function beijingTime(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600000).toISOString().replace('Z', '+08:00');
}

export function createAudit(state, now = () => new Date(), output = console.log) {
  const today = beijingTime(now()).slice(0, 10);
  if (!state.publication_day) {
    // A legacy false is only a per-run result, not proof of no publication that day.
    state.publication_day = state.last_checked_at ? beijingTime(new Date(state.last_checked_at)).slice(0, 10) : today;
    state.published_today = state.published === true ? true : null;
  }
  if (state.publication_day !== today) {
    state.publication_day = today;
    state.published_today = state.pending_publication ? null : false;
  }
  delete state.published;
  let publishedThisRun = false;
  let stage = 'schedule';
  let retry = false;
  let retryResult = 'not_needed';
  const runId = randomUUID();
  state.published_this_run = false;
  const emit = (event, details = {}) => {
    const day = beijingTime(now()).slice(0, 10);
    if (state.publication_day !== day) {
      state.publication_day = day;
      state.published_today = state.pending_publication ? null : false;
    }
    output(JSON.stringify({
    run_id: runId,
    time_beijing: beijingTime(now()), stage, event,
    scheduled_day: state.attempt_day ?? state.completed_day ?? null,
    attempt: state.attempt_number ?? 0, retry_result: retryResult,
    published_this_run: publishedThisRun,
    publication_day: state.publication_day, published_today: state.published_today,
    ...details,
    }));
  };
  return {
    emit,
    stage(value) { stage = value; emit('started'); },
    begin(day) {
      retry = ['failed', 'running'].includes(state.last_result) || Boolean(state.pending_publication);
      state.attempt_number = retry ? (state.attempt_number ?? 0) + 1 : 1;
      state.attempt_day = day;
      retryResult = retry ? 'in_progress' : 'not_needed';
      state.last_result = 'running';
      delete state.failure_stage;
      emit(retry ? 'retry_started' : 'run_started');
    },
    beforePush(commit) {
      state.pending_publication = { commit, attempted_day: beijingTime(now()).slice(0, 10) };
      emit('push_pending', { commit });
    },
    pushed(confirmedRemote = false) {
      const pending = state.pending_publication;
      const day = beijingTime(now()).slice(0, 10);
      if (state.publication_day !== day) { state.publication_day = day; state.published_today = false; }
      // Across midnight a timed-out push has no proven civil-day publication time.
      if (!confirmedRemote || pending.attempted_day === day) state.published_today = true;
      else if (state.published_today !== true) state.published_today = null;
      publishedThisRun ||= !confirmedRemote;
      state.last_publication = { commit: pending.commit, confirmed_at: now().toISOString(), outcome: confirmedRemote ? 'confirmed_remote' : 'pushed' };
      delete state.pending_publication;
      emit(confirmedRemote ? 'previous_push_confirmed_remote' : 'push_succeeded', { commit: pending.commit });
    },
    finish(result, emitResult = true) {
      state.last_result = result;
      state.published_this_run = publishedThisRun;
      state.retry_result = retry ? (result === 'failed' ? 'failed' : 'succeeded') : (result === 'failed' ? 'pending' : 'not_needed');
      retryResult = state.retry_result;
      if (result === 'failed' && state.pending_publication && state.published_today !== true) state.published_today = null;
      if (emitResult) emit(result === 'failed' ? 'run_failed' : 'run_completed', result === 'failed' ? { failed_stage: state.failure_stage ?? stage } : {});
    },
  };
}
