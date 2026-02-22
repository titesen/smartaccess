'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchEvents, type DomainEvent } from '../../../lib/api';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const EVENT_TYPES = Object.keys(TYPE_ICON);
const STATUSES = Object.keys(STATUS_BADGE);

type SortKey = 'eventType' | 'deviceId' | 'processingStatus' | 'receivedAt' | 'retryCount';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<DomainEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Sorting
    const [sortKey, setSortKey] = useState<SortKey>('receivedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const load = async () => {
        try {
            const data = await fetchEvents(200);
            setEvents(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Derived: filtered + sorted
    const filtered = useMemo(() => {
        let result = events;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (e) =>
                    e.eventUuid.toLowerCase().includes(q) ||
                    String(e.deviceId).includes(q) ||
                    e.eventType.toLowerCase().includes(q),
            );
        }

        if (typeFilter) {
            result = result.filter((e) => e.eventType === typeFilter);
        }

        if (statusFilter) {
            result = result.filter((e) => e.processingStatus === statusFilter);
        }

        // Sort
        result = [...result].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal);
            const bStr = String(bVal);
            return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });

        return result;
    }, [events, search, typeFilter, statusFilter, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
        return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <>
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Events' }]} />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Events</h1>
                    <p className="app-header__subtitle">
                        {filtered.length} of {events.length} events
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Search UUID, device, type…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="form-input"
                    style={{ minWidth: 240 }}
                    aria-label="Search events"
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="form-input"
                    aria-label="Filter by event type"
                >
                    <option value="">All Types</option>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-input"
                    aria-label="Filter by status"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {(search || typeFilter || statusFilter) && (
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
            </div>

            <div className="table-container">
                <table className="table">
                    <caption className="sr-only">Access control events logged by the system</caption>
                    <thead>
                        <tr>
                            <th scope="col" onClick={() => toggleSort('eventType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Type <SortIcon col="eventType" />
                            </th>
                            <th scope="col">Event UUID</th>
                            <th scope="col" onClick={() => toggleSort('deviceId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Device ID <SortIcon col="deviceId" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('processingStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Status <SortIcon col="processingStatus" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('retryCount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Retries <SortIcon col="retryCount" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('receivedAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Received At <SortIcon col="receivedAt" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                    {events.length === 0
                                        ? 'No events yet. Start the simulator to generate events.'
                                        : 'No events match the current filters.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((event) => (
                                <tr
                                    key={event.eventUuid}
                                    onClick={() => router.push(`/dashboard/events/${event.eventUuid}`)}
                                    style={{ cursor: 'pointer' }}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') router.push(`/dashboard/events/${event.eventUuid}`);
                                    }}
                                    role="link"
                                    aria-label={`View event ${event.eventUuid}`}
                                >
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
