import { access, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../logger.js';
import { parseSessionResults } from '../session/results-schema.js';
import { writeExportedScript } from './export-script.js';
import { renderSessionReport } from './render-report.js';
import { decodeTraceZip } from './trace-decode.js';
export async function enrichSessionResults(sessionDir, results) {
    const enrichedSteps = [];
    for (const step of results.steps) {
        const stepDir = join(sessionDir, step.dir);
        const tracePath = join(stepDir, step.artifacts?.trace ?? 'trace.zip');
        let actionCount = 0;
        let exportedScript = null;
        try {
            await access(tracePath);
            const actions = await decodeTraceZip(tracePath);
            actionCount = actions.length;
            const exported = await writeExportedScript(stepDir, actions, { stepName: step.name });
            exportedScript = 'exported.spec.js';
            logger.debug('exported playwright script', {
                step: step.name,
                actionCount: exported.actionCount,
                path: exported.path,
            });
        }
        catch (error) {
            logger.debug('trace decode skipped', {
                step: step.name,
                reason: error instanceof Error ? error.message : String(error),
            });
        }
        enrichedSteps.push({
            ...step,
            actionCount,
            ...(exportedScript
                ? { exportedScript, artifacts: { ...step.artifacts, exportedScript } }
                : {}),
        });
    }
    return parseSessionResults({
        ...results,
        steps: enrichedSteps,
    });
}
export async function renderSessionReportFile(sessionDir, results) {
    const enriched = await enrichSessionResults(sessionDir, results);
    const html = await renderSessionReport(sessionDir, enriched);
    const reportPath = join(sessionDir, 'report.html');
    await writeFile(reportPath, html);
    await writeFile(join(sessionDir, 'results.json'), `${JSON.stringify(enriched, null, 2)}\n`);
    return { reportPath, results: enriched };
}
//# sourceMappingURL=render-session-report.js.map