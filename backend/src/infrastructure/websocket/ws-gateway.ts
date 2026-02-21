import { WebSocketServer, type WebSocket } from 'ws';
import type http from 'node:http';
import type { Logger } from 'winston';

// ---------------------------------------------------------------------------
// WebSocket Gateway — real-time event broadcasting to dashboard clients
// ---------------------------------------------------------------------------

export class WebSocketGateway {
    private wss: WebSocketServer;

    constructor(server: http.Server, private readonly logger: Logger) {
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws: WebSocket) => {
            this.logger.info('WebSocket client connected', {
                totalClients: this.wss.clients.size,
            });

            ws.on('close', () => {
                this.logger.info('WebSocket client disconnected', {
                    totalClients: this.wss.clients.size,
                });
            });

            ws.on('error', (err) => {
                this.logger.error('WebSocket client error', { error: err.message });
            });

            // Welcome message
            ws.send(JSON.stringify({
                type: 'CONNECTED',
                message: 'SmartAccess real-time stream',
                timestamp: new Date().toISOString(),
            }));
        });

        this.logger.info('WebSocket gateway initialized on /ws');
    }

    /**
     * Broadcast a message to all connected clients.
     */
    broadcast(type: string, payload: Record<string, unknown>): void {
        const message = JSON.stringify({
            type,
            payload,
            timestamp: new Date().toISOString(),
        });

        let sent = 0;
        for (const client of this.wss.clients) {
            if (client.readyState === 1 /* OPEN */) {
                client.send(message);
                sent++;
            }
        }

        if (sent > 0) {
            this.logger.debug(`WebSocket broadcast: ${type} → ${sent} clients`);
        }
    }

    /**
     * Gracefully close all connections.
     */
    close(): void {
        for (const client of this.wss.clients) {
            client.close();
        }
        this.wss.close();
        this.logger.info('WebSocket gateway closed');
    }
}
