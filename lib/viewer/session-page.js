import { join } from 'path';
import { getPackageVersion } from '../version.js';
import { escapeHtml, formatDuration, formatWhen, viewerSharedStyles } from './html-utils.js';

const ARTIFACT_LINKS = [
  ['trace', 'trace.zip'],
  ['har', 'network.har'],
  ['console', 'console.jsonl'],
  ['screenshot', 'screenshot.png'],
  ['video', 'video.webm'],
  ['exportedScript', null],
];

function stepStatusClass(success) {
  if (success === true) {
    return 'pass';
  }
  if (success === false) {
    return 'fail';
  }
  return 'unknown';
}

function stepStatusLabel(success) {
  if (success === true) {
    return 'PASS';
  }
  if (success === false) {
    return 'FAIL';
  }
  return '—';
}

function buildArtifactLinks(sessionId, step) {
  const links = [];

  for (const [key, fallbackName] of ARTIFACT_LINKS) {
    const fileName =
      step.artifacts?.[key] ?? (fallbackName && key !== 'exportedScript' ? fallbackName : null);
    if (!fileName) {
      continue;
    }

    const href = `/session/${escapeHtml(sessionId)}/${escapeHtml(join(step.dir, fileName))}`;
    links.push(`<a href="${href}">${escapeHtml(fileName)}</a>`);
  }

  return links.length > 0 ? links.join(' · ') : '<span class="muted">No artifacts</span>';
}

function buildTraceCommand(sessionDir, step) {
  const traceName = step.artifacts?.trace;
  if (!traceName) {
    return '';
  }

  const absolutePath = join(sessionDir, step.dir, traceName);
  return `<div class="trace-cmd" title="Copy and run locally">npx playwright show-trace ${escapeHtml(absolutePath)}</div>`;
}

function buildStepRows(sessionId, sessionDir, steps) {
  if (steps.length === 0) {
    return '<tr><td colspan="5" class="muted">No steps recorded yet.</td></tr>';
  }

  return steps
    .map((step) => {
      const statusClass = stepStatusClass(step.success);
      const traceBlock = step.artifacts?.trace
        ? `<details><summary class="muted">Open in Playwright</summary>${buildTraceCommand(sessionDir, step)}</details>`
        : '';

      return `<tr>
  <td><strong>${escapeHtml(step.name)}</strong><div class="muted mono">${escapeHtml(step.dir)}</div></td>
  <td><span class="badge ${statusClass}">${stepStatusLabel(step.success)}</span></td>
  <td>${formatDuration(step.startedAt, step.endedAt)}</td>
  <td>${step.actionCount ?? '—'}</td>
  <td>${buildArtifactLinks(sessionId, step)}${traceBlock}${step.error ? `<pre class="error">${escapeHtml(step.error)}</pre>` : ''}</td>
</tr>`;
    })
    .join('\n');
}

export function renderSessionDetailHtml(detail, { sessionsDir }) {
  const title = detail.name ? `${detail.name} — luma-browser` : 'Session detail — luma-browser';
  const passed = detail.steps.filter((step) => step.success === true).length;
  const failed = detail.steps.filter((step) => step.success === false).length;
  const reportSection = detail.reportReady
    ? `<section>
  <h2>Report</h2>
  <div class="toolbar">
    <a class="btn primary" href="/session/${escapeHtml(detail.id)}/report.html" target="_blank" rel="noopener">Open report in new tab</a>
    <a class="btn" href="#report-embed">View embedded below</a>
  </div>
  <iframe id="report-embed" class="report-frame" src="/session/${escapeHtml(detail.id)}/report.html" title="Session report"></iframe>
</section>`
    : `<section>
  <h2>Report</h2>
  <p class="empty">No <code>report.html</code> yet. Close the session with <code>luma-browser session end ${escapeHtml(detail.id)}</code>.</p>
</section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${viewerSharedStyles()}
    pre.error { margin-top: 8px; padding: 8px; background: #2a1010; border: 1px solid #703030; border-radius: 8px; color: #ffbdbd; white-space: pre-wrap; }
    details { margin-top: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <p><a href="/">← All sessions</a></p>
    <h1>${escapeHtml(detail.name ?? 'Untitled session')}</h1>
    <p class="muted mono">${escapeHtml(detail.id)}</p>
    <div class="meta">
      <span class="pill"><span class="badge ${escapeHtml(detail.status)}">${escapeHtml(detail.status)}</span></span>
      <span class="pill">Browser ${escapeHtml(detail.browser ?? 'default')}</span>
      <span class="pill">${passed} passed · ${failed} failed · ${detail.steps.length} steps</span>
      <span class="pill">Duration ${escapeHtml(formatDuration(detail.startedAt, detail.endedAt))}</span>
      <span class="pill">${escapeHtml(formatWhen(detail.startedAt))} → ${escapeHtml(formatWhen(detail.endedAt))}</span>
    </div>
    ${reportSection}
    <section>
      <h2>Steps</h2>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Actions</th>
            <th>Artifacts</th>
          </tr>
        </thead>
        <tbody>
          ${buildStepRows(detail.id, detail.dir, detail.steps)}
        </tbody>
      </table>
    </section>
    <p class="muted">Viewer ${escapeHtml(getPackageVersion())} · ${escapeHtml(sessionsDir)}</p>
  </div>
</body>
</html>`;
}
