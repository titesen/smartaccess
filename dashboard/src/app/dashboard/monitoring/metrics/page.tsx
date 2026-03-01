'use client';

import { useState, useEffect } from 'react';
import { fetchMetricsSummary, type MetricsSummary } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import Sparkline from '../../../../components/charts/Sparkline';
import {
    IconClock,
    IconMessageCircle,
    IconAlertCircle,
    IconDeviceLaptop,
    IconSkull,
    IconBolt,
    IconRefresh,
    type Icon,
} from '@tabler/icons-react';

interface MetricCard {
    label: string;
    value: string;
    Icon: Icon;
    color: string;
}

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
        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const cards: MetricCard[] = metrics
        ? [
            { label: 'Uptime', value: formatUptime(metrics.uptime), Icon: IconClock, color: 'var(--accent-blue)' },
            { label: 'Events Processed', value: metrics.eventsProcessed.toLocaleString(), Icon: IconMessageCircle, color: 'var(--color-primary)' },
            { label: 'Events Failed', value: metrics.eventsFailed.toLocaleString(), Icon: IconAlertCircle, color: 'var(--accent-red)' },
            { label: 'Devices Online', value: `${metrics.devicesOnline} / ${metrics.devicesTotal}`, Icon: IconDeviceLaptop, color: 'var(--color-success)' },
            { label: 'DLQ Size', value: metrics.dlqSize.toLocaleString(), Icon: IconSkull, color: 'var(--accent-red)' },
            { label: 'Avg Processing', value: `${metrics.avgProcessingMs.toFixed(1)} ms`, Icon: IconBolt, color: 'var(--accent-blue)' },
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
                    <h1 className="app-header__title" style={{ fontSize: 44, color: 'var(--accent-blue)', fontStyle: 'italic', textTransform: 'uppercase' }}>System Metrics</h1>
                    <div style={{ height: '4px', background: 'var(--border-color)', width: '100%', marginBottom: '8px' }} />
                    <p className="app-header__subtitle">
                        {loading ? 'Loading…' : 'Auto-refreshing every 3s'}
                    </p>
                </div>
                <button className="btn btn--primary" onClick={load} style={{ gap: 6 }}>
                    <IconRefresh size={15} stroke={2} />
                    Reload Data
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {cards.map((card) => (
                    <div key={card.label} className="monitoring-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flex: 1 }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{card.label}</p>
                                <p style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{card.value}</p>
                            </div>
                            <card.Icon size={32} stroke={1.4} color={card.color} style={{ paddingBottom: 4, flexShrink: 0 }} />
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
                RAW PROMETHEUS METRICS AVAILABLE AT{' '}
                <code style={{ background: 'var(--bg-card)', padding: '4px 8px', border: 'var(--border-width-thick) solid var(--border-color)', color: 'var(--text-primary)' }}>
                    /metrics
                </code>
            </div>
        </>
    );
}
