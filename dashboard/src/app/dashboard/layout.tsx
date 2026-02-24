'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, getStoredUser, logout } from '../../lib/api';
import SkipLink from '../../components/accessibility/SkipLink';

type NavCategory = {
    title: string;
    items: { href: string; icon: string; label: string; description: string }[];
};

const NAV_CATEGORIES: NavCategory[] = [
    {
        title: 'General',
        items: [
            { href: '/dashboard', icon: '📊', label: 'Global Overview', description: 'High-level view of your IoT fleet, health, and recent activity.' },
        ],
    },
    {
        title: 'IoT Assets & Data',
        items: [
            { href: '/dashboard/devices', icon: '📡', label: 'Device Fleet', description: 'Manage, configure, and check the status of all registered devices.' },
            { href: '/dashboard/events', icon: '⚡', label: 'Historical Events', description: 'Search and filter the permanent record of all processed events.' },
            { href: '/dashboard/events/live', icon: '📺', label: 'Live Telemetry', description: 'Real-time WebSocket stream of incoming data from the devices.' },
            { href: '/dashboard/events/dlq', icon: '☠️', label: 'Failed Events (DLQ)', description: 'Events that failed processing and need manual intervention.' },
        ],
    },
    {
        title: 'System & Health',
        items: [
            { href: '/dashboard/monitoring', icon: '🚨', label: 'Critical Alerts', description: 'Actionable security and system alerts requiring attention.' },
            { href: '/dashboard/monitoring/metrics', icon: '📈', label: 'Performance Metrics', description: 'KPIs for system throughput, latency, and uptime.' },
            { href: '/dashboard/monitoring/health', icon: '💚', label: 'Infrastructure Health', description: 'Status of the core services (PostgreSQL, RabbitMQ, Redis).' },
        ],
    },
    {
        title: 'Administration',
        items: [
            { href: '/dashboard/admin/users', icon: '👥', label: 'User Management', description: 'Manage operator access and role-based permissions.' },
            { href: '/dashboard/admin/settings', icon: '⚙️', label: 'System Settings', description: 'Global platform configuration and variables.' },
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

    if (!user) return null; // Loading state while checking auth

    return (
        <div className="app-layout">
            <SkipLink />
            {/* Sidebar */}
            <aside className="app-sidebar" role="navigation" aria-label="Main navigation">
                <div className="app-sidebar__logo">
                    <div className="app-sidebar__logo-icon">🔐</div>
                    <span className="app-sidebar__logo-text">SmartAccess</span>
                </div>

                <nav className="app-sidebar__nav" style={{ padding: '0 12px', overflowY: 'auto', flex: 1 }}>
                    {NAV_CATEGORIES.map((category) => (
                        <div key={category.title} style={{ marginBottom: 24 }}>
                            <div style={{
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-muted)',
                                padding: '0 12px',
                                marginBottom: 8,
                                fontWeight: 700
                            }}>
                                {category.title}
                            </div>
                            {category.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={item.description}
                                    className={`app-sidebar__link ${pathname === item.href ? 'app-sidebar__link--active' : ''
                                        }`}
                                    aria-current={pathname === item.href ? 'page' : undefined}
                                >
                                    <span className="app-sidebar__link-icon" aria-hidden="true">{item.icon}</span>
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
                    <button className="btn btn--ghost btn--sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
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
                            background: 'var(--surface-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            fontSize: 14,
                        },
                        success: {
                            iconTheme: { primary: 'var(--color-success)', secondary: '#fff' },
                        },
                        error: {
                            iconTheme: { primary: 'var(--color-error)', secondary: '#fff' },
                        }
                    }}
                />
            </main>
        </div>
    );
}

