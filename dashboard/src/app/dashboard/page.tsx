'use client';

import { useState, useEffect } from 'react';
import { fetchDevices, fetchHealth, type Device } from '../../lib/api';
import { useWebSocket } from '../../hooks/use-websocket';
import { toast } from 'react-hot-toast';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

export default function DashboardOverview() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [health, setHealth] = useState<{ status: string; checks: Record<string, string> } | null>(null);
    const [loading, setLoading] = useState(true);
    const { connected, messages } = useWebSocket(WS_URL);

    useEffect(() => {
        async function load() {
            try {
                const [devs, h] = await Promise.all([fetchDevices(), fetchHealth()]);
                setDevices(devs);
                setHealth(h);
            } catch {
                // Will show empty state
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Listen for WebSocket events to trigger real-time updates and notifications
    useEffect(() => {
        if (messages.length === 0) return;

        const latest = messages[0];
        // Only react to the most recent message if it's new
        // We'll use a simple heuristic: if it's an alert, show toast
        if (latest.type === 'ALERT_TRIGGERED') {
            toast.error(
                `Critical Alert: Device ${latest.payload?.deviceId || 'Unknown'} reported an issue!`,
                { id: `alert-${latest.timestamp}` } // Prevent duplicate toasts for same event
            );
        }

        // If it's a connection/disconnection event, optimistically refresh device counts
        if (['DEVICE_CONNECTED', 'DEVICE_DISCONNECTED', 'MAINTENANCE'].includes(latest.type)) {
            fetchDevices().then(setDevices).catch(() => { });
        }
    }, [messages]);

    const online = devices.filter((d) => d.status === 'ONLINE').length;
    const offline = devices.filter((d) => d.status === 'OFFLINE').length;
    const error = devices.filter((d) => d.status === 'ERROR').length;
    const total = devices.length;

    return (
        <>
            {/* Header */}
            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Dashboard</h1>
                    <p className="app-header__subtitle">Real-time IoT overview</p>
                </div>
                <div className="ws-status">
                    <span className={`ws-status__dot ${connected ? 'ws-status__dot--connected' : 'ws-status__dot--disconnected'}`} />
                    {connected ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid">
                <div className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--blue">📡</div>
                    <div>
                        <div className="card__value">{total}</div>
                        <div className="card__label">Total Devices</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--green">✅</div>
                    <div>
                        <div className="card__value">{online}</div>
                        <div className="card__label">Online</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--yellow">⚠️</div>
                    <div>
                        <div className="card__value">{offline}</div>
                        <div className="card__label">Offline</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--red">🔴</div>
                    <div>
                        <div className="card__value">{error}</div>
                        <div className="card__label">Errors</div>
                    </div>
                </div>
            </div>

            {/* Infrastructure Health + Live Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Health */}
                <div className="card">
                    <div className="card__header">
                        <h2 className="card__title">Infrastructure</h2>
                    </div>
                    {health ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(health.checks).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{key}</span>
                                    <span className={`badge ${value === 'ok' ? 'badge--online' : 'badge--error'}`}>
                                        <span className="badge__dot" />
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>{loading ? 'Loading…' : 'Unable to fetch health'}</p>
                    )}
                </div>

                {/* Live Feed */}
                <div className="card">
                    <div className="card__header">
                        <h2 className="card__title">Live Events</h2>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {messages.length} events
                        </span>
                    </div>
                    <div className="live-feed">
                        {messages.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                {connected ? 'Waiting for events…' : 'Connecting to live feed…'}
                            </p>
                        ) : (
                            messages.slice(0, 20).map((msg, i) => (
                                <div key={i} className="live-feed__item">
                                    <div
                                        className="live-feed__dot"
                                        style={{
                                            background: msg.type.includes('ALERT') ? 'var(--accent-red)' :
                                                msg.type.includes('CONNECTED') ? 'var(--accent-green)' :
                                                    'var(--accent-blue)',
                                        }}
                                    />
                                    <div>
                                        <div className="live-feed__text">{msg.type}</div>
                                        <div className="live-feed__time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
