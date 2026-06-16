import type { ScriptExportOptions } from '../types.js';
export declare function actionToStatement(action: any): string | null;
export declare function exportPlaywrightScript(actions: any, { stepName }?: ScriptExportOptions): string;
export declare function writeExportedScript(stepDir: any, actions: any, { stepName }?: ScriptExportOptions): Promise<{
    path: string;
    script: string;
    actionCount: any;
}>;
//# sourceMappingURL=export-script.d.ts.map