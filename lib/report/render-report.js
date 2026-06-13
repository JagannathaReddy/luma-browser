import { readFile } from 'fs/promises';
import { join } from 'path';
import { consoleLevelClass, parseConsoleJsonl, summarizeConsole } from './console-summary.js';
import { formatBytes, harStatusClass, summarizeHar } from './har-summary.js';
import { decodeTraceZip } from './trace-decode.js';
import { getPackageVersion } from '../version.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return '—';
  }
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatMs(ms) {
  if (!ms || ms <= 0) {
    return '—';
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function readArtifactText(content, maxLength = 4000) {
  if (!content) {
    return '';
  }
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}\n… truncated …`;
}

function prettyJson(value, maxLength = 6000) {
  if (value === null || value === undefined) {
    return '';
  }
  try {
    return readArtifactText(JSON.stringify(value, null, 2), maxLength);
  } catch {
    return String(value);
  }
}

function shortenUrl(url, maxLength = 72) {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength - 1)}…`;
}

export async function renderSessionReport(sessionDir, results) {
  const steps = await Promise.all(
    results.steps.map(async (step) => {
      const stepDir = join(sessionDir, step.dir);
      const stdout = await readFile(join(stepDir, 'stdout.txt'), 'utf8').catch(() => '');
      const stderr = await readFile(join(stepDir, 'stderr.txt'), 'utf8').catch(() => '');
      const script = await readFile(join(stepDir, 'script.js'), 'utf8').catch(() => '');
      const consoleText = await readFile(join(stepDir, 'console.jsonl'), 'utf8').catch(() => '');
      const harText = await readFile(join(stepDir, 'network.har'), 'utf8').catch(() => '');
      const exportedScript = step.exportedScript
        ? await readFile(join(stepDir, step.exportedScript), 'utf8').catch(() => '')
        : '';

      const consoleSummary = summarizeConsole(parseConsoleJsonl(consoleText));
      const harSummary = summarizeHar(harText);

      let traceActions = [];
      const traceFile = step.artifacts?.trace ?? 'trace.zip';
      try {
        traceActions = await decodeTraceZip(join(stepDir, traceFile));
      } catch {
        traceActions = [];
      }

      return {
        ...step,
        stdout,
        stderr,
        script,
        consoleSummary,
        harSummary,
        traceActions,
        exportedScript,
        screenshotPath: step.artifacts?.screenshot
          ? join(step.dir, step.artifacts.screenshot)
          : null,
        tracePath: step.artifacts?.trace ? join(step.dir, step.artifacts.trace) : null,
        harPath: step.artifacts?.har ? join(step.dir, step.artifacts.har) : null,
        videoPath: step.artifacts?.video ? join(step.dir, step.artifacts.video) : null,
      };
    }),
  );

  return buildHtml({ results, steps });
}

function buildFilmstrip(steps) {
  if (steps.length === 0) {
    return '<p class="muted">No steps recorded.</p>';
  }

  return steps
    .map((step, index) => {
      const statusClass =
        step.success === false ? 'fail' : step.success === true ? 'pass' : 'unknown';
      const label = escapeHtml(step.name);
      const thumb = step.screenshotPath
        ? `<img src="${escapeHtml(step.screenshotPath)}" alt="${label}" loading="lazy" />`
        : `<span class="filmstrip-placeholder">${label.slice(0, 1).toUpperCase()}</span>`;

      return `<a href="#step-${index}" class="filmstrip-item ${statusClass}" title="${label}">${thumb}<span class="filmstrip-label">${label}</span></a>`;
    })
    .join('');
}

function buildConsolePanel(step, index) {
  const { entries, total, counts } = step.consoleSummary;
  if (total === 0) {
    return '<p class="muted">No browser console output captured.</p>';
  }

  const filterButtons = [
    ['all', `All (${total})`],
    ['error', `Errors (${(counts.error ?? 0) + (counts.pageerror ?? 0)})`],
    ['warning', `Warnings (${counts.warning ?? 0})`],
    ['info', `Info (${counts.info ?? 0})`],
    ['log', `Log (${counts.log ?? 0})`],
    ['debug', `Debug (${counts.debug ?? 0})`],
  ]
    .map(
      ([level, label], buttonIndex) =>
        `<button type="button" class="${buttonIndex === 0 ? 'active' : ''}" data-level="${level}">${escapeHtml(label)}</button>`,
    )
    .join('');

  const lines = entries
    .map((entry) => {
      const type = entry.type ?? 'log';
      const filterLevel = type === 'pageerror' ? 'error' : type;
      const location = entry.location
        ? `${entry.location.url ?? ''}:${entry.location.lineNumber ?? ''}`
        : (entry.pageUrl ?? '');
      return `<div class="console-entry ${consoleLevelClass(type)}" data-level="${escapeHtml(filterLevel)}">
  <span class="console-type">${escapeHtml(type)}</span>
  <span class="console-text">${escapeHtml(entry.text ?? '')}</span>
  ${location ? `<span class="console-loc muted">${escapeHtml(location)}</span>` : ''}
</div>`;
    })
    .join('');

  return `<div class="console-panel" id="console-step-${index}">
  <div class="console-toolbar">${filterButtons}</div>
  <div class="console-entries">${lines}</div>
</div>`;
}

function buildHarPanel(step) {
  const { entries, total, failed } = step.harSummary;
  if (total === 0) {
    return '<p class="muted">No network activity captured.</p>';
  }

  const rows = entries
    .map((entry) => {
      const statusClass = harStatusClass(entry.status);
      return `<details class="har-entry ${statusClass}">
  <summary>
    <span class="har-method">${escapeHtml(entry.method)}</span>
    <span class="har-url" title="${escapeHtml(entry.url)}">${escapeHtml(shortenUrl(entry.url))}</span>
    <span class="har-status">${entry.status || '—'}</span>
    <span class="har-type muted">${escapeHtml(entry.mimeType)}</span>
    <span class="har-size muted">${escapeHtml(formatBytes(entry.size))}</span>
    <span class="har-time muted">${escapeHtml(formatMs(entry.durationMs))}</span>
  </summary>
  <div class="har-detail">
    <h4>Request</h4>
    <pre>${escapeHtml(prettyJson(entry.request))}</pre>
    <h4>Response</h4>
    <pre>${escapeHtml(prettyJson(entry.response))}</pre>
  </div>
</details>`;
    })
    .join('');

  return `<p class="muted">${total} request${total === 1 ? '' : 's'} · ${failed} failed</p>
<div class="har-list">${rows}</div>`;
}

function buildTracePanel(step) {
  if (step.traceActions.length === 0) {
    return '<p class="muted">No traced Playwright actions decoded.</p>';
  }

  const rows = step.traceActions
    .map((action) => {
      const error = action.error
        ? `<div class="trace-error">${escapeHtml(prettyJson(action.error, 500))}</div>`
        : '';
      return `<tr>
  <td><code>${escapeHtml(action.apiName)}</code></td>
  <td>${escapeHtml(formatMs(action.durationMs))}</td>
  <td><pre class="inline">${escapeHtml(prettyJson(action.params, 1200))}</pre>${error}</td>
</tr>`;
    })
    .join('');

  return `<table class="trace-table">
  <thead><tr><th>Action</th><th>Duration</th><th>Params</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildMediaBlock(step) {
  const screenshot = step.screenshotPath
    ? `<img class="screenshot" src="${escapeHtml(step.screenshotPath)}" alt="Step screenshot" />`
    : '<div class="screenshot placeholder muted">No screenshot</div>';

  const video = step.videoPath
    ? `<video class="step-video" controls preload="metadata"${step.screenshotPath ? ` poster="${escapeHtml(step.screenshotPath)}"` : ''} src="${escapeHtml(step.videoPath)}"></video>`
    : '';

  if (!video) {
    return `<div class="media-single">${screenshot}</div>`;
  }

  return `<div class="media-grid">${screenshot}${video}</div>`;
}

function buildStepCard(step, index) {
  const statusClass = step.success === false ? 'fail' : step.success === true ? 'pass' : 'unknown';
  const statusLabel = step.success === false ? 'FAIL' : step.success === true ? 'PASS' : 'UNKNOWN';
  const consoleCount = step.consoleSummary.total;
  const networkCount = step.harSummary.total;
  const traceCount = step.traceActions.length;

  const artifactLinks = [
    step.tracePath ? `<a href="${escapeHtml(step.tracePath)}">trace.zip</a>` : null,
    step.harPath ? `<a href="${escapeHtml(step.harPath)}">network.har</a>` : null,
    step.videoPath ? `<a href="${escapeHtml(step.videoPath)}">video.webm</a>` : null,
    step.exportedScript
      ? `<a href="${escapeHtml(join(step.dir, step.exportedScript))}">exported.spec.js</a>`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `
<section class="step ${statusClass}" id="step-${index}">
  <header>
    <div>
      <h2>${escapeHtml(step.name)}</h2>
      <p class="muted">${escapeHtml(step.dir)} · ${formatDuration(step.startedAt, step.endedAt)} · ${traceCount} traced actions</p>
    </div>
    <span class="badge ${statusClass}">${statusLabel}</span>
  </header>
  ${step.error ? `<pre class="error">${escapeHtml(step.error)}</pre>` : ''}
  ${buildMediaBlock(step)}
  <nav class="step-tabs" aria-label="Step panels">
    <button type="button" class="active" data-tab="overview">Overview</button>
    <button type="button" data-tab="console">Console (${consoleCount})</button>
    <button type="button" data-tab="network">Network (${networkCount})</button>
    <button type="button" data-tab="trace">Trace (${traceCount})</button>
    <button type="button" data-tab="source">Source</button>
  </nav>
  <div class="tab-panel" data-panel="overview">
    <h3>Artifacts</h3>
    <p>${artifactLinks || '<span class="muted">No linked artifacts</span>'}</p>
    <h3>Stdout</h3>
    <pre>${escapeHtml(readArtifactText(step.stdout)) || '<span class="muted">empty</span>'}</pre>
    <h3>Stderr</h3>
    <pre>${escapeHtml(readArtifactText(step.stderr)) || '<span class="muted">empty</span>'}</pre>
    ${
      step.exportedScript
        ? `<h3>Exported Playwright script</h3><pre>${escapeHtml(step.exportedScript)}</pre>`
        : ''
    }
  </div>
  <div class="tab-panel hidden" data-panel="console">${buildConsolePanel(step, index)}</div>
  <div class="tab-panel hidden" data-panel="network">${buildHarPanel(step)}</div>
  <div class="tab-panel hidden" data-panel="trace">${buildTracePanel(step)}</div>
  <div class="tab-panel hidden" data-panel="source">
    <h3>Script source</h3>
    <pre>${escapeHtml(step.script) || '<span class="muted">empty</span>'}</pre>
  </div>
</section>`;
}

function buildReportScript() {
  return `<script>
(function () {
  document.querySelectorAll('.step-tabs').forEach(function (tabs) {
    tabs.addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-tab]');
      if (!btn) return;
      var section = tabs.closest('.step');
      var tab = btn.getAttribute('data-tab');
      tabs.querySelectorAll('button[data-tab]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      section.querySelectorAll('.tab-panel').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== tab);
      });
    });
  });

  document.querySelectorAll('.console-panel').forEach(function (panel) {
    panel.addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-level]');
      if (!btn) return;
      var level = btn.getAttribute('data-level');
      panel.querySelectorAll('.console-toolbar button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      panel.querySelectorAll('.console-entry').forEach(function (entry) {
        var entryLevel = entry.getAttribute('data-level');
        var show = level === 'all' || entryLevel === level;
        entry.classList.toggle('hidden', !show);
      });
    });
  });
})();
</script>`;
}

function buildHtml({ results, steps }) {
  const title = results.name
    ? `${results.name} — luma-browser report`
    : 'luma-browser session report';
  const passed = steps.filter((step) => step.success === true).length;
  const failed = steps.filter((step) => step.success === false).length;
  const sessionDuration = formatDuration(results.startedAt, results.endedAt);
  const stepCards = steps.map((step, index) => buildStepCard(step, index)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #0b1020; color: #e8ecf5; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 24px; }
    header.hero { margin-bottom: 24px; }
    .meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    .pill { background: #182038; border: 1px solid #2a3555; border-radius: 999px; padding: 4px 10px; font-size: 12px; }
    .filmstrip { display: flex; gap: 10px; overflow-x: auto; padding: 12px 0 4px; margin-top: 12px; }
    .filmstrip-item { flex: 0 0 96px; text-decoration: none; color: inherit; border: 1px solid #2a3555; border-radius: 10px; overflow: hidden; background: #121829; }
    .filmstrip-item.pass { border-color: #1f5a37; }
    .filmstrip-item.fail { border-color: #703030; }
    .filmstrip-item img { display: block; width: 100%; height: 54px; object-fit: cover; background: #000; }
    .filmstrip-placeholder { display: flex; align-items: center; justify-content: center; height: 54px; font-weight: 700; background: #182038; }
    .filmstrip-label { display: block; font-size: 11px; padding: 4px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .step { background: #121829; border: 1px solid #24304d; border-radius: 14px; padding: 16px; margin-bottom: 16px; scroll-margin-top: 16px; }
    .step header { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    .badge { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 999px; }
    .badge.pass { background: #12351f; color: #7dffb2; }
    .badge.fail { background: #3a1414; color: #ff8d8d; }
    .badge.unknown { background: #2a2a2a; color: #ddd; }
    .media-single, .media-grid { margin-top: 12px; }
    .media-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .screenshot, .step-video { width: 100%; border-radius: 10px; border: 1px solid #2a3555; background: #000; }
    .screenshot.placeholder { min-height: 120px; display: flex; align-items: center; justify-content: center; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0a0f1a; border: 1px solid #223055; border-radius: 10px; padding: 12px; overflow: auto; }
    pre.inline { margin: 0; padding: 8px; font-size: 12px; }
    .error { border-color: #703030; background: #2a1010; color: #ffbdbd; }
    .muted { color: #98a2b8; }
    a { color: #8ec5ff; }
    h1,h2,h3,h4 { margin: 0 0 8px; }
    .step-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 12px; }
    .step-tabs button { background: #182038; border: 1px solid #2a3555; color: #e8ecf5; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
    .step-tabs button.active { background: #24304d; border-color: #4b6ea8; }
    .tab-panel.hidden { display: none; }
    .console-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .console-toolbar button { background: #182038; border: 1px solid #2a3555; color: #e8ecf5; border-radius: 999px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
    .console-toolbar button.active { background: #24304d; border-color: #4b6ea8; }
    .console-entry { display: grid; grid-template-columns: 80px 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #223055; font-size: 13px; }
    .console-entry.hidden { display: none; }
    .console-entry.level-error { background: #2a1010; color: #ffbdbd; }
    .console-entry.level-warn { background: #2a2210; color: #ffd88d; }
    .console-type { font-weight: 700; text-transform: uppercase; font-size: 11px; }
    .console-loc { grid-column: 2; font-size: 11px; }
    .har-list { display: flex; flex-direction: column; gap: 8px; }
    .har-entry { background: #0a0f1a; border: 1px solid #223055; border-radius: 10px; padding: 0; }
    .har-entry summary { cursor: pointer; list-style: none; display: grid; grid-template-columns: 64px 1fr 56px 120px 72px 64px; gap: 8px; align-items: center; padding: 10px 12px; font-size: 12px; }
    .har-entry summary::-webkit-details-marker { display: none; }
    .har-entry.status-4xx summary, .har-entry.status-5xx summary, .har-entry.status-fail summary { color: #ffbdbd; }
    .har-url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .har-detail { padding: 0 12px 12px; }
    .trace-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .trace-table th, .trace-table td { border-bottom: 1px solid #223055; padding: 8px; vertical-align: top; text-align: left; }
    .trace-error { color: #ffbdbd; margin-top: 6px; font-size: 12px; }
    @media (max-width: 900px) {
      .media-grid { grid-template-columns: 1fr; }
      .har-entry summary { grid-template-columns: 1fr; gap: 4px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>${escapeHtml(results.name ?? 'Session report')}</h1>
      <p class="muted">Generated by luma-browser ${escapeHtml(getPackageVersion())}</p>
      <div class="meta">
        <span class="pill">Session ${escapeHtml(results.id)}</span>
        <span class="pill">Status ${escapeHtml(results.status)}</span>
        <span class="pill">Browser ${escapeHtml(results.browser ?? 'default')}</span>
        <span class="pill">${passed} passed · ${failed} failed · ${steps.length} steps</span>
        <span class="pill">Duration ${escapeHtml(sessionDuration)}</span>
        <span class="pill">${escapeHtml(results.startedAt)} → ${escapeHtml(results.endedAt ?? 'open')}</span>
      </div>
      <div class="filmstrip">${buildFilmstrip(steps)}</div>
    </header>
    ${stepCards}
  </div>
  ${buildReportScript()}
</body>
</html>`;
}
