
'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { ClothingItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Shirt, Redo, Gem, Shield, Footprints, Zap, Briefcase } from 'lucide-react';

type CategoryViewProps = {
  items: ClothingItem[];
  onSelectCategory: (category: string) => void;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const UnderwearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110">
        <path d="M2 12h2.5c.8-.9 1.6-2.2 2.1-3.5.7-1.7 1-3.5 1-3.5H2"/><path d="M22 12h-2.5c-.8-.9-1.6-2.2-2.1-3.5-.7-1.7-1-3.5-1-3.5h6.1"/><path d="M5.5 8.5c.6 1.3 1.4 2.6 2.1 3.5H17c.7-.9 1.5-2.2 2.1-3.5"/><path d="M2 12h20"/><path d="m18 12 1 10h-3.5l-1-10"/><path d="m6 12-1 10h3.5l1-10"/>
    </svg>
)

const defaultCategories = {
    Tops: {
        types: ["shirt", "t-shirt", "polo shirt", "blouse", "sweater", "hoodie", "dress"],
        icon: <Shirt className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    },
    Bottoms: {
        types: ["pants", "jeans", "shorts", "skirt"],
        icon: <Redo className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110 transform -scale-x-100" />
    },
    Outerwear: {
        types: ["outerwear", "jacket", "blazer", "coat"],
        icon: <Shield className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    },
    Footwear: {
        types: ["shoes", "sneakers", "oxford shoe", "loafers", "boots", "sandals"],
        icon: <Footprints className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    },
    Activewear: {
        types: ["sportswear", "gym shorts", "athletic shirt"],
        icon: <Zap className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    },
    Underwear: {
        types: ["underwear", "boxers", "briefs", "socks"],
        icon: <UnderwearIcon />
    },
    Formal: {
        types: ["suit", "suit jacket", "tuxedo", "dress shirt"],
        icon: <Briefcase className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    },
    Accessories: {
        types: ["hat", "cap", "fedora", "sunglasses", "watch", "belt", "accessory"],
        icon: <Gem className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
    }
};

export function CategoryView({ items, onSelectCategory }: CategoryViewProps) {
  const categories = useMemo(() => {
    const categoryData = new Map<string, { count: number; items: ClothingItem[] }>();

    // Initialize map with default categories
    Object.keys(defaultCategories).forEach(cat => {
        categoryData.set(cat, { count: 0, items: [] });
    });

    items.forEach(item => {
        const lowerCaseType = item.type.toLowerCase();
        let categorized = false;
        for (const [category, { types }] of Object.entries(defaultCategories)) {
            if (types.includes(lowerCaseType)) {
                const existing = categoryData.get(category)!;
                existing.count++;
                existing.items.push(item);
                categorized = true;
                break; // Item is assigned to a category
            }
        }
        if (!categorized) {
            const otherCategory = 'Other';
            if (!categoryData.has(otherCategory)) {
                categoryData.set(otherCategory, { count: 0, items: [] });
            }
            const existing = categoryData.get(otherCategory)!;
            existing.count++;
            existing.items.push(item);
        }
    });

    return Array.from(categoryData.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      <Card
        className="group cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1"
        onClick={() => onSelectCategory('all')}
      >
        <LayoutGrid className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
        <h3 className="text-lg font-bold">Show All Items</h3>
        <p className="text-sm text-muted-foreground">{items.length} items</p>
      </Card>

      {categories.map(({ name, count, items }) => {
        const firstItem = items[0];
        const categoryDetails = defaultCategories[name as keyof typeof defaultCategories];

        return (
            <Card
            key={name}
            className="group cursor-pointer aspect-square flex flex-col overflow-hidden text-center transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={() => count > 0 && onSelectCategory(name)}
            >
            <div className="relative flex-grow w-full bg-muted/30 flex items-center justify-center p-4">
                {count > 0 && firstItem?.photoUrl ? (
                <Image
                    src={firstItem.photoUrl}
                    alt={name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 33vw"
                />
                ) : categoryDetails?.icon && count > 0 ? (
                    categoryDetails.icon
                ) : (
                   <p className="text-xl text-muted-foreground">{count} Items</p>
                )}
            </div>
            <CardContent className="p-4 bg-card">
                <h3 className="text-lg font-bold capitalize truncate">{capitalize(name)}</h3>
                <p className="text-sm text-muted-foreground">
                {count} items
                </p>
            </CardContent>
            </Card>
        )
      })}
    </div>
  );
}
