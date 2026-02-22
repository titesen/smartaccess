'use client';

import { useState, useEffect } from 'react';
import { fetchMetricsSummary, type MetricsSummary } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import Sparkline from '../../../../components/charts/Sparkline';

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await fetchMetricsSummary();
            setMetrics(data);
            setHistory((prev) => [...prev, data.eventsProcessed].slice(-30));
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 10000); // poll every 10s
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const cards = metrics
        ? [
            { label: 'Uptime', value: formatUptime(metrics.uptime), icon: '⏱️' },
            { label: 'Events Processed', value: metrics.eventsProcessed.toLocaleString(), icon: '📨' },
            { label: 'Events Failed', value: metrics.eventsFailed.toLocaleString(), icon: '❌' },
            { label: 'Devices Online', value: `${metrics.devicesOnline} / ${metrics.devicesTotal}`, icon: '📡' },
            { label: 'DLQ Size', value: metrics.dlqSize.toLocaleString(), icon: '☠️' },
            { label: 'Avg Processing', value: `${metrics.avgProcessingMs.toFixed(1)} ms`, icon: '⚡' },
        ]
        : [];

    return (
        <>
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Monitoring', href: '/dashboard/monitoring' },
                    { label: 'Metrics' },
                ]}
            />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">System Metrics</h1>
                    <p className="app-header__subtitle">
                        {loading ? 'Loading…' : 'Auto-refreshing every 10s'}
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 32,
            }}>
                {cards.map((card) => (
                    <div key={card.label} className="monitoring-card">
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {card.value}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {card.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Events Processed Sparkline */}
            {history.length > 2 && (
                <div className="monitoring-card" style={{ padding: 20 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                        Events Processed (last {history.length} samples)
                    </h2>
                    <Sparkline
                        data={history}
                        width={600}
                        height={80}
                        color="var(--color-primary)"
                        label="Events processed over time"
                    />
                </div>
            )}

            {/* Prometheus endpoint link */}
            <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
                Raw Prometheus metrics available at{' '}
                <code style={{ background: 'var(--surface-bg)', padding: '2px 6px', borderRadius: 4 }}>
                    /metrics
                </code>
            </div>
        </>
    );
}
