'use client';

import { useState, useEffect } from 'react';
import { fetchDevices, fetchHealth, type Device } from '../../lib/api';
import { useWebSocket } from '../../hooks/use-websocket';
import { toast } from 'react-hot-toast';
import {
    IconDeviceLaptop,
    IconCircleCheck,
    IconAlertTriangle,
    IconCircleX,
    IconWifi,
    IconWifiOff,
    IconRocket,
} from '@tabler/icons-react';

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

    useEffect(() => {
        if (messages.length === 0) return;
        const latest = messages[0];
        if (latest.type === 'ALERT_TRIGGERED') {
            toast.error(
                `Critical Alert: Device ${latest.payload?.deviceId || 'Unknown'} reported an issue!`,
                { id: `alert-${latest.timestamp}` }
            );
        }
        if (['DEVICE_CONNECTED', 'DEVICE_DISCONNECTED', 'MAINTENANCE', 'TELEMETRY_REPORTED', 'ALERT_TRIGGERED', 'FIRMWARE_UPDATED', 'ERROR_RECORDED'].includes(latest.type)) {
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
            <header className="app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <h1 className="app-header__title">Dashboard</h1>
                        <p className="app-header__subtitle">Real-time IoT overview</p>
                    </div>
                </div>
                <div className="ws-status">
                    <span className={`ws-status__dot ${connected ? 'ws-status__dot--connected' : 'ws-status__dot--disconnected'}`} />
                    {connected ? (
                        <><IconWifi size={14} stroke={2} style={{ marginRight: 4 }} /> Live</>
                    ) : (
                        <><IconWifiOff size={14} stroke={2} style={{ marginRight: 4 }} /> Disconnected</>
                    )}
                </div>
            </header>

            {/* Stats */}
            <section className="stat-grid" aria-label="Key Metrics">
                <article className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--blue">
                        <IconDeviceLaptop size={32} stroke={2} />
                    </div>
                    <div>
                        <div className="card__value">{total}</div>
                        <div className="card__label">Total Devices</div>
                    </div>
                </article>
                <article className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--green">
                        <IconCircleCheck size={32} stroke={2} />
                    </div>
                    <div>
                        <div className="card__value">{online}</div>
                        <div className="card__label">Online</div>
                    </div>
                </article>
                <article className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--yellow">
                        <IconAlertTriangle size={32} stroke={2} />
                    </div>
                    <div>
                        <div className="card__value">{offline}</div>
                        <div className="card__label">Offline</div>
                    </div>
                </article>
                <article className="card stat-card">
                    <div className="stat-card__icon stat-card__icon--red">
                        <IconCircleX size={32} stroke={2} />
                    </div>
                    <div>
                        <div className="card__value">{error}</div>
                        <div className="card__label">Errors</div>
                    </div>
                </article>
            </section>

            {/* Infrastructure Health + Live Feed */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} aria-label="System Status">
                {/* Health */}
                <article className="card">
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
                </article>

                {/* Live Feed */}
                <article className="card">
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
                </article>
            </section>
        </>
    );
}
