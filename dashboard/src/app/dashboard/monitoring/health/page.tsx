'use client';

import { useState, useEffect } from 'react';
import { fetchHealth } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import {
    IconDatabase,
    IconServer,
    IconStack2,
    IconCircleCheck,
    IconCircleX,
    IconRefresh,
} from '@tabler/icons-react';

interface HealthStatus {
    service: string;
    status: string;
    timestamp: string;
    checks: { database: string; rabbitmq: string; redis: string };
}

const COMPONENT_CONFIG = [
    { name: 'PostgreSQL', key: 'database' as const, Icon: IconDatabase },
    { name: 'RabbitMQ', key: 'rabbitmq' as const, Icon: IconServer },
    { name: 'Redis', key: 'redis' as const, Icon: IconStack2 },
];

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

    const isOk = (status: string) => status === 'ok' || status === 'healthy';

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
                <button className="btn btn--ghost btn--sm" onClick={load} style={{ gap: 6 }}>
                    <IconRefresh size={15} stroke={2} />
                    Refresh
                </button>
            </div>

            {/* Overall status */}
            <div className="monitoring-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
                {loading ? (
                    <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Checking health…</div>
                ) : error ? (
                    <>
                        <IconCircleX size={48} stroke={1.5} color="var(--color-error)" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-error)' }}>{error}</div>
                    </>
                ) : health ? (
                    <>
                        {isOk(health.status)
                            ? <IconCircleCheck size={48} stroke={1.5} color="var(--color-success)" style={{ marginBottom: 8 }} />
                            : <IconCircleX size={48} stroke={1.5} color="var(--color-error)" style={{ marginBottom: 8 }} />
                        }
                        <div style={{ fontSize: 24, fontWeight: 700, color: isOk(health.status) ? 'var(--color-success)' : 'var(--color-error)', textTransform: 'uppercase' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {COMPONENT_CONFIG.map(({ name, key, Icon }) => {
                        const st = health.checks[key];
                        const ok = isOk(st);
                        return (
                            <div key={key} className="monitoring-card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <Icon size={28} stroke={1.5} color={ok ? 'var(--color-success)' : 'var(--color-error)'} />
                                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {ok
                                        ? <IconCircleCheck size={18} stroke={2} color="var(--color-success)" />
                                        : <IconCircleX size={18} stroke={2} color="var(--color-error)" />
                                    }
                                    <span style={{ fontSize: 14, fontWeight: 600, color: ok ? 'var(--color-success)' : 'var(--color-error)', textTransform: 'uppercase' }}>
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
