
'use client';

import { useMemo } from 'react';
import type { ClothingItem } from '@/types';
import ItemCard from './ItemCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type ItemViewProps = {
  items: ClothingItem[];
  category: string;
  onBack: () => void;
  onEditItem: (item: ClothingItem) => void;
  isSelectionMode: boolean;
  isItemSelected: (id: string) => boolean;
  toggleItemSelection: (id: string) => void;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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


export function ItemView({ items, category, onBack, onEditItem, isSelectionMode, isItemSelected, toggleItemSelection }: ItemViewProps) {
  const groupedItems = useMemo(() => {
    const itemsToGroup = category === 'all' 
      ? items 
      : items;

    return itemsToGroup.reduce((acc, item) => {
      const lowerCaseType = item.type.toLowerCase();
      let assignedCategory: string | null = null;

      if (category === 'all') {
         for (const [catName, types] of Object.entries(defaultCategories)) {
            if(types.includes(lowerCaseType)) {
                assignedCategory = catName;
                break;
            }
         }
         // If it doesn't fit a main category, use its own type
         if (!assignedCategory) {
             assignedCategory = capitalize(item.type);
         }
      } else {
          // If we are in a specific category view, all items belong to it
          assignedCategory = category;
      }
      
      if (!acc[assignedCategory]) {
        acc[assignedCategory] = [];
      }
      acc[assignedCategory].push(item);
      return acc;
    }, {} as Record<string, ClothingItem[]>);
  }, [items, category]);

  const sortedGroupNames = Object.keys(groupedItems).sort();

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
                <ArrowLeft />
            </Button>
            <h2 className="text-3xl font-bold font-headline text-primary">
                {capitalize(category)}
            </h2>
        </div>

      {sortedGroupNames.map((groupName) => (
        <div key={groupName}>
          {(category === 'all' || sortedGroupNames.length > 1) && (
             <h3 className="text-2xl font-bold font-headline text-primary/80 mb-4 capitalize">{groupName}s</h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {groupedItems[groupName].map((item) => (
              <div
                key={item.id}
                className={cn(
                  'relative',
                  isSelectionMode && 'cursor-pointer ring-2 ring-offset-2 rounded-md',
                  isItemSelected(item.id) ? 'ring-primary' : 'ring-transparent'
                )}
                onClick={() => isSelectionMode && toggleItemSelection(item.id)}
              >
                <ItemCard item={item} onEdit={() => onEditItem(item)} />
                {isSelectionMode && (
                  <div className="absolute top-2 right-2 z-10 bg-card/50 backdrop-blur-sm rounded-full p-0.5">
                    {isItemSelected(item.id) ? (
                      <div className="w-5 h-5 text-primary bg-primary-foreground rounded-sm flex items-center justify-center border-2 border-primary" />
                    ) : (
                      <div className="w-5 h-5 bg-background/70 rounded-sm border-2" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
