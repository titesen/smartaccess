'use client';

import { useState, useEffect } from 'react';
import { fetchEvents, type DomainEvent } from '../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
    PROCESSED: 'badge--processed',
    FAILED: 'badge--failed',
    RECEIVED: 'badge--received',
    VALIDATED: 'badge--online',
    RETRY_PENDING: 'badge--retry',
    DEAD_LETTERED: 'badge--error',
};

const TYPE_ICON: Record<string, string> = {
    DEVICE_CONNECTED: '🟢',
    DEVICE_DISCONNECTED: '🔴',
    TELEMETRY_REPORTED: '📊',
    ALERT_TRIGGERED: '🚨',
    COMMAND_RECEIVED: '📥',
    COMMAND_EXECUTED: '✅',
};

export default function EventsPage() {
    const [events, setEvents] = useState<DomainEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await fetchEvents(100);
            setEvents(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <>
            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Events</h1>
                    <p className="app-header__subtitle">{events.length} events loaded</p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Event UUID</th>
                            <th>Device ID</th>
                            <th>Status</th>
                            <th>Retries</th>
                            <th>Received At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No events yet. Start the simulator to generate events.
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.eventUuid}>
                                    <td>
                                        <span style={{ marginRight: 8 }}>
                                            {TYPE_ICON[event.eventType] || '📋'}
                                        </span>
                                        <span style={{ fontSize: 13 }}>{event.eventType}</span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {event.eventUuid.slice(0, 8)}…
                                    </td>
                                    <td>{event.deviceId}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[event.processingStatus] || 'badge--offline'}`}>
                                            {event.processingStatus}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                                        {event.retryCount > 0 ? event.retryCount : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {new Date(event.receivedAt).toLocaleString()}
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
