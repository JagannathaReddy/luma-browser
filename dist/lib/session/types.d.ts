import type { BrowserContext, Page } from 'playwright';
import type { CaptureOptions } from '@jagannathamv/protocol';
export interface SessionManagerOptions {
    sessionsRoot?: string;
}
export interface SessionStartOptions {
    name?: string;
    browser?: string;
    capture?: CaptureOptions;
}
export interface SessionFinalizeOptions {
    renderReport?: boolean;
}
export interface StepFinishOptions {
    success: boolean;
    error?: string | null;
    artifacts?: Record<string, string>;
}
export interface StepCapturePipelineOptions {
    context: BrowserContext;
    stepDir: string;
    capture: Required<CaptureOptions>;
    primaryPage?: Page | null;
    videoDir?: string | null;
}
export type StepArtifactKind = 'trace' | 'video' | 'har' | 'console' | 'screenshot';
export type StepArtifacts = Partial<Record<StepArtifactKind, string>>;
//# sourceMappingURL=types.d.ts.map