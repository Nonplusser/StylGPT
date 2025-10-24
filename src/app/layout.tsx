
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/providers';

export const metadata: Metadata = {
  title: 'StyleAI Wardrobe',
  description: 'Organize your wardrobe and plan your outfits with AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
          <Providers>
            {children}
          </Providers>
      </body>
    </html>
  );
}
