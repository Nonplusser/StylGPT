
'use client';

import Image from 'next/image';
import { Sun, Wind, Snowflake, CloudRain, Pencil, Trash2, Globe, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { ClothingItem } from '@/types';
import { deleteClothingItem } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

type ItemCardProps = {
  item: ClothingItem;
  onEdit: () => void;
};

const seasonIcons = {
  summer: <Sun className="h-4 w-4 text-yellow-500" />,
  spring: <Wind className="h-4 w-4 text-green-500" />,
  fall: <CloudRain className="h-4 w-4 text-orange-500" />,
  winter: <Snowflake className="h-4 w-4 text-blue-400" />,
  all: <Globe className="h-4 w-4 text-purple-500" />,
};

export default function ItemCard({ item, onEdit }: ItemCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const imageUrl = item.photoUrl;
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, withAuth } = useAuth();

  const handleDelete = async () => {
      if (!user) {
          toast({ title: 'Error', description: 'You must be logged in to delete items.', variant: 'destructive' });
          return;
      }
      setIsDeleting(true);
      const result = await withAuth(deleteClothingItem)(item.id);
      if (result?.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
          toast({ title: 'Deleted', description: 'The item has been removed from your wardrobe.' });
      }
      setIsDeleting(false);
  };


  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group">
      <CardHeader className="p-0 relative">
        <div className="aspect-square w-full relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.type}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              data-ai-hint="clothing item"
              priority
            />
          ) : (
             <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Image</span>
            </div>
          )}
        </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this
                    item from your wardrobe and remove it from any outfits.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline capitalize">{item.type}</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{item.color}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground">
        <Badge variant="outline" className="capitalize">{item.fit}</Badge>
        <div className="flex items-center gap-1 capitalize">
          {seasonIcons[item.season]}
          <span>{item.season === 'all' ? 'All Seasons' : item.season}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
