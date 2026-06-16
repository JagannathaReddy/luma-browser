export declare const FACTORY_METHODS: Set<string>;
export declare class HandleRegistry {
    #private;
    register(value: any): string;
    get(handle: any): any;
    delete(handle: any): void;
    clear(): void;
}
export declare function isPlaywrightChannel(value: any): boolean;
export declare function encodeWireValue(value: any, registry: any): any;
export declare function encodeHostResponse(value: any, registry: any): any;
export declare function decodeWireArgs(args: any, registry: any): any;
export declare function invokeHostPathCall(registry: any, handleId: any, path: any, method: any, args: any): Promise<any>;
export declare function invokeHostPathFlush(registry: any, handleId: any, steps: any, path: any, method: any, args: any): Promise<any>;
export declare function invokeHostCall(registry: any, handleId: any, method: any, args: any): Promise<any>;
export declare function formatRpcError(error: any): string;
//# sourceMappingURL=playwright-rpc.d.ts.map