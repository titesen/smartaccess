'use client';

import { useState, useEffect } from 'react';
import { fetchDevices, updateDeviceStatus, type Device } from '../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
    ONLINE: 'badge--online',
    OFFLINE: 'badge--offline',
    ERROR: 'badge--error',
    MAINTENANCE: 'badge--maintenance',
    REGISTERED: 'badge--registered',
    DECOMMISSIONED: 'badge--offline',
};

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const load = async () => {
        try {
            const data = await fetchDevices();
            setDevices(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleStatusChange = async (uuid: string, status: string) => {
        setActionLoading(uuid);
        try {
            const updated = await updateDeviceStatus(uuid, status);
            setDevices((prev) => prev.map((d) => (d.deviceUuid === uuid ? updated : d)));
        } catch {
            // ignore for now
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

    return (
        <>
            <div className="app-header">
                <div>
                    <h1 className="app-header__title">Devices</h1>
                    <p className="app-header__subtitle">{devices.length} registered devices</p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>UUID</th>
                            <th>Status</th>
                            <th>Location</th>
                            <th>Firmware</th>
                            <th>Last Seen</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        ) : devices.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No devices found. The simulator will create them automatically.
                                </td>
                            </tr>
                        ) : (
                            devices.map((device) => (
                                <tr key={device.deviceUuid}>
                                    <td style={{ fontWeight: 600 }}>{device.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {device.deviceUuid.slice(0, 8)}…
                                    </td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[device.status] || 'badge--offline'}`}>
                                            <span className="badge__dot" />
                                            {device.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{device.location || '—'}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                        {device.firmwareVersion || '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {formatDate(device.lastSeenAt)}
                                    </td>
                                    <td>
                                        {device.status === 'ONLINE' && (
                                            <button
                                                className="btn btn--ghost btn--sm"
                                                onClick={() => handleStatusChange(device.deviceUuid, 'MAINTENANCE')}
                                                disabled={actionLoading === device.deviceUuid}
                                            >
                                                🔧 Maintenance
                                            </button>
                                        )}
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
