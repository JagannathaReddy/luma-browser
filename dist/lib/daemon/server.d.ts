import net from 'net';
export declare function createServer({ router, logger, paths, lifecycle }: {
    router: any;
    logger: any;
    paths: any;
    lifecycle: any;
}): {
    server: net.Server;
    clients: Set<unknown>;
    listen: () => Promise<void>;
};
//# sourceMappingURL=server.d.ts.map