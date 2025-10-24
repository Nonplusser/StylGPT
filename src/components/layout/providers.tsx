
'use client';

import { AuthProvider } from '@/hooks/use-auth';
import Header from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            <Toaster />
        </AuthProvider>
    );
}
