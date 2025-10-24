
'use client';

import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, CheckSquare, Square, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { CreateOutfitDialog } from './CreateOutfitDialog';
import { EditItemDialog } from './EditItemDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { ClothingItem, UserProfile } from '@/types';
import { deleteClothingItems } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { CategoryView } from './CategoryView';
import { ItemView } from './ItemView';

type ClosetProps = {
  items: ClothingItem[];
  userProfile: UserProfile | null;
};

const defaultCategories: Record<string, string[]> = {
    Tops: ["shirt", "t-shirt", "polo shirt", "blouse", "sweater", "hoodie", "dress"],
    Bottoms: ["pants", "jeans", "shorts", "skirt"],
    Outerwear: ["outerwear", "jacket", "blazer", "coat"],
    Footwear: ["shoes", "sneakers", "oxford shoe", "loafers", "boots", "sandals"],
    Activewear: ["sportswear", "gym shorts", "athletic shirt"],
    Underwear: ["underwear", "boxers", "briefs", "socks"],
    Formal: ["suit", "suit jacket", "tuxedo", "dress shirt"],
    Accessories: ["hat", "cap", "fedora", "sunglasses", "watch", "belt", "accessory"],
};


export default function Closet({ items: initialItems, userProfile }: ClosetProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user, withAuth } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>(initialItems);
  const [selectedItemCategory, setSelectedItemCategory] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);
  
  const userItems = useMemo(() => {
    return items.filter(item => !item.userId || item.userId === user?.uid);
  }, [items, user]);

  const displayedItems = useMemo(() => {
    if (!selectedItemCategory || selectedItemCategory === 'all') {
        return userItems;
    }

    if (selectedItemCategory === 'Other') {
        const allCategorizedTypes = Object.values(defaultCategories).flat();
        return userItems.filter(item => !allCategorizedTypes.includes(item.type.toLowerCase()));
    }

    const typesForCategory = defaultCategories[selectedItemCategory];
    if (typesForCategory) {
        return userItems.filter(item => typesForCategory.includes(item.type.toLowerCase()));
    }

    // Fallback for custom categories that might be created by the user through item editing
    return userItems.filter(item => item.type.toLowerCase() === selectedItemCategory.toLowerCase());
  }, [userItems, selectedItemCategory]);


  const handleEditItem = (item: ClothingItem) => {
      if (!isSelectionMode) { 
        setEditingItem(item);
      }
  };
  
  const toggleSelectionMode = () => {
      setIsSelectionMode(prev => !prev);
      setSelectedItems([]);
  };

  const toggleItemSelection = (itemId: string) => {
      setSelectedItems(prev => 
          prev.includes(itemId) 
              ? prev.filter(id => id !== itemId) 
              : [...prev, itemId]
      );
  };

  const isItemSelected = (itemId: string) => selectedItems.includes(itemId);

  const handleDeleteSelected = async () => {
      if (!user) {
          toast({ title: 'Not Authenticated', description: 'You must be logged in to delete items.', variant: 'destructive'});
          return;
      }
      setIsDeleting(true);
      try {
          const result = await withAuth(deleteClothingItems)(selectedItems);

          if (result.error) {
              throw new Error(result.error);
          }

          toast({
              title: 'Deleted Successfully',
              description: `${selectedItems.length} item(s) deleted from your wardrobe.`,
          });
          
          setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
          
          setSelectedItems([]);
          setIsSelectionMode(false);

      } catch (error) {
          console.error("Error deleting items:", error);
          toast({
              title: 'Deletion Failed',
              description: error instanceof Error ? error.message : 'An unknown error occurred.',
              variant: 'destructive',
          });
      } finally {
          setIsDeleting(false);
          setIsDeleteDialogOpen(false);
      }
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = displayedItems.map(item => item.id);
    if (itemsToDelete.length === 0) {
      toast({ title: 'No items to delete', variant: 'destructive' });
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await withAuth(deleteClothingItems)(itemsToDelete);
      if (result.error) throw new Error(result.error);
      
      toast({
        title: 'Success!',
        description: `Deleted ${itemsToDelete.length} items from ${selectedItemCategory || 'your wardrobe'}.`
      });

      setItems(prev => prev.filter(item => !itemsToDelete.includes(item.id)));
      if(selectedItemCategory) {
        setSelectedItemCategory(null);
      }

    } catch (error) {
       toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const bulkDeleteButtonText = selectedItemCategory && selectedItemCategory !== 'all' ? `Delete All ${capitalize(selectedItemCategory)}` : 'Delete All Items';
  const bulkDeleteDialogText = selectedItemCategory && selectedItemCategory !== 'all' ? `This will permanently delete all ${displayedItems.length} items in the "${capitalize(selectedItemCategory)}" category.` : `This will permanently delete all ${displayedItems.length} items in your wardrobe.`;


  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex gap-2">
                <Button variant={isSelectionMode ? 'secondary' : 'outline'} onClick={toggleSelectionMode}>
                    {isSelectionMode ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                    {isSelectionMode ? `Done (${selectedItems.length})` : 'Select Items'}
                </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isSelectionMode}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Outfit
              </Button>
            </div>
          </div>
            <div className="mb-4 flex gap-2">
              {isSelectionMode && selectedItems.length > 0 && (
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={isDeleting} >
                              {isDeleting ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete Selected ({selectedItems.length})
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete {selectedItems.length} item(s) from your wardrobe.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
                                  {isDeleting ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Delete
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              )}
               {!isSelectionMode && userItems.length > 0 && (
                 <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting || displayedItems.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {bulkDeleteButtonText} ({displayedItems.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {bulkDeleteDialogText} This action cannot be undone.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 />}
                                  Confirm Delete
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
               )}
            </div>
            
            {userItems.length > 0 ? (
                 selectedItemCategory === null ? (
                    <CategoryView 
                        items={userItems} 
                        onSelectCategory={setSelectedItemCategory}
                    />
                ) : (
                    <ItemView 
                        items={displayedItems}
                        category={selectedItemCategory}
                        onBack={() => setSelectedItemCategory(null)}
                        onEditItem={handleEditItem}
                        isSelectionMode={isSelectionMode}
                        isItemSelected={isItemSelected}
                        toggleItemSelection={toggleItemSelection}
                    />
                )
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">Your closet is empty!</h3>
                <p className="text-muted-foreground mt-2">
                  Start by adding some clothing items to your collection.
                </p>
              </div>
            )}
      </DndProvider>
        <CreateOutfitDialog
            isOpen={isCreateDialogOpen}
            setIsOpen={setIsCreateDialogOpen}
            items={items}
            userProfile={userProfile}
        />
        {editingItem && (
            <EditItemDialog
            isOpen={!!editingItem}
            setIsOpen={(isOpen) => !isOpen && setEditingItem(null)}
            item={editingItem}
            />
        )}
    </>
  );
}
