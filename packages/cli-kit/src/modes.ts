export type CliMode = 'orchestrator' | 'engine';

export const CLI_MODES = ['orchestrator', 'engine'] as const satisfies readonly CliMode[];
