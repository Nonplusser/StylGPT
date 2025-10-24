
'use client';

import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { getUserProfile } from '@/app/actions/user';
import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth'; 
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types'; 

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth(); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      redirect('/login');
      return;
    }

    const fetchUserProfile = async () => {
      setDataLoading(true);
      try {
        const profile = await getUserProfile(user.uid); 
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, authLoading]); 

  if (authLoading || dataLoading || !user || !userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {user.displayName || user.email}!</h2>
        <p className="text-muted-foreground mt-2">
            Manage your account settings. This is a placeholder and will be updated.
        </p>
        {user.providerData && (
           <p className="text-muted-foreground mt-2">
             Password set: {user.providerData.some(provider => provider.providerId === 'password') ? 'Yes' : 'No'}
           </p>
        )}
       </div>
    </div>
  );
}
