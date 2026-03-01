import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartAccess — IoT Dashboard',
  description: 'Real-time IoT device monitoring and management platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartAccess',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  if (location.hostname === 'localhost') {
                    // In development: unregister all service workers so hot-reload works
                    navigator.serviceWorker.getRegistrations().then(regs => {
                      regs.forEach(reg => reg.unregister());
                      console.log('[SW] Unregistered in dev mode');
                    });
                  } else {
                    navigator.serviceWorker.register('/sw.js')
                      .then(reg => console.log('[SW] Registered:', reg.scope))
                      .catch(err => console.warn('[SW] Registration failed:', err));
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
