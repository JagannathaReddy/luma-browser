import { getPackageVersion } from '../version.js';
import { escapeHtml, formatWhen, viewerSearchScript, viewerSharedStyles } from './html-utils.js';

function sessionSearchText(session) {
  return [session.name, session.id, session.status, session.startedAt, session.endedAt]
    .filter(Boolean)
    .join(' ');
}

export function renderIndexHtml(sessions, { sessionsDir }) {
  const rows = sessions
    .map((session) => {
      const label = session.name
        ? escapeHtml(session.name)
        : '<span class="muted">Untitled session</span>';
      const detailLink = `<a href="/session/${escapeHtml(session.id)}/">View session</a>`;
      const reportLink = session.reportReady
        ? `<a href="/session/${escapeHtml(session.id)}/report.html">Open report</a>`
        : '<span class="muted">No report</span>';
      const statusClass =
        session.status === 'open' ? 'open' : session.status === 'aborted' ? 'aborted' : 'closed';

      return `<tr data-session-row data-search="${escapeHtml(sessionSearchText(session))}">
  <td>${label}<div class="muted mono">${escapeHtml(session.id)}</div></td>
  <td><span class="badge ${statusClass}">${escapeHtml(session.status)}</span></td>
  <td>${session.stepCount}</td>
  <td>${formatWhen(session.startedAt)}</td>
  <td>${formatWhen(session.endedAt)}</td>
  <td>${detailLink} · ${reportLink}</td>
</tr>`;
    })
    .join('\n');

  const emptyState =
    sessions.length === 0
      ? `<p class="empty">No sessions found in <code>${escapeHtml(sessionsDir)}</code>. Start one with <code>luma-browser session start --name demo</code>.</p>`
      : `<div class="toolbar">
  <input type="search" id="session-search" placeholder="Filter by name, id, status, or date…" aria-label="Filter sessions" />
</div>
<p id="search-empty" class="empty hidden">No sessions match your search.</p>
<table>
  <thead>
    <tr>
      <th>Session</th>
      <th>Status</th>
      <th>Steps</th>
      <th>Started</th>
      <th>Ended</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>luma-browser sessions</title>
  <style>${viewerSharedStyles()}</style>
</head>
<body>
  <div class="wrap">
    <h1>luma-browser sessions</h1>
    <p class="muted">Viewer ${escapeHtml(getPackageVersion())} · ${sessions.length} session${sessions.length === 1 ? '' : 's'}</p>
    ${emptyState}
  </div>
  ${viewerSearchScript()}
</body>
</html>`;
}
