'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAuditLog, type AuditEntry } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import {
    IconCircleCheckFilled,
    IconCircleXFilled,
    IconChartBar,
    IconAlertTriangleFilled,
    IconDatabaseImport,
    IconCpu,
    IconShieldLock,
    IconUsers,
    IconSettings,
} from '@tabler/icons-react';

const STATUS_BADGE: Record<string, string> = {
    SUCCESS: 'badge--processed',
    FAILURE: 'badge--error',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
    DOMAIN: <IconChartBar size={18} color="var(--accent-blue)" />,
    TECHNICAL: <IconCpu size={18} color="var(--accent-purple)" />,
    SECURITY: <IconShieldLock size={18} color="var(--accent-red)" />,
};

const CATEGORIES = Object.keys(CATEGORY_ICON);
const RESULTS = Object.keys(STATUS_BADGE);

type SortKey = 'eventType' | 'actor' | 'category' | 'result' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [resultFilter, setResultFilter] = useState('');

    // Sorting
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const load = async () => {
        try {
            setLoading(true);
            const data = await fetchAuditLog(200);
            setLogs(data);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Derived: filtered + sorted
    const filtered = useMemo(() => {
        let result = logs;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (e) =>
                    e.eventType.toLowerCase().includes(q) ||
                    e.actor.toLowerCase().includes(q) ||
                    e.aggregateType.toLowerCase().includes(q) ||
                    e.aggregateId.toLowerCase().includes(q)
            );
        }

        if (categoryFilter) {
            result = result.filter((e) => e.category === categoryFilter);
        }

        if (resultFilter) {
            result = result.filter((e) => e.result === resultFilter);
        }

        // Sort
        result = [...result].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (!aVal && bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal && !bVal) return sortDir === 'asc' ? 1 : -1;
            if (!aVal && !bVal) return 0;

            const aStr = String(aVal);
            const bStr = String(bVal);
            return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });

        return result;
    }, [logs, search, categoryFilter, resultFilter, sortKey, sortDir]);

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
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }, { label: 'Audit Logs' }]} />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Audit Logs</h1>
                    <p className="app-header__subtitle">
                        {filtered.length} of {logs.length} records matching criteria
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Search event type, actor, entity ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="form-input"
                    style={{ minWidth: 280 }}
                    aria-label="Search audit logs"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-input"
                    aria-label="Filter by category"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={resultFilter}
                    onChange={(e) => setResultFilter(e.target.value)}
                    className="form-input"
                    aria-label="Filter by result"
                >
                    <option value="">All Results</option>
                    {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {(search || categoryFilter || resultFilter) && (
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => { setSearch(''); setCategoryFilter(''); setResultFilter(''); }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
            </div>

            <div className="table-container">
                <table className="table">
                    <caption className="sr-only">System-wide immutable trail of security and configuration changes</caption>
                    <thead>
                        <tr>
                            <th scope="col" onClick={() => toggleSort('category')} style={{ cursor: 'pointer', userSelect: 'none', width: '15%' }}>
                                Category <SortIcon col="category" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('eventType')} style={{ cursor: 'pointer', userSelect: 'none', width: '25%' }}>
                                Action <SortIcon col="eventType" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('actor')} style={{ cursor: 'pointer', userSelect: 'none', width: '20%' }}>
                                Actor <SortIcon col="actor" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('result')} style={{ cursor: 'pointer', userSelect: 'none', width: '15%' }}>
                                Result <SortIcon col="result" />
                            </th>
                            <th scope="col" onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none', width: '25%' }}>
                                Date/Time <SortIcon col="createdAt" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                    Loading audit logs...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                    No audit entries match the current filters.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((log) => (
                                <tr key={log.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
                                            {CATEGORY_ICON[log.category] || <IconAlertTriangleFilled size={18} color="var(--text-secondary)" />}
                                            {log.category}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{log.eventType}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                            {log.aggregateType}:{log.aggregateId}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {log.actor.includes('@') ? <IconUsers size={16} color="var(--text-secondary)" /> : <IconCpu size={16} color="var(--text-secondary)" />}
                                            <span style={{ fontSize: 13 }}>{log.actor}</span>
                                        </div>
                                        {log.ipAddress && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                                {log.ipAddress}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[log.result] || 'badge--offline'}`}>
                                            {log.result}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </div>
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
