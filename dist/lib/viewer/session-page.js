import { renderSessionDetailHtml as renderFromUi } from '@jagannathamv/viewer-ui';
import { getPackageVersion } from '../version.js';
export async function renderSessionDetailHtml(detail, { sessionsDir }) {
    return renderFromUi(detail, {
        sessionsDir,
        version: getPackageVersion(),
    });
}
//# sourceMappingURL=session-page.js.map