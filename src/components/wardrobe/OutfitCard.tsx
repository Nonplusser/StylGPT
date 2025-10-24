
'use client';

import { useState, useEffect, CSSProperties, useRef, MouseEvent as ReactMouseEvent, useMemo } from 'react';
import Image from 'next/image';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import type { Outfit, ClothingItem, ItemLayout } from '@/types';
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { deleteOutfit, updateOutfit } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { isEqual } from 'lodash';

const getInitialPosition = (type: string, index: number): ItemLayout => {
    const lowerType = type.toLowerCase();
    if (['hat', 'cap'].includes(lowerType)) return { y: 10, x: 50, width: 30, height: 20, zIndex: 4 };
    if (['shirt', 't-shirt', 'polo shirt', 'blouse', 'sweater', 'hoodie', 'outerwear', 'dress'].includes(lowerType)) {
        return { y: 30, x: 50, width: 60, height: 50, zIndex: 3 };
    }
    if (['pants', 'jeans', 'shorts', 'skirt'].includes(lowerType)) return { y: 70, x: 50, width: 50, height: 50, zIndex: 2 };
    if (['shoes', 'sneakers', 'socks'].includes(lowerType)) return { y: 92, x: 50, width: 45, height: 15, zIndex: 1 };
    if (['watch', 'accessory'].includes(lowerType)) return { y: 55, x: 20, width: 20, height: 20, zIndex: 5 };
    return { y: 50, x: 50, width: 50, height: 50, zIndex: index };
};

interface DraggableItemProps {
    item: ClothingItem;
    position: ItemLayout;
    onMove: (id: string, newPos: { x: number, y: number}) => void;
    onResize: (id: string, newSize: { width: number; height: number}) => void;
    onBringForward: (id: string) => void;
    onSendBackward: (id: string) => void;
    containerRef: React.RefObject<HTMLDivElement>;
    isDraggable: boolean;
}

