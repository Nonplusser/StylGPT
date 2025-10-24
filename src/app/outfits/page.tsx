
'use client';

import { getClothingItems, getOutfits } from '@/app/actions';
import { getUserProfile } from '@/app/actions/user';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import type { ClothingItem, Outfit, UserProfile } from '@/types';
import { redirect } from 'next/navigation';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { CreateOutfitDialog } from '@/components/wardrobe/CreateOutfitDialog';
import { EditOutfitDialog } from '@/components/wardrobe/EditOutfitDialog';
import OutfitCard from '@/components/wardrobe/OutfitCard';
import { OutfitCategoryView } from '@/components/wardrobe/OutfitCategoryView';
import { ArrowLeft } from 'lucide-react';

export default function OutfitsPage() {
  const { user, loading, withAuth } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [selectedOutfitCategory, setSelectedOutfitCategory] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirect('/login');
      return;
    }

    const fetchData = async () => {
      setDataLoading(true);
      const [userItems, userOutfits, userProfile] = await Promise.all([
        getClothingItems(user.uid),
        withAuth(getOutfits)(),
        getUserProfile(user.uid),
      ]);
      setItems(userItems);
      setOutfits(userOutfits);
      setProfile(userProfile);
      setDataLoading(false);
    };

    fetchData();
  }, [user, loading, withAuth]);
  
  const displayedOutfits = outfits.filter(o => !selectedOutfitCategory || selectedOutfitCategory === 'all' || o.category === selectedOutfitCategory);

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="space-y-8">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary flex items-center gap-3">
                <Sparkles />
                My Outfits
              </h1>
              <p className="text-muted-foreground mt-2">
                Your curated looks and AI-generated styles.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle />
                Create Outfit
              </Button>
            </div>
          </div>
          
            {outfits.length > 0 ? (
                 selectedOutfitCategory === null ? (
                    <OutfitCategoryView 
                        outfits={outfits}
                        onSelectCategory={setSelectedOutfitCategory}
                    />
                 ) : (
                    <div className="space-y-4">
                        <Button variant="outline" onClick={() => setSelectedOutfitCategory(null)}>
                            <ArrowLeft className="mr-2" /> Back to Categories
                        </Button>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayedOutfits.map((outfit) => (
                            <OutfitCard key={outfit.id} outfit={outfit} allItems={items} onEdit={() => setEditingOutfit(outfit)} />
                            ))}
                        </div>
                    </div>
                 )
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No outfits created yet!</h3>
                <p className="text-muted-foreground mt-2">
                  Create your first outfit from your collection.
                </p>
              </div>
            )}
        </div>
      </DndProvider>

      <CreateOutfitDialog
        isOpen={isCreateDialogOpen}
        setIsOpen={setIsCreateDialogOpen}
        items={items}
        userProfile={profile}
      />

      {editingOutfit && (
        <EditOutfitDialog
            isOpen={!!editingOutfit}
            setIsOpen={(isOpen) => !isOpen && setEditingOutfit(null)}
            outfit={editingOutfit}
            allItems={items}
        />
      )}
    </>
  );
}
