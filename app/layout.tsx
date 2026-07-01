// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SI-POKJA HUMKER | Manajemen Data Hukum & Kerja Sama',
  description: 'Platform digital untuk mengelola MOU, MOA, dan dokumen kerja sama antar institusi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}