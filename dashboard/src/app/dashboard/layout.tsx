'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, getStoredUser, logout } from '../../lib/api';
import SkipLink from '../../components/accessibility/SkipLink';
import {
    IconLayoutDashboard,
    IconDeviceDesktopAnalytics,
    IconBolt,
    IconPlayerPlay,
    IconSkull,
    IconAlertTriangle,
    IconChartBar,
    IconHeartbeat,
    IconUsers,
    IconSettings,
    IconShieldLock,
    IconLogout,
    IconFileDescription,
    type Icon,
} from '@tabler/icons-react';

type NavCategory = {
    title: string;
    items: {
        href: string;
        Icon: Icon;
        label: string;
        description: string;
    }[];
};

const NAV_CATEGORIES: NavCategory[] = [
    {
        title: 'General',
        items: [
            { href: '/dashboard', Icon: IconLayoutDashboard, label: 'Global Overview', description: 'High-level view of your IoT fleet, health, and recent activity.' },
        ],
    },
    {
        title: 'IoT Assets & Data',
        items: [
            { href: '/dashboard/devices', Icon: IconDeviceDesktopAnalytics, label: 'Device Fleet', description: 'Manage, configure, and check the status of all registered devices.' },
            { href: '/dashboard/events', Icon: IconBolt, label: 'Historical Events', description: 'Search and filter the permanent record of all processed events.' },
            { href: '/dashboard/events/live', Icon: IconPlayerPlay, label: 'Live Telemetry', description: 'Real-time WebSocket stream of incoming data from the devices.' },
            { href: '/dashboard/events/dlq', Icon: IconSkull, label: 'Failed Events (DLQ)', description: 'Events that failed processing and need manual intervention.' },
        ],
    },
    {
        title: 'System & Health',
        items: [
            { href: '/dashboard/monitoring', Icon: IconAlertTriangle, label: 'Critical Alerts', description: 'Actionable security and system alerts requiring attention.' },
            { href: '/dashboard/monitoring/metrics', Icon: IconChartBar, label: 'Performance Metrics', description: 'KPIs for system throughput, latency, and uptime.' },
            { href: '/dashboard/monitoring/health', Icon: IconHeartbeat, label: 'Infrastructure Health', description: 'Status of the core services (PostgreSQL, RabbitMQ, Redis).' },
        ],
    },
    {
        title: 'Administration',
        items: [
            { href: '/dashboard/admin/users', Icon: IconUsers, label: 'User Management', description: 'Manage operator access and role-based permissions.' },
            { href: '/dashboard/admin/settings', Icon: IconSettings, label: 'System Settings', description: 'Global platform configuration and variables.' },
            { href: '/dashboard/admin/audit', Icon: IconFileDescription, label: 'Audit Logs', description: 'System-wide immutable trail of security and configuration changes.' },
        ],
    }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        setUser(getStoredUser());
    }, [router]);

    if (!user) return null;

    return (
        <div className="app-layout">
            <SkipLink />
            {/* Sidebar */}
            <aside className="app-sidebar" role="navigation" aria-label="Main navigation">
                <div className="app-sidebar__logo">
                    <div className="app-sidebar__logo-icon">
                        <IconShieldLock size={28} stroke={2} />
                    </div>
                    <span className="app-sidebar__logo-text">SmartAccess</span>
                </div>

                <nav className="app-sidebar__nav" style={{ padding: '0 12px', overflowY: 'auto', flex: 1 }}>
                    {NAV_CATEGORIES.map((category) => (
                        <div key={category.title} style={{ marginBottom: 24 }}>
                            <div style={{
                                fontSize: 13,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: 'var(--text-primary)',
                                padding: '4px 12px',
                                marginBottom: 12,
                                fontWeight: 700,
                                borderBottom: 'var(--border-width-thick) solid var(--accent-blue)',
                                display: 'inline-block'
                            }}>
                                {category.title}
                            </div>
                            {category.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={item.description}
                                    className={`app-sidebar__link ${pathname === item.href ? 'app-sidebar__link--active' : ''}`}
                                    aria-current={pathname === item.href ? 'page' : undefined}
                                >
                                    <span className="app-sidebar__link-icon" aria-hidden="true">
                                        <item.Icon size={18} stroke={1.75} />
                                    </span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="app-sidebar__footer">
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {user.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        Role: {user.role}
                    </div>
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={logout}
                        style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                    >
                        <IconLogout size={15} stroke={1.75} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main id="main-content" className="app-main" role="main">
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            border: 'var(--border-width-thick) solid var(--border-color)',
                            fontSize: 14,
                            borderRadius: '0px',
                            boxShadow: '4px 4px 0px 0px var(--border-color)',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-mono)'
                        },
                        success: {
                            iconTheme: { primary: 'var(--color-success)', secondary: '#000' },
                        },
                        error: {
                            iconTheme: { primary: 'var(--color-error)', secondary: '#000' },
                        }
                    }}
                />
            </main>
        </div>
    );
}
