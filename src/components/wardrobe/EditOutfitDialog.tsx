
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { updateOutfit } from '@/app/actions';
import { Loader2, Save } from 'lucide-react';
import type { ClothingItem, Outfit } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const outfitCategories = [
    'Casual', 'Business Casual', 'Activewear', 'Loungewear', 'Night Out', 'Smart Casual', 'Vacation', 'Seasonal', 'Special Occasion', 'Formal'
];

type EditOutfitDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  outfit: Outfit;
  allItems: ClothingItem[];
};

export function EditOutfitDialog({ isOpen, setIsOpen, outfit, allItems }: EditOutfitDialogProps) {
  const [name, setName] = useState(outfit.name);
  const [description, setDescription] = useState(outfit.description);
  const [category, setCategory] = useState(outfit.category);
  const [selectedItemIds, setSelectedItemIds] = useState(outfit.itemIds);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { withAuth } = useAuth();

  useEffect(() => {
    setName(outfit.name);
    setDescription(outfit.description);
    setCategory(outfit.category);
    setSelectedItemIds(outfit.itemIds);
  }, [outfit]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSave = async () => {
    if (!name || selectedItemIds.length === 0) {
        toast({ title: 'Error', description: 'Outfit name and at least one item are required.', variant: 'destructive' });
        return;
    }
    if (!category) {
        toast({ title: 'Error', description: 'Please select a category.', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    try {
        const result = await withAuth(updateOutfit)({
          id: outfit.id,
          name,
          description,
          category,
          itemIds: selectedItemIds,
          itemLayouts: outfit.itemLayouts, // Preserve existing layouts
        });
        if(result?.error) throw new Error(result.error);
        toast({ title: 'Success!', description: 'Outfit has been updated.' });
        setIsOpen(false);
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update outfit.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Outfit</DialogTitle>
          <DialogDescription>Update the name, description, or items in this outfit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="outfit-name-edit">Outfit Name</Label>
                    <Input id="outfit-name-edit" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="outfit-category-edit">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="outfit-category-edit">
                            <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {outfitCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          <div>
            <Label htmlFor="outfit-description-edit">Description</Label>
            <Textarea id="outfit-description-edit" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Select Items</Label>
            <ScrollArea className="h-60 border rounded-md p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {allItems.map((item) => {
                  const imageUrl = item.photoUrl;
                  return (
                    <div key={item.id} className="relative">
                      <label htmlFor={`edit-item-${item.id}`} className="cursor-pointer group">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.type}
                            width={150}
                            height={150}
                            className="rounded-lg aspect-square object-contain transition-opacity group-hover:opacity-80"
                          />
                        ) : (
                           <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg aspect-square">
                            <span className="text-muted-foreground text-xs">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-1 right-1">
                          <Checkbox
                            id={`edit-item-${item.id}`}
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => handleItemSelect(item.id)}
                          />
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
