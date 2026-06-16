import type { Server } from 'http';

export interface ViewerServerHandle {
  server: Server;
  host: string;
  port: number;
  url: string;
  close: () => Promise<void>;
}
