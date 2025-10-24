
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateClothingItem } from '@/app/actions';
import type { ClothingItem } from '@/types';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const clothingItemSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  photoUrl: z.string(),
  storagePath: z.string(),
  type: z.string().min(1, 'Type is required.'),
  color: z.string().min(1, 'Color is required.'),
  texture: z.string().min(1, 'Texture is required.'),
  brand: z.string().optional(),
  fit: z.string().min(1, 'Fit is required.'),
  season: z.enum(['summer', 'winter', 'spring', 'fall', 'all'], {
    errorMap: () => ({ message: 'Please select a season.' }),
  }),
});

type ClothingItemFormValues = z.infer<typeof clothingItemSchema>;

const clothingTypes = [
    "t-shirt", "shirt", "polo shirt", "blouse", "sweater", "hoodie",
    "pants", "jeans", "shorts", "skirt",
    "dress", "outerwear", "hat", "shoes",
    "sneakers", "socks", "watch",
    "accessory", "other"
];


type EditItemDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: ClothingItem;
  };
  
export function EditItemDialog({ isOpen, setIsOpen, item }: EditItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const { toast } = useToast();
  const imageUrl = item.photoUrl;
  const { user, withAuth } = useAuth();

  const { handleSubmit, control, setValue, watch, formState: { errors } } = useForm<ClothingItemFormValues>({
    resolver: zodResolver(clothingItemSchema),
    defaultValues: {
      id: item.id,
      userId: item.userId,
      photoUrl: item.photoUrl || '',
      storagePath: item.storagePath || '',
      type: item.type || '',
      color: item.color || '',
      texture: item.texture || '',
      brand: item.brand || '',
      fit: item.fit || '',
      season: item.season,
    },
  });

  const typeValue = watch('type');

  useEffect(() => {
    if (item.type && !clothingTypes.includes(item.type.toLowerCase())) {
        setShowNewTypeInput(true);
    }
  }, [item.type]);


  const onSubmit = async (data: ClothingItemFormValues) => {
    if (data.userId && (!user || user.uid !== data.userId)) {
        toast({ title: 'Unauthorized', description: 'You cannot edit this item.', variant: 'destructive'});
        return;
    }
    setIsSubmitting(true);
    try {
      const result = await withAuth(updateClothingItem)(data);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'Success!',
        description: 'Item details have been updated.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Clothing Item</DialogTitle>
          <DialogDescription>
            Update the details for this item in your wardrobe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={item.type}
                width={200}
                height={200}
                className="rounded-lg object-contain w-full aspect-square"
              />
            ) : (
               <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg aspect-square">
                <span className="text-muted-foreground text-xs">No Image</span>
              </div>
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="type">Type</Label>
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                       <Select 
                            value={showNewTypeInput ? 'add_new' : field.value}
                            onValueChange={(value) => {
                                if (value === 'add_new') {
                                    setShowNewTypeInput(true);
                                    setValue('type', '');
                                } else {
                                    setShowNewTypeInput(false);
                                    field.onChange(value);
                                }
                            }}
                        >
                        <SelectTrigger id="type" className="capitalize">
                            <SelectValue placeholder="Select a type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clothingTypes.map(type => (
                                <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                            ))}
                            <SelectItem value="add_new">Add New...</SelectItem>
                        </SelectContent>
                       </Select>
                    )}
                />
                 {showNewTypeInput && (
                    <Controller name="type" control={control} render={({ field }) => 
                        <Input 
                            {...field}
                            placeholder="Enter new category"
                            className="mt-2"
                        />} 
                    />
                )}
                {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Controller name="color" control={control} render={({ field }) => <Input id="color" {...field} value={field.value || ''} />} />
                {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="texture">Texture</Label>
                <Controller name="texture" control={control} render={({ field }) => <Input id="texture" {...field} value={field.value || ''} />} />
                {errors.texture && <p className="text-sm text-destructive">{errors.texture.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="brand">Brand (Optional)</Label>
                <Controller name="brand" control={control} render={({ field }) => <Input id="brand" {...field} value={field.value || ''} />} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="fit">Fit</Label>
                <Controller name="fit" control={control} render={({ field }) => <Input id="fit" {...field} value={field.value || ''} />} />
                {errors.fit && <p className="text-sm text-destructive">{errors.fit.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="season">Season</Label>
                <Controller
                    name="season"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="season">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="spring">Spring</SelectItem>
                                <SelectItem value="summer">Summer</SelectItem>
                                <SelectItem value="fall">Fall</SelectItem>
                                <SelectItem value="winter">Winter</SelectItem>
                                <SelectItem value="all">All Seasons</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.season && <p className="text-sm text-destructive">{errors.season.message}</p>}
            </div>
          </div>
          
          <DialogFooter className="md:col-span-3 flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
