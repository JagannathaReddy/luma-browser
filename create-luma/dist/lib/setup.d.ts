import type { RunOptions } from './types.js';
export declare const LUMA_NPM_PACKAGE = "@jagannathamv/luma-browser";
export declare function run(command: any, args: any, { label, optional }?: RunOptions): boolean;
export declare function commandExists(name: any): boolean;
export declare function npmGlobalPrefix(): string;
export declare function canInstallGlobal(): boolean;
export declare function printGlobalInstallHint(): void;
export declare function lumaOnPath(): boolean;
export declare function npxLuma(argv: any, { optional }?: {
    optional?: boolean;
}): boolean;
export declare function installGlobalPackage(): boolean;
export declare function installChromium({ useGlobalCli }: {
    useGlobalCli: any;
}): boolean;
//# sourceMappingURL=setup.d.ts.map