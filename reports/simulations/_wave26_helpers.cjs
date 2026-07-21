const MIN_MINUTES=5,MAX_MINUTES=1440,DEFAULT_MINUTES=60,MAX_MATCHERS=12;
const NAME_RE=/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
const MATCH_EVERYTHING_VALUES=new Set(['','.*','.+','.*?','^.*$']);
function validateMatchers(input) {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'matchers_required' };
  if (input.length > MAX_MATCHERS) return { ok: false, error: 'too_many_matchers' };
  const out = [];
  let hasNarrowing = false;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_matcher' };
    const m = raw ;
    const name = typeof m.name === 'string' ? m.name.trim() : '';
    const value = typeof m.value === 'string' ? m.value : '';
    const isRegex = m.isRegex === true;
    const isEqual = m.isEqual !== false;
    if (!NAME_RE.test(name)) return { ok: false, error: `invalid_matcher_name:${name}` };
    if (value.length > 512) return { ok: false, error: 'matcher_value_too_long' };
    if (isRegex) {
      try { new RegExp(value); } catch { return { ok: false, error: 'invalid_regex' }; }
    }
    const isMatchAll = isRegex && isEqual && MATCH_EVERYTHING_VALUES.has(value);
    if (!isMatchAll) hasNarrowing = true;
    out.push({ name, value, isRegex, isEqual });
  }
  if (!hasNarrowing) return { ok: false, error: 'match_everything_forbidden' };
  return { ok: true, matchers: out };
}

function clampDurationMinutes(v) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
}

function buildMatchersFromAlert(payload) {
  const matchers = [];
  if (typeof payload.alertname === 'string' && NAME_RE.test(payload.alertname)) {
    matchers.push({ name: 'alertname', value: payload.alertname, isRegex: false, isEqual: true });
  }
  if (payload.labels && typeof payload.labels === 'object' && !Array.isArray(payload.labels)) {
    for (const [k, v] of Object.entries(payload.labels )) {
      if (!NAME_RE.test(k)) continue;
      if (typeof v !== 'string' || v.length === 0 || v.length > 512) continue;
      // Skip volatile/noisy labels that would over-narrow OR broaden silence
      if (k === 'instance' || k === '__name__') continue;
      matchers.push({ name: k, value: v, isRegex: false, isEqual: true });
      if (matchers.length >= MAX_MATCHERS) break;
    }
  }
  return matchers;
}

module.exports={validateMatchers,clampDurationMinutes,buildMatchersFromAlert};