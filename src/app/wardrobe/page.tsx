
'use client';

import { getClothingItems } from '@/app/actions';
import { getUserProfile } from '@/app/actions/user';
import Closet from '@/components/wardrobe/Closet';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ClothingItem, UserProfile } from '@/types';
import { redirect } from 'next/navigation';

export default function WardrobePage() {
  const { user, loading, withAuth } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirect('/login');
      return;
    }

    const fetchData = async () => {
      setDataLoading(true);
      const [userItems, userProfile] = await Promise.all([
        getClothingItems(user.uid),
        getUserProfile(user.uid),
      ]);
      setItems(userItems);
      setProfile(userProfile);
      setDataLoading(false);
    };

    fetchData();
  }, [user, loading, withAuth]);

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline text-primary">My Wardrobe</h1>
        <p className="text-muted-foreground mt-2">
          View your collection, create new outfits, and manage your style.
        </p>
      </div>
      <Closet items={items} userProfile={profile} />
    </div>
  );
}
