export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatWhen(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return '—';
  }

  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function viewerSharedStyles() {
  return `
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #0b1020; color: #e8ecf5; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; }
    h2 { margin: 24px 0 12px; font-size: 18px; }
    .muted { color: #98a2b8; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    a { color: #8ec5ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code, .cmd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    code { background: #182038; padding: 2px 6px; border-radius: 6px; }
    .badge { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 999px; display: inline-block; }
    .badge.open { background: #1a2f4d; color: #8ec5ff; }
    .badge.closed { background: #12351f; color: #7dffb2; }
    .badge.aborted { background: #3a1414; color: #ff8d8d; }
    .badge.pass { background: #12351f; color: #7dffb2; }
    .badge.fail { background: #3a1414; color: #ff8d8d; }
    .badge.unknown { background: #2a2a2a; color: #ddd; }
    .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin: 16px 0; }
    .toolbar input[type="search"] {
      flex: 1 1 280px; min-width: 200px; padding: 10px 12px; border-radius: 10px;
      border: 1px solid #2a3555; background: #121829; color: #e8ecf5;
    }
    .btn {
      display: inline-block; padding: 8px 14px; border-radius: 999px; border: 1px solid #2a3555;
      background: #182038; color: #e8ecf5; text-decoration: none; font-size: 13px;
    }
    .btn.primary { background: #24304d; border-color: #4b6ea8; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #24304d; vertical-align: top; }
    th { color: #98a2b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .pill { background: #182038; border: 1px solid #2a3555; border-radius: 999px; padding: 4px 10px; font-size: 12px; }
    .empty { margin-top: 24px; padding: 16px; border: 1px dashed #2a3555; border-radius: 12px; }
    .report-frame { width: 100%; min-height: 720px; border: 1px solid #2a3555; border-radius: 12px; background: #000; margin-top: 12px; }
    .trace-cmd { display: block; margin-top: 6px; padding: 8px 10px; background: #0a0f1a; border: 1px solid #223055; border-radius: 8px; font-size: 12px; word-break: break-all; }
    .hidden { display: none !important; }
  `;
}

export function viewerSearchScript() {
  return `<script>
(function () {
  var input = document.getElementById('session-search');
  if (!input) return;
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-session-row]'));
  var empty = document.getElementById('search-empty');
  function filter() {
    var query = input.value.trim().toLowerCase();
    var visible = 0;
    rows.forEach(function (row) {
      var haystack = (row.getAttribute('data-search') || '').toLowerCase();
      var show = !query || haystack.indexOf(query) !== -1;
      row.classList.toggle('hidden', !show);
      if (show) visible += 1;
    });
    if (empty) empty.classList.toggle('hidden', visible > 0 || rows.length === 0);
  }
  input.addEventListener('input', filter);
})();
</script>`;
}
