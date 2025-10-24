
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { savePlannerEntry } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Outfit, PlannerEntry, ClothingItem } from '@/types';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

type AssignOutfitDialogProps = {
  isOpen: boolean;
  onClose: (newEntries?: PlannerEntry[]) => void;
  selectedDate: Date;
  allOutfits: (Outfit & { items: ClothingItem[] })[];
  plannerEntries: PlannerEntry[];
};

export function AssignOutfitDialog({ isOpen, onClose, selectedDate, allOutfits, plannerEntries }: AssignOutfitDialogProps) {
  const dateString = selectedDate.toISOString().split('T')[0];
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { withAuth, user } = useAuth();

  useEffect(() => {
    const entry = plannerEntries.find(e => e.date === dateString);
    setSelectedOutfitIds(entry ? entry.outfitIds : []);
  }, [dateString, plannerEntries]);

  const handleOutfitSelect = (outfitId: string) => {
    setSelectedOutfitIds(prev =>
      prev.includes(outfitId) ? prev.filter(id => id !== outfitId) : [...prev, outfitId]
    );
  };

  const handleSave = async () => {
    await withAuth(savePlannerEntry)(dateString, selectedOutfitIds);
    toast({ title: 'Plan Saved!', description: 'Your outfits have been scheduled.' });
    
    const updatedEntries = [...plannerEntries.filter(e => e.date !== dateString)];
    if (selectedOutfitIds.length > 0 && user) {
      updatedEntries.push({ date: dateString, outfitIds: selectedOutfitIds, userId: user.uid });
    }
    
    onClose(updatedEntries);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            Assign Outfits for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </DialogTitle>
          <DialogDescription>Select the outfits you want to wear on this day.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-72 my-4">
          <div className="space-y-4 pr-4">
            {allOutfits.length > 0 ? allOutfits.map(outfit => {
              const firstItem = outfit.items[0];
              const imageUrl = firstItem ? firstItem.photoUrl : null;
              
              return (
              <div key={outfit.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/50 transition-colors">
                <Checkbox
                  id={`outfit-${outfit.id}`}
                  checked={selectedOutfitIds.includes(outfit.id)}
                  onCheckedChange={() => handleOutfitSelect(outfit.id)}
                />
                <Label htmlFor={`outfit-${outfit.id}`} className="flex-grow cursor-pointer flex items-center gap-4">
                  <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex-shrink-0 relative">
                     {imageUrl && <Image src={imageUrl} alt={outfit.name} fill className="object-contain" />}
                  </div>
                  <div>
                    <p className="font-semibold">{outfit.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{outfit.description}</p>
                  </div>
                </Label>
              </div>
            )}) : <p className="text-muted-foreground text-center">No outfits available. Create one in your wardrobe!</p>}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose()}>Cancel</Button>
          <Button onClick={handleSave}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
