'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WsMessage {
    type: string;
    payload?: Record<string, unknown>;
    timestamp: string;
}

export function useWebSocket(url: string) {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WsMessage[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => setConnected(true);

            ws.onmessage = (event) => {
                try {
                    const msg: WsMessage = JSON.parse(event.data);
                    setMessages((prev) => [msg, ...prev].slice(0, 100)); // Keep last 100
                } catch {
                    // Ignore unparseable messages
                }
            };

            ws.onclose = () => {
                setConnected(false);
                // Reconnect after 3s
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => ws.close();
        } catch {
            // Connection failed, retry
            reconnectTimer.current = setTimeout(connect, 3000);
        }
    }, [url]);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    return { connected, messages };
}
