import {
    IconRocket,
    IconBolt,
    IconShieldLock,
    IconSkull,
    IconHeartbeat,
    IconAlertTriangle,
} from '@tabler/icons-react';

/**
 * Tabler Icon Test Page
 * 
 * This page is at a URL the service worker has never cached,
 * so it MUST be served fresh from the Next.js dev server.
 * If icons show here, Tabler Icons work — the issue is SW caching /dashboard.
 */
export default function TablerTestPage() {
    return (
        <div style={{
            background: '#000',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
            fontFamily: 'monospace',
            color: '#fff',
        }}>
            <h1 style={{ fontSize: 24, letterSpacing: 4, marginBottom: 0 }}>
                TABLER ICONS TEST
            </h1>
            <p style={{ color: '#666', marginTop: 0 }}>
                If you see SVG icons below, Tabler Icons are working.
            </p>

            <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <IconRocket size={80} stroke={1.5} color="#ff0000" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconRocket</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <IconBolt size={80} stroke={1.5} color="#06f906" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconBolt</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <IconShieldLock size={80} stroke={1.5} color="#ffffff" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconShieldLock</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <IconSkull size={80} stroke={1.5} color="#ff0000" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconSkull</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <IconHeartbeat size={80} stroke={1.5} color="#06f906" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconHeartbeat</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <IconAlertTriangle size={80} stroke={1.5} color="#ffff00" />
                    <div style={{ marginTop: 8, color: '#999' }}>IconAlertTriangle</div>
                </div>
            </div>

            <a
                href="/dashboard"
                style={{ marginTop: 32, color: '#06f906', textDecoration: 'underline', fontSize: 14 }}
            >
                ← Back to Dashboard
            </a>
        </div>
    );
}
