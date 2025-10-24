
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { AssignOutfitDialog } from './AssignOutfitDialog';
import type { Outfit, PlannerEntry, ClothingItem } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getOutfits, getClothingItems, getPlannerEntries } from '@/app/actions';
import { Loader2 } from 'lucide-react';

type OutfitPlannerProps = {
  initialPlannerEntries: PlannerEntry[];
};

export default function OutfitPlanner({ initialPlannerEntries }: OutfitPlannerProps) {
  const [plannerEntries, setPlannerEntries] = useState(initialPlannerEntries);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [allOutfits, setAllOutfits] = useState<Outfit[]>([]);
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading, withAuth } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    };

    const fetchData = async () => {
        setLoading(true);
        const [outfits, items, entries] = await Promise.all([
            withAuth(getOutfits)(),
            getClothingItems(user.uid),
            withAuth(getPlannerEntries)(),
        ]);
        setAllOutfits(outfits);
        setAllItems(items);
        setPlannerEntries(entries);
        setLoading(false);
    }
    fetchData();
  }, [user, authLoading, withAuth]);

  const outfitsWithItems = allOutfits.map(outfit => ({
    ...outfit,
    items: outfit.itemIds.map(id => allItems.find(item => item.id === id)).filter(Boolean) as ClothingItem[],
  }));


  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = (newEntries?: PlannerEntry[]) => {
      if(newEntries) {
          setPlannerEntries(newEntries);
      }
      setIsDialogOpen(false);
  }

  if (loading || authLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </div>
    )
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardContent className="p-2 md:p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            className="p-0 [&_td]:p-0 [&_tr]:border-0"
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                table: "w-full border-collapse space-y-1",
                head_row: "flex justify-around",
                head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] justify-center flex",
                row: "flex w-full mt-2 justify-around",
                cell: "h-24 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-full w-full p-1 justify-start items-start bg-transparent hover:bg-accent/50",
                day_disabled: "cursor-not-allowed text-muted-foreground/50 hover:bg-transparent",
            }}
            components={{
              DayContent: ({ date }) => {
                const dateString = date.toISOString().split('T')[0];
                const entry = plannerEntries.find(e => e.date === dateString);
                const outfitsForDay = entry ? entry.outfitIds.map(id => allOutfits.find(o => o.id === id)).filter(Boolean) as Outfit[] : [];
                return (
                  <div className="flex flex-col h-full w-full items-start p-1">
                      <time dateTime={dateString} className="self-end">{date.getDate()}</time>
                      {outfitsForDay.length > 0 && (
                          <div className="mt-1 space-y-1 w-full overflow-hidden">
                              {outfitsForDay.slice(0, 2).map(outfit => (
                                <div key={outfit.id} className="text-xs bg-primary/80 text-primary-foreground rounded-sm px-1 py-0.5 truncate">
                                  {outfit.name}
                                </div>
                              ))}
                              {outfitsForDay.length > 2 && <div className="text-xs text-muted-foreground">+ {outfitsForDay.length - 2} more</div>}
                          </div>
                      )}
                  </div>
                );
              }
            }}
          />
        </CardContent>
      </Card>
      {selectedDate && (
        <AssignOutfitDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          selectedDate={selectedDate}
          allOutfits={outfitsWithItems}
          plannerEntries={plannerEntries}
        />
      )}
    </>
  );
}
