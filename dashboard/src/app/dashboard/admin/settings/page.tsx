'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import LiveRegion from '../../../../components/accessibility/LiveRegion';
import { IconBolt, IconPlugConnected, IconBoxPadding, IconShieldLock } from '@tabler/icons-react';

interface SettingGroup {
    title: string;
    icon: React.ReactNode;
    settings: Setting[];
}

interface Setting {
    key: string;
    label: string;
    description: string;
    type: 'toggle' | 'number' | 'select';
    value: string | number | boolean;
    options?: string[];
}

const INITIAL_SETTINGS: SettingGroup[] = [
    {
        title: 'Event Processing',
        icon: <IconBolt size={20} stroke={2} />,
        settings: [
            { key: 'maxRetries', label: 'Max Retries', description: 'Maximum number of retry attempts before DLQ', type: 'number', value: 5 },
            { key: 'retryDelay', label: 'Base Retry Delay (ms)', description: 'Initial delay for exponential backoff', type: 'number', value: 1000 },
            { key: 'prefetch', label: 'Consumer Prefetch', description: 'Number of messages prefetched by consumer', type: 'number', value: 1 },
        ],
    },
    {
        title: 'WebSocket',
        icon: <IconPlugConnected size={20} stroke={2} />,
        settings: [
            { key: 'wsBroadcast', label: 'Broadcast Events', description: 'Send events to dashboard in real-time', type: 'toggle', value: true },
            { key: 'wsHeartbeat', label: 'Heartbeat Interval (s)', description: 'Interval for WebSocket keepalive pings', type: 'number', value: 30 },
        ],
    },
    {
        title: 'Outbox',
        icon: <IconBoxPadding size={20} stroke={2} />,
        settings: [
            { key: 'outboxInterval', label: 'Poll Interval (ms)', description: 'How often the outbox processor polls for pending events', type: 'number', value: 5000 },
            { key: 'outboxBatch', label: 'Batch Size', description: 'Number of outbox events processed per poll', type: 'number', value: 10 },
        ],
    },
    {
        title: 'Security',
        icon: <IconShieldLock size={20} stroke={2} />,
        settings: [
            { key: 'jwtExpiry', label: 'JWT Expiry', description: 'Token expiration time', type: 'select', value: '24h', options: ['1h', '8h', '24h', '7d'] },
            { key: 'rateLimitWindow', label: 'Rate Limit Window (s)', description: 'Time window for rate limiting', type: 'number', value: 60 },
            { key: 'rateLimitMax', label: 'Rate Limit Max Requests', description: 'Max requests per window per IP', type: 'number', value: 100 },
        ],
    },
];

export default function SettingsPage() {
    const [groups, setGroups] = useState(INITIAL_SETTINGS);
    const [statusMsg, setStatusMsg] = useState('');
    const [modified, setModified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch initial settings from API
    useEffect(() => {
        async function loadSettings() {
            try {
                const { fetchSettings } = await import('../../../../lib/api');
                const dbSettings = await fetchSettings();

                // Merge DB settings into the UI structure
                setGroups(prev => prev.map(group => ({
                    ...group,
                    settings: group.settings.map(setting => ({
                        ...setting,
                        value: dbSettings[setting.key]?.value ?? setting.value
                    }))
                })));
            } catch (err) {
                console.error('Failed to load settings:', err);
                setStatusMsg('Failed to load system settings');
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, []);

    const updateSetting = (groupIdx: number, settingKey: string, newValue: string | number | boolean) => {
        setGroups((prev) =>
            prev.map((g, gi) =>
                gi === groupIdx
                    ? {
                        ...g,
                        settings: g.settings.map((s) =>
                            s.key === settingKey ? { ...s, value: newValue } : s,
                        ),
                    }
                    : g,
            ),
        );
        setModified(true);
    };

    const handleSave = async () => {
        try {
            setStatusMsg('Saving settings...');
            const { updateSettings } = await import('../../../../lib/api');

            // Flatten groups into a key-value record
            const payload: Record<string, any> = {};
            for (const group of groups) {
                for (const setting of group.settings) {
                    payload[setting.key] = setting.value;
                }
            }

            await updateSettings(payload);
            setStatusMsg('Settings saved successfully');
            setModified(false);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setStatusMsg('Failed to save system settings');
        }
    };

    const handleReset = async () => {
        setStatusMsg('Resetting settings...');
        try {
            const { fetchSettings } = await import('../../../../lib/api');
            const dbSettings = await fetchSettings();

            // Restore DB settings
            setGroups(INITIAL_SETTINGS.map(group => ({
                ...group,
                settings: group.settings.map(setting => ({
                    ...setting,
                    value: dbSettings[setting.key]?.value ?? setting.value
                }))
            })));

            setModified(false);
            setStatusMsg('Settings reset to last saved state');
        } catch (err) {
            console.error('Failed to reset settings:', err);
            setStatusMsg('Failed to reset settings');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <>
            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Admin' },
                { label: 'Settings' },
            ]} />
            <LiveRegion message={statusMsg} />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">System Settings</h1>
                    <p className="app-header__subtitle">Configure event processing, WebSocket, and security parameters</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {modified && (
                        <button className="btn btn--primary btn--sm" onClick={handleSave}>💾 Save Changes</button>
                    )}
                    <button className="btn btn--ghost btn--sm" onClick={handleReset}>↻ Reset</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {groups.map((group, gi) => (
                    <div key={group.title} className="monitoring-card" style={{ padding: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{group.icon}</span> {group.title}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {group.settings.map((setting) => (
                                <div
                                    key={setting.key}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border-color)',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {setting.label}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {setting.description}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 24, flexShrink: 0, width: 120, display: 'flex', justifyContent: 'flex-end' }}>
                                        {setting.type === 'toggle' ? (
                                            <button
                                                className={`btn btn--sm ${setting.value ? 'btn--primary' : 'btn--ghost'}`}
                                                onClick={() => updateSetting(gi, setting.key, !setting.value)}
                                                role="switch"
                                                aria-checked={!!setting.value}
                                                aria-label={setting.label}
                                            >
                                                {setting.value ? 'ON' : 'OFF'}
                                            </button>
                                        ) : setting.type === 'select' ? (
                                            <select
                                                value={setting.value as string}
                                                onChange={(e) => updateSetting(gi, setting.key, e.target.value)}
                                                className="form-input"
                                                style={{ fontSize: 12, padding: '4px 8px' }}
                                                aria-label={setting.label}
                                            >
                                                {setting.options?.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="number"
                                                value={setting.value as number}
                                                onChange={(e) => updateSetting(gi, setting.key, parseInt(e.target.value) || 0)}
                                                className="form-input"
                                                style={{ width: 100, fontSize: 12, padding: '4px 8px', textAlign: 'right' }}
                                                aria-label={setting.label}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
