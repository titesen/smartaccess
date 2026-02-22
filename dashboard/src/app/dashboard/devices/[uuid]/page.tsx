'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    fetchDevice,
    fetchEventsByDevice,
    fetchDeviceStatusHistory,
    updateDeviceStatus,
    type Device,
    type DomainEvent,
    type StatusHistoryEntry,
} from '../../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
    ONLINE: 'badge--online',
    OFFLINE: 'badge--offline',
    ERROR: 'badge--error',
    MAINTENANCE: 'badge--maintenance',
    REGISTERED: 'badge--registered',
    DECOMMISSIONED: 'badge--offline',
};

type Tab = 'overview' | 'events' | 'history';

export default function DeviceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = params.uuid as string;

    const [device, setDevice] = useState<Device | null>(null);
    const [events, setEvents] = useState<DomainEvent[]>([]);
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const d = await fetchDevice(uuid);
                setDevice(d);

                const [ev, hist] = await Promise.all([
                    fetchEventsByDevice(d.id),
                    fetchDeviceStatusHistory(d.id),
                ]);
                setEvents(ev);
                setHistory(hist);
            } catch {
                // empty
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [uuid]);

    const handleStatusChange = async (status: string) => {
        setActionLoading(true);
        try {
            const updated = await updateDeviceStatus(uuid, status);
            setDevice(updated);
        } catch {
            // ignore
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

    if (loading) {
        return <div className="loading-container" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading device…</div>;
    }

    if (!device) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Device not found.</div>;
    }

    return (
        <>
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
                {' > '}
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard/devices')}>Devices</span>
                {' > '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{device.name}</span>
            </nav>

            {/* Header */}
            <div className="app-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="app-header__title">{device.name}</h1>
                    <p className="app-header__subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {device.deviceUuid}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${STATUS_BADGE[device.status] || 'badge--offline'}`}>
                        <span className="badge__dot" />
                        {device.status}
                    </span>
                    {device.status === 'ONLINE' && (
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => handleStatusChange('MAINTENANCE')}
                            disabled={actionLoading}
                        >
                            🔧 Maintenance
                        </button>
                    )}
                    {device.status === 'MAINTENANCE' && (
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => handleStatusChange('ONLINE')}
                            disabled={actionLoading}
                        >
                            ✅ Bring Online
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
                {(['overview', 'events', 'history'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn btn--ghost btn--sm`}
                        style={{
                            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                            borderRadius: 0,
                            fontWeight: activeTab === tab ? 600 : 400,
                            textTransform: 'capitalize',
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Location</p>
                            <p style={{ fontWeight: 500 }}>{device.location || '—'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Firmware</p>
                            <p style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{device.firmwareVersion || '—'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Last Seen</p>
                            <p style={{ fontWeight: 500 }}>{formatDate(device.lastSeenAt)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Registered</p>
                            <p style={{ fontWeight: 500 }}>{formatDate(device.createdAt)}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'events' && (
                <div className="table-container">
                    <table className="table">
                        <caption style={{ textAlign: 'left', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                            Recent events for {device.name}
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Type</th>
                                <th scope="col">Status</th>
                                <th scope="col">Received At</th>
                                <th scope="col">UUID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No events found for this device.
                                    </td>
                                </tr>
                            ) : (
                                events.map((ev) => (
                                    <tr key={ev.eventUuid} style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/events/${ev.eventUuid}`)}>
                                        <td>{ev.eventType}</td>
                                        <td>
                                            <span className={`badge ${ev.processingStatus === 'PROCESSED' ? 'badge--online' : ev.processingStatus === 'FAILED' ? 'badge--error' : 'badge--maintenance'}`}>
                                                <span className="badge__dot" />
                                                {ev.processingStatus}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(ev.receivedAt)}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {ev.eventUuid.slice(0, 8)}…
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="table-container">
                    <table className="table">
                        <caption style={{ textAlign: 'left', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                            Status transition history for {device.name}
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">From</th>
                                <th scope="col">To</th>
                                <th scope="col">Changed At</th>
                                <th scope="col">Changed By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No status transitions recorded.
                                    </td>
                                </tr>
                            ) : (
                                history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[entry.previousStatus] || 'badge--offline'}`}>
                                                <span className="badge__dot" />
                                                {entry.previousStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[entry.newStatus] || 'badge--offline'}`}>
                                                <span className="badge__dot" />
                                                {entry.newStatus}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(entry.changedAt)}</td>
                                        <td>{entry.changedBy}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
