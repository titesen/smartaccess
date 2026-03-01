'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';

interface LiveEvent {
    eventUuid: string;
    deviceId: string;
    eventType: string;
    payload: Record<string, unknown>;
    timestamp: string;
}

import {
    IconCircleCheckFilled,
    IconCircleXFilled,
    IconChartBar,
    IconAlertTriangleFilled,
    IconDatabaseImport,
    IconCpu
} from '@tabler/icons-react';

const TYPE_ICON: Record<string, React.ReactNode> = {
    DEVICE_CONNECTED: <IconCircleCheckFilled size={18} color="var(--accent-green)" />,
    DEVICE_DISCONNECTED: <IconCircleXFilled size={18} color="var(--text-secondary)" />,
    TELEMETRY_REPORTED: <IconChartBar size={18} color="var(--accent-blue)" />,
    ALERT_TRIGGERED: <IconAlertTriangleFilled size={18} color="var(--accent-red)" />,
    COMMAND_RECEIVED: <IconDatabaseImport size={18} color="var(--accent-purple)" />,
    COMMAND_EXECUTED: <IconCpu size={18} color="var(--accent-cyan)" />,
};

const MAX_EVENTS = 200;

export default function LiveStreamPage() {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [paused, setPaused] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const connect = useCallback(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
            setConnected(false);
            // Auto-reconnect after 3s
            setTimeout(connect, 3000);
        };
        ws.onerror = () => ws.close();

        ws.onmessage = (msg) => {
            try {
                const event: LiveEvent = JSON.parse(msg.data);
                if (!paused) {
                    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
                }
            } catch {
                // ignore malformed messages
            }
        };

        wsRef.current = ws;
    }, [paused]);

    useEffect(() => {
        connect();
        return () => wsRef.current?.close();
    }, [connect]);

    const clear = () => setEvents([]);

    return (
        <>
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Events', href: '/dashboard/events' },
                    { label: 'Live Stream' },
                ]}
            />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">
                        Live Stream
                        <span
                            style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: connected ? 'var(--color-success)' : 'var(--color-error)',
                                marginLeft: 12,
                                verticalAlign: 'middle',
                            }}
                            title={connected ? 'Connected' : 'Disconnected'}
                            role="status"
                            aria-label={connected ? 'WebSocket connected' : 'WebSocket disconnected'}
                        />
                    </h1>
                    <p className="app-header__subtitle">
                        {events.length} events · {connected ? 'Connected' : 'Reconnecting…'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`btn btn--sm ${paused ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setPaused(!paused)}>
                        {paused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={clear}>🗑 Clear</button>
                </div>
            </div>

            <div
                ref={containerRef}
                className="table-container"
                style={{ maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}
                role="log"
                aria-live="polite"
                aria-label="Live event stream"
            >
                <table className="table">
                    <caption className="sr-only">Real-time event stream from IoT devices</caption>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th scope="col" style={{ width: 60 }}>Type</th>
                            <th scope="col">Event ID</th>
                            <th scope="col">Device</th>
                            <th scope="col">Timestamp</th>
                            <th scope="col">Payload</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
                                    {connected ? 'Waiting for events…' : 'Connecting to WebSocket…'}
                                </td>
                            </tr>
                        ) : (
                            events.map((ev, i) => (
                                <tr
                                    key={`${ev.eventUuid}-${i}`}
                                    className="event-row-enter"
                                    style={{ animationDelay: `${i * 20}ms` }}
                                >
                                    <td>
                                        <span title={ev.eventType} style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                                            {TYPE_ICON[ev.eventType] || <IconChartBar size={18} color="var(--text-secondary)" />}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                        {((ev.payload?.eventUuid as string) || '-').slice(0, 8)}
                                    </td>
                                    <td style={{ fontSize: 13 }}>{(ev.payload?.deviceId as string) || '-'}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {new Date(ev.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td>
                                        <details>
                                            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--color-primary)' }}>
                                                View
                                            </summary>
                                            <pre style={{
                                                marginTop: 4,
                                                background: 'var(--surface-bg)',
                                                padding: 8,
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontFamily: 'var(--font-mono)',
                                                maxHeight: 120,
                                                overflow: 'auto',
                                            }}>
                                                {JSON.stringify(ev.payload, null, 2)}
                                            </pre>
                                        </details>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
