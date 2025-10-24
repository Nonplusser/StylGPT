
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPublicCatalogImages, addMultipleClothingItems } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckSquare, Square, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';
import { ref, getBlob } from 'firebase/storage';


export default function DefaultMenCatalogPage() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { user, withAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const fileToDataUri = (file: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      const urls = await getPublicCatalogImages('Public-Catalog/Default-Men/');
      setImageUrls(urls);
      setLoading(false);
    };

    fetchImages();
  }, []);
  
  const toggleSelection = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedUrls.length === imageUrls.length) {
      setSelectedUrls([]);
    } else {
      setSelectedUrls(imageUrls);
    }
  };

  const handleAddSelectedToWardrobe = async () => {
    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to add items.', variant: 'destructive' });
      return;
    }
    if (selectedUrls.length === 0) {
      toast({ title: 'No Items Selected', description: 'Please select items to add.', variant: 'destructive' });
      return;
    }

    setIsAdding(true);
    toast({ title: 'Adding items to your wardrobe...', description: 'This may take a moment. The AI is analyzing your new clothes.'});

    try {
      // For public catalog items, we don't have a storage path yet for the user.
      // We will let the server action handle creating new storage paths.
      // The `addMultipleClothingItems` needs to be adapted for this.
      const itemsToAdd = selectedUrls.map(url => ({
        photoUrl: url,
        storagePath: `public-catalog-imports/${user.uid}/${uuidv4()}`, // A temporary path, server will create the real one
      }));

      const result = await withAuth(addMultipleClothingItems)({ items: itemsToAdd });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({ title: 'Success!', description: `${result.count} items added to your wardrobe.`});
      router.push('/wardrobe');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({ title: 'Failed to Add Items', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
              <Link href="/add-item">
                  <ArrowLeft />
              </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline">Default Men's Catalog</h1>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={toggleSelectAll} disabled={loading || imageUrls.length === 0}>
             {selectedUrls.length === imageUrls.length ? <CheckSquare /> : <Square />}
            {selectedUrls.length === imageUrls.length ? 'Deselect All' : 'Select All'}
           </Button>
           <Button onClick={handleAddSelectedToWardrobe} disabled={isAdding || selectedUrls.length === 0}>
             {isAdding ? <Loader2 className="animate-spin" /> : <PlusCircle />}
             Add to Wardrobe ({selectedUrls.length})
           </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
            <CardContent className="p-4">
                {imageUrls.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {imageUrls.map((url, index) => {
                          const isSelected = selectedUrls.includes(url);
                          return (
                            <div key={index} 
                                 className={cn(
                                   "relative rounded-lg overflow-hidden border cursor-pointer group",
                                   isSelected && "ring-2 ring-primary ring-offset-2"
                                  )}
                                  onClick={() => toggleSelection(url)}
                            >
                                <div className="aspect-square relative">
                                  <Image
                                      src={url}
                                      alt={`Catalog item ${index + 1}`}
                                      fill
                                      className="object-contain"
                                      sizes="(max-width: 768px) 50vw, 33vw"
                                  />
                                </div>
                                <div className="absolute top-2 right-2">
                                  <Checkbox checked={isSelected} />
                                </div>
                            </div>
                          )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">No items found in this catalog.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
