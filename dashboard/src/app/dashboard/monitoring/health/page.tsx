'use client';

import { useState, useEffect } from 'react';
import { fetchHealth } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';

interface HealthStatus {
    service: string;
    status: string;
    timestamp: string;
    checks: { database: string; rabbitmq: string; redis: string };
}

export default function HealthPage() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchHealth();
            setHealth(data);
        } catch {
            setError('Unable to reach backend health endpoint');
            setHealth(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    const statusColor = (status: string) =>
        status === 'ok' || status === 'healthy' ? 'var(--color-success)' : 'var(--color-error)';

    const statusIcon = (status: string) =>
        status === 'ok' || status === 'healthy' ? '✅' : '❌';

    const components = health
        ? [
            { name: 'PostgreSQL', key: 'database' as const, icon: '🐘' },
            { name: 'RabbitMQ', key: 'rabbitmq' as const, icon: '🐇' },
            { name: 'Redis', key: 'redis' as const, icon: '🔴' },
        ]
        : [];

    return (
        <>
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Monitoring', href: '/dashboard/monitoring' },
                    { label: 'System Health' },
                ]}
            />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">System Health</h1>
                    <p className="app-header__subtitle">
                        {loading ? 'Checking…' : 'Auto-checking every 15s'}
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            {/* Overall status */}
            <div className="monitoring-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
                {loading ? (
                    <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Checking health…</div>
                ) : error ? (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-error)' }}>{error}</div>
                    </>
                ) : health ? (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>
                            {health.status === 'healthy' ? '🟢' : '🔴'}
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: statusColor(health.status), textTransform: 'uppercase' }}>
                            {health.status}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                            Service: {health.service} · Last check: {new Date(health.timestamp).toLocaleTimeString()}
                        </div>
                    </>
                ) : null}
            </div>

            {/* Component checks */}
            {health && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                }}>
                    {components.map((comp) => {
                        const st = health.checks[comp.key];
                        return (
                            <div key={comp.key} className="monitoring-card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontSize: 28 }}>{comp.icon}</span>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {comp.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{statusIcon(st)}</span>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: statusColor(st), textTransform: 'uppercase' }}>
                                        {st}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
