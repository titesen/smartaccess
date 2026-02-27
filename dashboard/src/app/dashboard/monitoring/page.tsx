'use client';

import { useState, useEffect } from 'react';
import { fetchAlerts, acknowledgeAlert, type Alert } from '../../../lib/api';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import LiveRegion from '../../../components/accessibility/LiveRegion';

const SEVERITY_BADGE: Record<string, string> = {
    CRITICAL: 'badge--error',
    HIGH: 'badge--failed',
    MEDIUM: 'badge--retry',
    LOW: 'badge--received',
    INFO: 'badge--online',
};

export default function MonitoringAlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');

    const load = async () => {
        try {
            const data = await fetchAlerts();
            setAlerts(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAck = async (alert: Alert) => {
        try {
            await acknowledgeAlert(alert.id);
            setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, acknowledged: true } : a));
            setStatusMsg(`Alert ${alert.id} acknowledged`);
        } catch {
            setStatusMsg('Failed to acknowledge alert');
        }
    };

    const active = alerts.filter((a) => !a.acknowledged);
    const acknowledged = alerts.filter((a) => a.acknowledged);

    return (
        <>
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Monitoring' }]} />
            <LiveRegion message={statusMsg} />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title" style={{ fontSize: 44, color: 'var(--accent-red)', fontStyle: 'italic', textTransform: 'uppercase' }}>System Alerts</h1>
                    <div style={{ height: '4px', background: 'var(--border-color)', width: '100%', marginBottom: '8px' }}></div>
                    <p className="app-header__subtitle" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {active.length} ACTIVE // {acknowledged.length} ACKNOWLEDGED
                    </p>
                </div>
                <button className="btn btn--primary" onClick={load}>RELOAD</button>
            </div>

            {/* Active Alerts */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, backgroundColor: 'var(--border-color)', display: 'inline-block', padding: '4px 8px', color: 'var(--bg-primary)' }}>
                [ ! ] ACTIVE ALERTS
            </h2>
            <div className="table-container" style={{ marginBottom: 32 }}>
                <table className="table">
                    <caption className="sr-only">Active alerts requiring attention</caption>
                    <thead>
                        <tr>
                            <th scope="col">Severity</th>
                            <th scope="col">Action</th>
                            <th scope="col">Entity</th>
                            <th scope="col">Details</th>
                            <th scope="col">Time</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                        ) : active.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                ✅ No active alerts
                            </td></tr>
                        ) : active.map((alert) => (
                            <tr key={alert.id}>
                                <td><span className={`badge ${SEVERITY_BADGE[alert.severity] || 'badge--offline'}`}>{alert.severity}</span></td>
                                <td style={{ fontSize: 13 }}>{alert.action}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{alert.entityType}:{alert.entityId}</td>
                                <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={JSON.stringify(alert.details)}>
                                    {JSON.stringify(alert.details).slice(0, 80)}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(alert.createdAt).toLocaleString()}
                                </td>
                                <td>
                                    <button className="btn btn--primary btn--sm" onClick={() => handleAck(alert)}>
                                        ✓ Acknowledge
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Acknowledged */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, marginTop: 32, display: 'inline-block', padding: '4px 8px', border: 'var(--border-width-thick) solid var(--text-secondary)' }}>
                [ OK ] ACKNOWLEDGED
            </h2>
            <div className="table-container">
                <table className="table">
                    <caption className="sr-only">Previously acknowledged alerts</caption>
                    <thead>
                        <tr>
                            <th scope="col">Severity</th>
                            <th scope="col">Action</th>
                            <th scope="col">Entity</th>
                            <th scope="col">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acknowledged.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No acknowledged alerts</td></tr>
                        ) : acknowledged.map((alert) => (
                            <tr key={alert.id} style={{ opacity: 0.6 }}>
                                <td><span className={`badge ${SEVERITY_BADGE[alert.severity] || 'badge--offline'}`}>{alert.severity}</span></td>
                                <td style={{ fontSize: 13 }}>{alert.action}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{alert.entityType}:{alert.entityId}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(alert.createdAt).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
