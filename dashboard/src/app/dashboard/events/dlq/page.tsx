'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDeadLetterEvents, type DeadLetterEvent } from '../../../../lib/api';

export default function DLQPage() {
    const router = useRouter();
    const [events, setEvents] = useState<DeadLetterEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await fetchDeadLetterEvents();
            setEvents(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

    return (
        <>
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
                {' > '}
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/dashboard/events')}>Events</span>
                {' > '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dead Letter Queue</span>
            </nav>

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Dead Letter Queue</h1>
                    <p className="app-header__subtitle">
                        {events.length} failed event{events.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            <div className="table-container">
                <table className="table">
                    <caption style={{ textAlign: 'left', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                        Events that failed permanently after exhausting retries
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Original Event ID</th>
                            <th scope="col">Failure Reason</th>
                            <th scope="col">Moved At</th>
                            <th scope="col">Payload</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    🎉 No dead-lettered events — all events processed successfully.
                                </td>
                            </tr>
                        ) : (
                            events.map((ev) => (
                                <tr key={ev.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ev.id}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ev.originalEventId}</td>
                                    <td>
                                        <span
                                            className="badge badge--error"
                                            style={{ fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
                                            title={ev.failureReason}
                                        >
                                            {ev.failureReason}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(ev.movedAt)}</td>
                                    <td>
                                        <details>
                                            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--color-primary)' }}>
                                                View payload
                                            </summary>
                                            <pre style={{
                                                marginTop: 8,
                                                background: 'var(--surface-bg)',
                                                padding: 12,
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontFamily: 'var(--font-mono)',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}>
                                                {JSON.stringify(ev.payload, null, 2)}
                                            </pre>
                                        </details>
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