const DraggableItem = ({ item, position, onMove, onResize, onBringForward, onSendBackward, containerRef, isDraggable }: DraggableItemProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const imageUrl = item.photoUrl;

    const [, drag] = useDrag(() => ({
        type: 'clothingItem',
        item: { id: item.id, ...position },
        canDrag: isDraggable,
        end: (draggedItem, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (!delta || !ref.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            if(!containerRect) return;
            
            const left = (position.x / 100 * containerRect.width) + delta.x;
            const top = (position.y / 100 * containerRect.height) + delta.y;
            onMove(item.id, { x: left, y: top });
        }
    }), [item.id, position, containerRef.current, isDraggable]);


    drag(ref);

    const handleResize = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDraggable) return;
        e.preventDefault();
        e.stopPropagation();
        
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = (position.width / 100) * containerRect.width;
        const startHeight = (position.height / 100) * containerRect.height;
        
        const doDrag = (e: MouseEvent) => {
            const newWidth = startWidth + e.clientX - startX;
            const newHeight = startHeight + e.clientY - startY;
            
            onResize(item.id, { 
                width: (newWidth / containerRect.width) * 100, 
                height: (newHeight / containerRect.height) * 100
            });
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const style: CSSProperties = {
        top: `${position.y}%`,
        left: `${position.x}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        zIndex: position.zIndex,
        position: 'absolute',
        cursor: isDraggable ? 'move' : 'default',
        transform: 'translate(-50%, -50%)',
    };

    return (
        <div ref={ref} style={style} className="group/item">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={item.type}
                fill
                className="object-contain pointer-events-none"
                sizes="(max-width: 768px) 50vw, 33vw"
                data-ai-hint={`${item.type} clothing`}
              />
            ) : null }
            {isDraggable && (
                <>
                    <div className="absolute -top-1 -right-1 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col gap-1">
                        <Button variant="secondary" size="icon" className="h-6 w-6 cursor-pointer" onClick={(e) => { e.stopPropagation(); onBringForward(item.id); }}>
                            <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-6 w-6 cursor-pointer" onClick={(e) => { e.stopPropagation(); onSendBackward(item.id); }}>
                            <ArrowDownCircle className="h-4 w-4" />
                        </Button>
                    </div>
                    <div 
                        className="absolute bottom-0 right-0 w-4 h-4 bg-primary/50 rounded-full cursor-nwse-resize opacity-0 group-hover/item:opacity-100"
                        onMouseDown={handleResize}
                    />
                </>
            )}
        </div>
    );
};


type OutfitCardProps = {
  outfit: Outfit;
  allItems: ClothingItem[];
  onEdit: () => void;
};

export default function OutfitCard({ outfit, allItems, onEdit }: OutfitCardProps) {
  const outfitItems = useMemo(() => outfit.itemIds.map(id => allItems.find(item => item.id === id)).filter(Boolean) as ClothingItem[], [outfit.itemIds, allItems]);
  const dropRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { withAuth } = useAuth();
  
  const [layouts, setLayouts] = useState<Record<string, ItemLayout>>({});
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  const hasMadeLayoutChanges = useMemo(() => {
    if (!outfit.itemLayouts && Object.keys(layouts).length > 0) return true;
    if (outfit.itemLayouts && !isEqual(outfit.itemLayouts, layouts)) return true;
    return false;
  }, [layouts, outfit.itemLayouts]);
  
  useEffect(() => {
    const initialLayouts = outfitItems.reduce((acc, item, index) => {
        if (outfit.itemLayouts && outfit.itemLayouts[item.id]) {
            acc[item.id] = outfit.itemLayouts[item.id];
        } else {
            acc[item.id] = getInitialPosition(item.type, index);
        }
        return acc;
    }, {} as Record<string, ItemLayout>);
    setLayouts(initialLayouts);
  }, [outfit.id, outfit.itemLayouts, outfitItems]);
  
  const handleMove = (id: string, newPos: { x: number; y: number }) => {
    if (!dropRef.current) return;
    const { width, height } = dropRef.current.getBoundingClientRect();
    setLayouts(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            x: (newPos.x / width) * 100,
            y: (newPos.y / height) * 100,
        }
    }));
  };

  const handleResize = (id: string, newSize: { width: number, height: number}) => {
    setLayouts(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            width: newSize.width,
            height: newSize.height,
        }
    }));
  };

  const handleLayerChange = (id: string, direction: 'forward' | 'backward') => {
      setLayouts(prev => {
          const newPositions = {...prev};
          const currentZIndex = newPositions[id]?.zIndex || 0;
          const newZIndex = direction === 'forward' ? currentZIndex + 1 : currentZIndex -1;

          if (newZIndex < 0) return prev;

          newPositions[id] = { ...newPositions[id], zIndex: newZIndex };
          return newPositions;
      })
  };

  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
        const result = await withAuth(updateOutfit)({
            ...outfit,
            itemLayouts: layouts,
        });

        if (result?.error) {
            throw new Error(result.error);
        }
        toast({ title: 'Layout Saved!', description: 'Your outfit layout has been updated.' });
    } catch(e) {
        toast({ title: 'Error', description: 'Failed to save layout.', variant: 'destructive' });
    } finally {
        setIsSavingLayout(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await withAuth(deleteOutfit)(outfit.id);
    if(result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'Deleted', description: 'The outfit has been removed.' });
    }
    setIsDeleting(false);
  }

  const [, drop] = useDrop(() => ({
    accept: 'clothingItem',
    drop: (item: {id: string} & ItemLayout, monitor) => {
        if (!dropRef.current) return;
        const delta = monitor.getDifferenceFromInitialOffset();
        if(!delta) return;
        const {width, height} = dropRef.current.getBoundingClientRect();

        let left = (item.x / 100 * width) + delta.x;
        let top = (item.y / 100 * height) + delta.y;
        
        handleMove(item.id, { x: left, y: top });
        return undefined;
    }
  }), [handleMove]);

  drop(dropRef);

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <CardHeader>
        <div ref={dropRef} className="h-64 md:h-80 w-full relative mb-4 bg-muted/20 rounded-lg overflow-hidden">
          {outfitItems.length > 0 ? (
            outfitItems.map((item) => layouts[item.id] && (
              <DraggableItem
                key={item.id}
                item={item}
                position={layouts[item.id]}
                onMove={handleMove}
                onResize={handleResize}
                containerRef={dropRef}
                onBringForward={() => handleLayerChange(item.id, 'forward')}
                onSendBackward={() => handleLayerChange(item.id, 'backward')}
                isDraggable={true}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                <p className="text-muted-foreground">No items in this outfit</p>
            </div>
          )}
        </div>
        <CardTitle className="font-headline text-2xl">{outfit.name}</CardTitle>
        <CardDescription>{outfit.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex flex-wrap gap-2">
            {outfitItems.map(item => {
              const imageUrl = item.photoUrl;
              return imageUrl ? (
                <div key={item.id} className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/50">
                    <Image src={imageUrl} alt={item.type} width={40} height={40} className="object-contain" />
                </div>
              ) : null
            })}
        </div>
      </CardContent>
        <CardFooter className="p-4 pt-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-end w-full gap-2">
                 {hasMadeLayoutChanges && (
                    <Button variant="secondary" onClick={handleSaveLayout} disabled={isSavingLayout}>
                        {isSavingLayout ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Save Layout
                    </Button>
                )}
                <Button variant="outline" onClick={onEdit}><Pencil className="mr-2"/>Edit</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}><Trash2 className="mr-2"/>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this outfit.
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
        </CardFooter>
    </Card>
  );
}
