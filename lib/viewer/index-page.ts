import { renderIndexHtml as renderFromUi } from '@jagannathamv/viewer-ui';
import { getPackageVersion } from '../version.js';

export async function renderIndexHtml(sessions, { sessionsDir }) {
  return renderFromUi(sessions, {
    sessionsDir,
    version: getPackageVersion(),
  });
}
