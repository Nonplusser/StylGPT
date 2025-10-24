
'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { Outfit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Shirt, Redo, Gem, Shield, Footprints, Zap, Briefcase } from 'lucide-react';

type OutfitCategoryViewProps = {
  outfits: Outfit[];
  onSelectCategory: (category: string) => void;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const defaultCategories = [
    'Casual', 'Business Casual', 'Activewear', 'Loungewear', 'Night Out', 'Smart Casual', 'Vacation', 'Seasonal', 'Special Occasion', 'Formal'
];

export function OutfitCategoryView({ outfits, onSelectCategory }: OutfitCategoryViewProps) {
  const categories = useMemo(() => {
    const categoryData = new Map<string, { count: number; outfits: Outfit[] }>();

    // Initialize map with default categories to ensure they always appear
    defaultCategories.forEach(cat => {
        categoryData.set(cat, { count: 0, outfits: [] });
    });

    // Group outfits into categories
    outfits.forEach(outfit => {
        const categoryName = outfit.category || 'Uncategorized';
        if (!categoryData.has(categoryName)) {
            categoryData.set(categoryName, { count: 0, outfits: [] });
        }
        const existing = categoryData.get(categoryName)!;
        existing.count++;
        existing.outfits.push(outfit);
    });

    return Array.from(categoryData.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

  }, [outfits]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      <Card
        className="group cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1"
        onClick={() => onSelectCategory('all')}
      >
        <LayoutGrid className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
        <h3 className="text-lg font-bold">Show All Outfits</h3>
        <p className="text-sm text-muted-foreground">{outfits.length} outfits</p>
      </Card>

      {categories.map(({ name, count }) => {
        if (name === 'Uncategorized' && count === 0) {
            return null; // Don't show the uncategorized tile if it's empty
        }
        return (
            <Card
            key={name}
            className="group cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={() => count > 0 && onSelectCategory(name)}
            >
             <div className="flex items-center justify-center flex-grow">
                 <h3 className="text-2xl font-bold">{capitalize(name)}</h3>
            </div>
            <CardContent className="p-4 bg-card w-full">
                <p className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'outfit' : 'outfits'}
                </p>
            </CardContent>
            </Card>
        )
      })}
    </div>
  );
}
