'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchEvent, retryEvent, type DomainEvent } from '../../../../lib/api';

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventUuid = params.uuid as string;

    const [event, setEvent] = useState<DomainEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [retryResult, setRetryResult] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const ev = await fetchEvent(eventUuid);
                setEvent(ev);
            } catch {
                // empty
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [eventUuid]);

    const handleRetry = async () => {
        setRetrying(true);
        setRetryResult(null);
        try {
            await retryEvent(eventUuid);
            setRetryResult('Retry submitted successfully');
            // Reload event to get updated status
            const updated = await fetchEvent(eventUuid);
            setEvent(updated);
        } catch {
            setRetryResult('Retry failed');
        } finally {
            setRetrying(false);
        }
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading event…</div>;
    }

    if (!event) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Event not found.</div>;
    }

    const canRetry = event.processingStatus === 'FAILED' || event.processingStatus === 'DEAD_LETTERED';

    return (
        <>
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
                {' > '}
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard/events')}>Events</span>
                {' > '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{eventUuid.slice(0, 8)}…</span>
            </nav>

            {/* Header */}
            <div className="app-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="app-header__title">{event.eventType}</h1>
                    <p className="app-header__subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {event.eventUuid}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${event.processingStatus === 'PROCESSED' ? 'badge--online' : event.processingStatus === 'FAILED' ? 'badge--error' : 'badge--maintenance'}`}>
                        <span className="badge__dot" />
                        {event.processingStatus}
                    </span>
                    {canRetry && (
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={handleRetry}
                            disabled={retrying}
                        >
                            {retrying ? '⏳ Retrying…' : '🔄 Retry'}
                        </button>
                    )}
                </div>
            </div>

            {/* Retry feedback */}
            {retryResult && (
                <div
                    role="status"
                    aria-live="polite"
                    className="card"
                    style={{
                        padding: '8px 16px',
                        marginBottom: 16,
                        background: retryResult.includes('success') ? 'var(--color-device-online)' : 'var(--color-device-error)',
                        color: 'white',
                        borderRadius: 6,
                        fontSize: 13,
                    }}
                >
                    {retryResult}
                </div>
            )}

            {/* Event Info Card */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>Event Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Event UUID</p>
                        <p style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{event.eventUuid}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Event Type</p>
                        <p style={{ fontWeight: 500 }}>{event.eventType}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Device ID</p>
                        <p style={{ fontWeight: 500 }}>{event.deviceId}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Processing Status</p>
                        <p style={{ fontWeight: 500 }}>{event.processingStatus}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Retry Count</p>
                        <p style={{ fontWeight: 500 }}>{event.retryCount}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Received At</p>
                        <p style={{ fontWeight: 500 }}>{formatDate(event.receivedAt)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Idempotency Key</p>
                        <p style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{event.idempotencyKey}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Created At</p>
                        <p style={{ fontWeight: 500 }}>{formatDate(event.createdAt)}</p>
                    </div>
                </div>
            </div>

            {/* Payload */}
            <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>Payload</h2>
                <pre style={{
                    background: 'var(--surface-bg)',
                    padding: 16,
                    borderRadius: 8,
                    overflow: 'auto',
                    maxHeight: 400,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    lineHeight: 1.6,
                }}>
                    {JSON.stringify(event.payload, null, 2)}
                </pre>
            </div>
        </>
    );
}
