
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { createAndSaveOutfit, generateOutfit } from '@/app/actions';
import { Wand2, Loader2, Save, Shirt } from 'lucide-react';
import type { ClothingItem, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type GeneratedOutfit = {
    name: string;
    description: string;
    category: string;
    itemIds: string[];
}

const outfitCategories = [
    'Casual', 'Business Casual', 'Activewear', 'Loungewear', 'Night Out', 'Smart Casual', 'Vacation', 'Seasonal', 'Special Occasion', 'Formal'
];

type CreateOutfitDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  items: ClothingItem[];
  userProfile: UserProfile | null;
};

export function CreateOutfitDialog({ isOpen, setIsOpen, items, userProfile }: CreateOutfitDialogProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [outfitCategory, setOutfitCategory] = useState('');
  const [outfitDescription, setOutfitDescription] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [stylePreferences, setStylePreferences] = useState('');
  const [outfitRequirements, setOutfitRequirements] = useState('');
  const [generatedOutfits, setGeneratedOutfits] = useState<GeneratedOutfit[]>([]);
  const [selectedGeneratedOutfits, setSelectedGeneratedOutfits] = useState<number[]>([]);

  const { toast } = useToast();
  const { user, withAuth } = useAuth();
  
  useEffect(() => {
    if (isOpen) {
        setSelectedItems(items.map(item => item.id));
        setActiveTab('ai'); // Default to AI tab on open
        if (userProfile?.stylePreferences) {
            setStylePreferences(userProfile.stylePreferences.join(', '));
        }
    }
  }, [isOpen, items, userProfile]);

  const clearState = () => {
    setSelectedItems([]);
    setOutfitName('');
    setOutfitDescription('');
    setOutfitCategory('');
    setGeneratedOutfits([]);
    setSelectedGeneratedOutfits([]);
    setStylePreferences(userProfile?.stylePreferences?.join(', ') || '');
    setOutfitRequirements('');
    setActiveTab('ai');
  }

  const handleClose = () => {
      clearState();
      setIsOpen(false);
  }

  const handleItemSelect = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleGenerateAI = async () => {
    if (!user) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to generate an outfit.', variant: 'destructive'});
        return;
    }
    setIsAiLoading(true);
    setGeneratedOutfits([]);
    try {
        const result = await withAuth(generateOutfit)(stylePreferences, outfitRequirements);
        if ('error' in result) throw new Error(result.error);
        if (result.outfits.length === 0) {
            toast({ title: 'No outfits generated', description: 'Try adjusting your preferences or adding more items.' });
        } else {
            setGeneratedOutfits(result.outfits);
            toast({ title: `${result.outfits.length} Outfits Generated!`, description: 'Review the suggestions below.' });
        }
    } catch (error) {
        toast({ title: 'AI Generation Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
        setIsAiLoading(false);
    }
  };
  
  const handleToggleGeneratedSelection = (index: number) => {
      setSelectedGeneratedOutfits(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
  };

  const handleSaveOutfit = async () => {
    if (activeTab === 'manual') {
        if (!outfitName) {
            toast({ title: 'Error', description: 'Please provide a name for your outfit.', variant: 'destructive' });
            return;
        }
        if (!outfitCategory) {
            toast({ title: 'Error', description: 'Please select a category for your outfit.', variant: 'destructive' });
            return;
        }
        if (selectedItems.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one item for the outfit.', variant: 'destructive' });
            return;
        }
        const result = await withAuth(createAndSaveOutfit)(outfitName, outfitDescription, outfitCategory, selectedItems);
        if(result?.error) {
            toast({ title: 'Error saving outfit', description: result.error, variant: 'destructive' });
            return;
        }
        toast({ title: 'Success!', description: 'Your new outfit has been saved.' });
    } else { // AI Tab
        if(selectedGeneratedOutfits.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one generated outfit to save.', variant: 'destructive' });
            return;
        }
        
        const outfitsToSave = selectedGeneratedOutfits.map(i => generatedOutfits[i]);
        let savedCount = 0;

        for (const outfit of outfitsToSave) {
            const result = await withAuth(createAndSaveOutfit)(outfit.name, outfit.description, outfit.category, outfit.itemIds);
            if (!result.error) {
                savedCount++;
            }
        }
        toast({ title: 'Success!', description: `${savedCount} of ${outfitsToSave.length} selected outfits have been saved.`});
    }

    handleClose();
  };
  
  const getSaveButtonText = () => {
      if(activeTab === 'manual') return 'Save Outfit';
      const count = selectedGeneratedOutfits.length;
      if (count === 0) return 'Save Selected';
      if (count === 1) return 'Save 1 Outfit';
      return `Save ${count} Outfits`;
  }

  const allOutfitIndices = generatedOutfits.map((_, index) => `item-${index}`);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Create a New Outfit</DialogTitle>
          <DialogDescription>
            Assemble an outfit manually or use AI to get suggestions based on your wardrobe.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual"><Shirt className="mr-2 h-4 w-4" />Manual</TabsTrigger>
            <TabsTrigger value="ai"><Wand2 className="mr-2 h-4 w-4" />Generate with AI</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className='grid grid-cols-2 gap-4'>
                <div>
                    <Label htmlFor="outfitName">Outfit Name</Label>
                    <Input id="outfitName" value={outfitName} onChange={(e) => setOutfitName(e.target.value)} placeholder="e.g., Casual Weekend Look" />
                </div>
                 <div>
                    <Label htmlFor="outfitCategory">Category</Label>
                    <Select value={outfitCategory} onValueChange={setOutfitCategory}>
                        <SelectTrigger id="outfitCategory">
                            <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {outfitCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label>Select Items</Label>
                <ScrollArea className="h-60 border rounded-md p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item) => {
                      const imageUrl = item.photoUrl;
                      return (
                        <div key={item.id} className="relative">
                          <label htmlFor={`item-${item.id}`} className="cursor-pointer">
                            {imageUrl ? (
                              <Image src={imageUrl} alt={item.type} width={150} height={150} className="rounded-lg aspect-square object-contain" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg aspect-square">
                                <span className="text-muted-foreground text-xs">No Image</span>
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Checkbox id={`item-${item.id}`} checked={selectedItems.includes(item.id)} onCheckedChange={() => handleItemSelect(item.id)} />
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
            </div>
            <div>
                <Label htmlFor="manualDescription">Description (Optional)</Label>
                <Textarea id="manualDescription" value={outfitDescription} onChange={(e) => setOutfitDescription(e.target.value)} placeholder="Describe the outfit..." />
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stylePreferences">Style Preferences</Label>
                  <Input id="stylePreferences" value={stylePreferences} onChange={(e) => setStylePreferences(e.target.value)} placeholder="e.g., Casual, Formal, Bohemian" />
                </div>
                <div>
                  <Label htmlFor="outfitRequirements">Outfit Requirements (Optional)</Label>
                  <Input id="outfitRequirements" value={outfitRequirements} onChange={(e) => setOutfitRequirements(e.target.value)} placeholder="e.g., For a wedding, office party" />
                </div>
            </div>
            <Button onClick={handleGenerateAI} disabled={isAiLoading}>
              {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {isAiLoading ? 'Generating...' : 'Generate Outfits'}
            </Button>
            
            {generatedOutfits.length > 0 && (
                <ScrollArea className="h-72">
                    <Accordion type="multiple" className="w-full" defaultValue={allOutfitIndices}>
                        {generatedOutfits.map((outfit, index) => (
                             <AccordionItem value={`item-${index}`} key={index}>
                                <div className="flex items-center gap-2">
                                <Checkbox 
                                    id={`generated-outfit-${index}`}
                                    checked={selectedGeneratedOutfits.includes(index)}
                                    onCheckedChange={() => handleToggleGeneratedSelection(index)}
                                    className="mt-4"
                                />
                                <AccordionTrigger>
                                        <div>
                                            <h4 className="font-semibold text-left">{outfit.name}</h4>
                                            <p className="text-sm text-muted-foreground text-left line-clamp-1">{outfit.description}</p>
                                        </div>
                                </AccordionTrigger>
                                </div>
                                <AccordionContent>
                                    <div className="pl-8 pb-2 text-sm text-muted-foreground">Category: <span className="font-semibold text-foreground">{outfit.category}</span></div>
                                    <div className="flex flex-wrap gap-2 p-4 pt-0">
                                        {outfit.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean).map(item => {
                                            const imageUrl = item!.photoUrl;
                                            return imageUrl ? <Image key={item!.id} src={imageUrl} alt={item!.type} width={60} height={60} className="rounded-md object-contain bg-muted/20" /> : null
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSaveOutfit}>
            <Save className="mr-2 h-4 w-4" /> {getSaveButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
