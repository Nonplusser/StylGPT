
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClothingItems, getOutfits } from '@/app/actions';
import StatsCharts from '@/components/stats/StatsCharts';
import type { ClothingItem, Outfit } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';

const colorWheelOrder: { [key: string]: number } = {
    // Pinks/Reds
    'Red': 1,
    'Pink': 2,
    'Salmon': 3,
    'Coral': 4,
    'Maroon': 5,
    // Oranges/Yellows
    'Orange': 10,
    'Yellow': 11,
    'Gold': 12,
    // Greens
    'Green': 20,
    'Teal': 21,
    // Blues/Purples
    'Blue': 30,
    'Indigo': 31,
    'Violet': 32,
    'Purple': 33,
    // Neutrals
    'Brown': 40,
    'Beige': 41,
    'Khaki': 42,
    'White': 43,
    'Gray': 44,
    'Silver': 45,
    'Black': 46,
    // Others
    'Multi': 98,
    'Other': 99,
};


export default function StatsPage() {
    const { user, loading: authLoading, withAuth } = useAuth();
    const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            redirect('/login');
            return;
        }

        const fetchData = async () => {
            setDataLoading(true);
            const [items, userOutfits] = await Promise.all([
                getClothingItems(user.uid),
                withAuth(getOutfits)()
            ]);
            setClothingItems(items);
            setOutfits(userOutfits);
            setDataLoading(false);
        };

        fetchData();
    }, [user, authLoading, withAuth]);

    if (authLoading || dataLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
        );
    }


    const itemsByType = clothingItems.reduce((acc, item) => {
        const type = item.type.toLowerCase();
        if (["shirt", "t-shirt", "polo shirt", "blouse", "sweater", "hoodie"].includes(type)) {
        acc.Tops = (acc.Tops || 0) + 1;
        } else if (["pants", "jeans", "shorts", "skirt"].includes(type)) {
        acc.Bottoms = (acc.Bottoms || 0) + 1;
        } else if (["shoes", "sneakers"].includes(type)) {
        acc.Shoes = (acc.Shoes || 0) + 1;
        } else if (["outerwear"].includes(type)) {
        acc.Outwear = (acc.Outwear || 0) + 1;
        } else {
        acc.Accessories = (acc.Accessories || 0) + 1;
        }
        return acc;
    }, { Tops: 0, Bottoms: 0, Shoes: 0, Outwear: 0, Accessories: 0});

    const typeChartData = Object.keys(itemsByType).map(key => ({ name: key, total: itemsByType[key as keyof typeof itemsByType]}));
    
    const itemsByColor = clothingItems.reduce((acc, item) => {
      const color = item.color.toLowerCase().split(',')[0].trim();
      const capitalizedColor = color.charAt(0).toUpperCase() + color.slice(1);
      acc[capitalizedColor] = (acc[capitalizedColor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedColors = Object.entries(itemsByColor)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const topColors = sortedColors.slice(0, 6);
    const otherColorsTotal = sortedColors.slice(6).reduce((sum, current) => sum + current.total, 0);

    if (otherColorsTotal > 0) {
      topColors.push({ name: 'Other', total: otherColorsTotal });
    }

    const colorChartData = topColors;

    const radarChartData = Object.entries(itemsByColor)
        .map(([name, total]) => ({
            color: name,
            count: total,
        }))
        .sort((a, b) => {
            const orderA = colorWheelOrder[a.color] ?? 100;
            const orderB = colorWheelOrder[b.color] ?? 100;
            return orderA - orderB;
        })
        .slice(0, 12); // Limit to a reasonable number for the radar chart


    return (
        <div className="space-y-8">
        <div>
            <h1 className="text-4xl font-bold font-headline text-primary">Wardrobe Stats</h1>
            <p className="text-muted-foreground mt-2">
                An overview of {user?.displayName || user?.email}'s style journey.
            </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Items
                </CardTitle>
                <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
                >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{clothingItems.length}</div>
                <p className="text-xs text-muted-foreground">
                Unique pieces in your collection
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Saved Outfits
                </CardTitle>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                    >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{outfits.length}</div>
                <p className="text-xs text-muted-foreground">
                Your curated looks
                </p>
            </CardContent>
            </Card>
        </div>

        <StatsCharts typeData={typeChartData} colorData={colorChartData} radarData={radarChartData} />
        </div>
    );
}
