
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import FormData from 'form-data';
import heicConvert from 'heic-convert';

import { storage as clientStorage } from '@/lib/firebase';
import { getDb, getBucket } from '@/lib/firebase-admin';

import type { ClothingItem, Outfit, PlannerEntry, ItemLayout } from '@/types';
import { analyzeClothingItem as analyzeClothingItemFlow, AnalyzeClothingItemOutput } from '@/ai/flows/analyze-clothing-item';
import { generateOutfit as generateOutfitFlow } from '@/ai/flows/generate-outfit';


// --- Data Access Functions ---

const generateId = () => uuidv4();

// Simplified user check - in a real app, use a proper auth solution
async function verifyUser(userId: string | null): Promise<{ uid: string }> {
    if (!userId) {
        throw new Error('User not authenticated.');
    }
    return { uid: userId };
}

export async function getClothingItems(userId?: string | null): Promise<ClothingItem[]> {
    try {
        const db = getDb();
        const wardrobeCollection = db.collection('wardrobe');
        let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = wardrobeCollection.where('userId', '==', null);

        if (userId) {
            // A user should see public items AND their own items.
            const userItemsQuery = wardrobeCollection.where('userId', '==', userId);
            const publicItemsQuery = wardrobeCollection.where('userId', '==', null);
            
            const [userItemsSnapshot, publicItemsSnapshot] = await Promise.all([
                userItemsQuery.get(),
                publicItemsQuery.get(),
            ]);

            const userItems = userItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClothingItem));
            const publicItems = publicItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClothingItem));
            
            return [...userItems, ...publicItems];
        } else {
            // Not logged in, only show public items
            const publicItemsSnapshot = await query.get();
            return publicItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClothingItem));
        }
    } catch (error) {
        console.error('Error fetching clothing items from Firestore:', error);
        return [];
    }
}


export async function getOutfits(userId: string | null): Promise<Outfit[]> {
  const user = await verifyUser(userId);
  const db = getDb();
  const outfitsCollection = db.collection('outfits');
  const outfitsSnapshot = await outfitsCollection.where('userId', '==', user.uid).get();
  if (outfitsSnapshot.empty) {
    return [];
  }
  return outfitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outfit));
}

export async function getPlannerEntries(userId: string | null): Promise<PlannerEntry[]> {
  if (!userId) {
      return [];
  }
  const db = getDb();
  const plannerCollection = db.collection('planner');
  const entriesSnapshot = await plannerCollection.where('userId', '==', userId).get();
  if (entriesSnapshot.empty) {
    return [];
  }
  return entriesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as PlannerEntry));
}

export async function getImageUrl(storagePath: string): Promise<{ url?: string; error?: string }> {
    try {
        const storageRef = ref(clientStorage, storagePath);
        const url = await getDownloadURL(storageRef);
        return { url };
    } catch(e: any) {
        console.error(`Failed to get download URL for ${storagePath}. Firebase error:`, e);
        if (e.code === 'storage/object-not-found') {
            return { error: 'Image not found.'}
        }
        return { error: 'Could not get image URL.' }
    }
}

export async function getPublicCatalogImages(folderPath: string): Promise<string[]> {
    try {
        const bucket = getBucket();
        const [files] = await bucket.getFiles({ prefix: folderPath });

        const imageUrls = await Promise.all(
            files.map(async (file) => {
                // Skip the folder itself
                if (file.name.endsWith('/')) {
                    return null;
                }
                const [url] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491', // A far-future date
                });
                return url;
            })
        );
        return imageUrls.filter((url): url is string => url !== null);
    } catch (error) {
        console.error(`Error fetching public catalog images from "${folderPath}":`, error);
        return [];
    }
}

export async function getPublicCatalogFolders(): Promise<string[]> {
    try {
        const bucket = getBucket();
        const [files, , apiResponse] = await bucket.getFiles({
            prefix: 'Public-Catalog/',
            delimiter: '/',
        });

        // apiResponse.prefixes contains the direct sub-folders
        const prefixes = apiResponse.prefixes || [];
        return prefixes.map(prefix => {
            // Remove the base path and the trailing slash
            return prefix.replace('Public-Catalog/', '').slice(0, -1);
        });
    } catch (error) {
        console.error('Error fetching public catalog folders:', error);
        return [];
    }
}


// --- Server Actions ---

const clothingItemSchema = z.object({
  photoUrl: z.string().min(1, "Image is required."),
  storagePath: z.string().min(1, "Storage path is required."),
  type: z.string().min(1, "Type is required.").optional(),
  color: z.string().min(1, "Color is required.").optional(),
  texture: z.string().min(1, "Texture is required.").optional(),
  brand: z.string().optional(),
  fit: z.string().min(1, "Fit is required.").optional(),
  season: z.enum(['summer', 'winter', 'spring', 'fall', 'all']).optional(),
});

const updateClothingItemSchema = clothingItemSchema.extend({
    id: z.string().min(1, "ID is required."),
    userId: z.string().nullable(),
    type: z.string().min(1, "Type is required."),
    color: z.string().min(1, "Color is required."),
    texture: z.string().min(1, "Texture is required."),
    fit: z.string().min(1, "Fit is required."),
    season: z.enum(['summer', 'winter', 'spring', 'fall', 'all']),
});


const multipleClothingItemsSchema = z.object({
  items: z.array(clothingItemSchema)
});

const fileToDataUri = async (fileUrl: string) => {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export async function addMultipleClothingItems(userId: string | null, payload: z.infer<typeof multipleClothingItemsSchema>) {
    try {
        const user = await verifyUser(userId);
        const parsed = multipleClothingItemsSchema.safeParse(payload);
        if (!parsed.success) {
            console.error("Invalid data for multiple items:", parsed.error);
            return { error: 'Invalid data provided for one or more items.' };
        }
        
        let newItemsData = parsed.data.items;
        
        const db = getDb();
        const bucket = getBucket();
        const wardrobeCollection = db.collection('wardrobe');
        const batch = db.batch();
        
        for (const itemData of newItemsData) {
            // If the item doesn't have metadata, it's from the public catalog.
            // We need to fetch it, analyze it, and save it.
            if (!itemData.type) {
                const response = await fetch(itemData.photoUrl);
                const imageBlob = await response.blob();
                
                const mimeType = imageBlob.type || 'image/jpeg';
                const fileExtension = mimeType.split('/')[1] || 'jpg';
                const newFileName = `${uuidv4()}.${fileExtension}`;
                const newStoragePath = `wardrobe-items/${user.uid}/${newFileName}`;

                // Upload to user's storage
                const file = bucket.file(newStoragePath);

                const buffer = Buffer.from(await imageBlob.arrayBuffer());
                await file.save(buffer, { contentType: mimeType });
                
                // Get the new public URL
                const [newPublicUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491',
                });
                
                // Analyze with AI
                const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
                const analysisResult = await analyzeClothingItemFlow({ photoDataUri: dataUri });
                
                // Create new item with AI data
                const newItemRef = wardrobeCollection.doc();
                const newItem: Omit<ClothingItem, 'id'> = {
                    userId: user.uid,
                    photoUrl: newPublicUrl,
                    storagePath: newStoragePath,
                    ...analysisResult,
                    brand: analysisResult.brand || 'Unknown',
                };
                batch.set(newItemRef, newItem);
            } else {
                // This is a direct upload with data already provided
                const newItemRef = wardrobeCollection.doc();
                const newItem: Omit<ClothingItem, 'id'> = {
                    userId: user.uid,
                    ...itemData,
                    type: itemData.type!,
                    color: itemData.color!,
                    texture: itemData.texture!,
                    fit: itemData.fit!,
                    season: itemData.season!,
                };
                batch.set(newItemRef, newItem);
            }
        }

        await batch.commit();

        revalidatePath('/wardrobe');
        revalidatePath('/add-item');
        return { success: true, count: newItemsData.length };
    } catch (e: any) {
         console.error('Error in addMultipleClothingItems:', e.message);
        return { error: e.message };
    }
}


export async function analyzeClothingItem(photoDataUri: string): Promise<AnalyzeClothingItemOutput | { error: string }> {
  try {
    if (!photoDataUri) {
      return { error: 'No photo data provided.' };
    }
    const result = await analyzeClothingItemFlow({ photoDataUri });
    return result;
  } catch (error) {
    console.error('Error in analyzeClothingItem action:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: `AI analysis failed: ${errorMessage}` };
  }
}

export async function createAndSaveOutfit(userId: string | null, name: string, description: string, category: string, itemIds: string[]) {
    const user = await verifyUser(userId);
    if (!name || itemIds.length === 0 || !category) {
        return { error: 'Outfit name, category, and at least one item are required.' };
    }
    const db = getDb();
    const outfitsCollection = db.collection('outfits');
    const newOutfitRef = outfitsCollection.doc();
    const newOutfit: Omit<Outfit, 'id'> = {
        name,
        description,
        itemIds,
        category,
        userId: user.uid,
    };
    await newOutfitRef.set(newOutfit);
    revalidatePath('/wardrobe');
    revalidatePath('/planner');
    return { success: true };
}

const itemLayoutSchema = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    zIndex: z.number(),
});

const updateOutfitSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    itemIds: z.array(z.string()),
    itemLayouts: z.record(itemLayoutSchema).optional(),
});


// Schema for updating an outfit - userId is implied by token
export async function updateOutfit(userId: string | null, data: z.infer<typeof updateOutfitSchema>) {
    const user = await verifyUser(userId);
    const parsed = updateOutfitSchema.safeParse(data);

    if (!parsed.success) {
        return { error: 'Invalid data provided.' };
    }

    const { id, name, description, itemIds, itemLayouts, category } = parsed.data;
    
    if (!id || !name || !category || itemIds.length === 0) {
        return { error: 'Outfit ID, name, category, and at least one item are required.' };
    }
    
    const db = getDb();
    const outfitsCollection = db.collection('outfits');
    const outfitRef = outfitsCollection.doc(id);
    const outfitDoc = await outfitRef.get();

    if (!outfitDoc.exists) {
        return { error: 'Outfit not found.' };
    }

    if (outfitDoc.data()?.userId !== user.uid) {
        return { error: 'You are not authorized to update this outfit.' };
    }
    
    await outfitRef.set({ 
        name, 
        description, 
        itemIds,
        category,
        itemLayouts, // This can be undefined if not provided
    }, { merge: true });

    revalidatePath('/wardrobe');
    revalidatePath('/planner');
    return { success: true };
}


export async function deleteOutfit(userId: string | null, id: string) {
    const user = await verifyUser(userId);
    if (!id) {
        return { error: 'Outfit ID is required.' };
    }
    
    const db = getDb();
    const outfitsCollection = db.collection('outfits');
    const outfitRef = outfitsCollection.doc(id);
    const outfitDoc = await outfitRef.get();

    if (!outfitDoc.exists) {
        console.warn(`Outfit with ID ${id} not found.`);
        return { success: true };
    }

    if (outfitDoc.data()?.userId !== user.uid) {
      return { error: 'You are not authorized to delete this outfit.' };
    }
    
    await outfitRef.delete();
    
    // Now remove this outfitId from any planner entries
    const plannerCollection = db.collection('planner');
    const plannerQuery = plannerCollection.where('userId', '==', user.uid).where('outfitIds', 'array-contains', id);
    const plannerSnapshot = await plannerQuery.get();

    if (!plannerSnapshot.empty) {
        const batch = db.batch();
        plannerSnapshot.docs.forEach(doc => {
            const newOutfitIds = doc.data().outfitIds.filter((outfitId: string) => outfitId !== id);
            if (newOutfitIds.length > 0) {
                batch.update(doc.ref, { outfitIds: newOutfitIds });
            } else {
                batch.delete(doc.ref);
            }
        });
        await batch.commit();
    }

    revalidatePath('/wardrobe');
    revalidatePath('/planner');
    return { success: true };
}


export async function generateOutfit(userId: string | null, stylePreferences: string, outfitRequirements: string) {
    try {
        const user = await verifyUser(userId);
        const clothingItems = await getClothingItems(user.uid); // Get items for the specific user
        if (clothingItems.length < 2) {
            return { error: 'Not enough clothing items to generate an outfit. Add at least two.' };
        }
        
        const aiItems = clothingItems.map(item => ({
            type: item.type,
            color: item.color,
            texture: item.texture,
            brand: item.brand || 'Unknown',
            fit: item.fit,
            season: item.season,
        }));
        
        const existingOutfits = await getOutfits(user.uid); // Fetch existing outfits for the user
        const result = await generateOutfitFlow({
            clothingItems: aiItems,
            stylePreferences,
            outfitRequirements: outfitRequirements || 'No specific requirements.',
            existingOutfits: existingOutfits,
            unusedItemPriority: 0.6, // Placeholder priority
        });

        // Map item types/colors back to item IDs
        // The AI returns generic item descriptions (type, color).
        // We need to find the actual item IDs from the user's collection.
        const outfitsWithIds = result.outfits.map(outfit => {
            const itemIds = outfit.itemsUsed.map(usedItem => {
                const foundItem = clothingItems.find(item => 
                    item.type === usedItem.type && item.color === usedItem.color
                );
                return foundItem?.id;
            }).filter((id): id is string => !!id);

            return {
                name: outfit.name,
                description: outfit.description,
                category: outfit.category,
                itemIds: itemIds,
            };
        });

        return { outfits: outfitsWithIds };

    } catch (error) {
        console.error('Error generating outfit with AI:', error);
        return { error: 'Failed to generate outfit. Please try again.' };
    }
}

export async function savePlannerEntry(userId: string | null, date: string, outfitIds: string[]) {
    const user = await verifyUser(userId);
    const db = getDb();
    const plannerCollection = db.collection('planner');
    
    // Planner entries are identified by a composite key of user and date.
    const entryQuery = plannerCollection.where('userId', '==', user.uid).where('date', '==', date);
    const entrySnapshot = await entryQuery.get();

    if (entrySnapshot.empty) {
        if (outfitIds.length > 0) {
            // Create new entry
            await plannerCollection.add({
                userId: user.uid,
                date,
                outfitIds,
            });
        }
        // If outfitIds is empty, do nothing, no need to create an empty entry
    } else {
        const docRef = entrySnapshot.docs[0].ref;
        if (outfitIds.length > 0) {
            // Update existing entry
            await docRef.update({ outfitIds });
        } else {
            // Delete entry if no outfits are scheduled
            await docRef.delete();
        }
    }

    revalidatePath('/planner');
}

export async function updateClothingItem(userId: string | null, formData: z.infer<typeof updateClothingItemSchema>) {
    const user = await verifyUser(userId);
    const parsed = updateClothingItemSchema.safeParse(formData);
    if (!parsed.success) {
        console.error("Invalid data for update:", parsed.error.flatten());
        return { error: 'Invalid data provided for update.' };
    }

    const { id, ...dataToUpdate } = parsed.data;
    const db = getDb();
    const wardrobeCollection = db.collection('wardrobe');
    const itemRef = wardrobeCollection.doc(id);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
        return { error: 'Item not found.' };
    }
    
    const itemData = itemDoc.data() as ClothingItem;
    // Security check: ensure the user owns this item before updating
    if (itemData.userId && itemData.userId !== user.uid) {
        return { error: 'You are not authorized to update this item.' };
    }

    await itemRef.update(dataToUpdate);

    revalidatePath('/wardrobe');
    return { success: true };
}


export async function deleteClothingItem(userId: string | null, itemId: string) {
    const user = await verifyUser(userId);
    if (!itemId) {
        return { error: 'Item ID is required.' };
    }
    
    const db = getDb();
    const wardrobeCollection = db.collection('wardrobe');
    const itemRef = wardrobeCollection.doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      console.warn(`Item with ID ${itemId} not found for deletion.`);
      return { success: true }; // Item already gone
    }
    
    const itemToDelete = { id: itemDoc.id, ...itemDoc.data() } as ClothingItem;
    
    // Security check
    if (itemToDelete.userId && itemToDelete.userId !== user.uid) {
      return { error: 'You are not authorized to delete this item.' };
    }
    
    if (itemToDelete?.storagePath) {
      try {
        const storageRef = ref(clientStorage, itemToDelete.storagePath);
        await deleteObject(storageRef);
        console.log(`Deleted image from storage: ${itemToDelete.storagePath}`);
      } catch (storageError: any) {
        if (storageError.code === 'storage/object-not-found') {
            console.warn(`Image not found in storage, but continuing with DB deletion: ${itemToDelete.storagePath}`);
        } else {
            console.error(`Error deleting image from storage ${itemToDelete.storagePath}:`, storageError);
        }
      }
    }

    // Firestore deletion
    await itemRef.delete();

    // Now, remove the deleted item's ID from all outfits that contain it
    const outfitsCollection = db.collection('outfits');
    const outfitQuery = outfitsCollection.where('userId', '==', user.uid).where('itemIds', 'array-contains', itemId);
    const outfitSnapshot = await outfitQuery.get();

    if (!outfitSnapshot.empty) {
        const batch = db.batch();
        outfitSnapshot.docs.forEach(doc => {
            const newItems = doc.data().itemIds.filter((id: string) => id !== itemId);
            batch.update(doc.ref, { itemIds: newItems });
        });
        await batch.commit();
    }
    
    revalidatePath('/wardrobe');
    revalidatePath('/planner');
    return { success: true };
}

export async function deleteClothingItems(userId: string | null, itemIds: string[]): Promise<{ success: true } | { error: string }> {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return { error: 'Invalid input: Expected an array of item IDs.' };
    }

    const user = await verifyUser(userId);
    
    try {
        const db = getDb();
        const wardrobeCollection = db.collection('wardrobe');
        const itemDeletionBatch = db.batch();
        const itemsToDelete: ClothingItem[] = [];
        
        for (const itemId of itemIds) {
            const itemRef = wardrobeCollection.doc(itemId);
            const itemDoc = await itemRef.get();
            if(itemDoc.exists) {
                const itemData = { id: itemDoc.id, ...itemDoc.data() } as ClothingItem;
                if (itemData.userId && itemData.userId !== user.uid) {
                    return { error: `You are not authorized to delete item ${itemData.id}.` };
                }
                itemsToDelete.push(itemData);
                itemDeletionBatch.delete(itemRef);
            }
        }

        // Delete images from Firebase Storage
        await Promise.all(itemsToDelete.map(async (item) => {
            if (item.storagePath) {
                try {
                    const storageRef = ref(clientStorage, item.storagePath);
                    await deleteObject(storageRef);
                    console.log(`Deleted image from storage: ${item.storagePath}`);
                } catch (storageError: any) {
                     if (storageError.code === 'storage/object-not-found') {
                        console.warn(`Image not found in storage, continuing: ${item.storagePath}`);
                    } else {
                        console.error(`Error deleting image from storage ${item.storagePath}:`, storageError);
                    }
                }
            }
        }));

        // Commit the batch deletion from Firestore
        await itemDeletionBatch.commit();
        
        // Remove item IDs from outfits
        const outfitsCollection = db.collection('outfits');
        const outfitQuery = outfitsCollection.where('userId', '==', user.uid).where('itemIds', 'array-contains-any', itemIds);
        const outfitSnapshot = await outfitQuery.get();
        
        if (!outfitSnapshot.empty) {
            const outfitUpdateBatch = db.batch();
            outfitSnapshot.docs.forEach(doc => {
                const newItems = doc.data().itemIds.filter((id: string) => !itemIds.includes(id));
                outfitUpdateBatch.update(doc.ref, { itemIds: newItems });
            });
            await outfitUpdateBatch.commit();
        }

        revalidatePath('/wardrobe');
        revalidatePath('/planner');

        return { success: true };

    } catch (error) {
        console.error('Error in deleteClothingItems server action:', error);
        return { error: 'Failed to delete clothing items.' };
    }
}


export async function removeBackground(userId: string | null, photoDataUri: string, fileType: string) {
    try {
        const user = await verifyUser(userId);

        if (!photoDataUri) {
            return { error: 'Photo data is required.' };
        }

        let imageBuffer = Buffer.from(photoDataUri.split(',')[1], 'base64');
        let processedMimeType = fileType;

        // Convert HEIC to PNG if necessary
        if (fileType.toLowerCase() === 'image/heic' || fileType.toLowerCase() === 'image/heif') {
            try {
                console.log('Converting HEIC image on the server...');
                const outputBuffer = await heicConvert({
                    buffer: imageBuffer,      // the HEIC file buffer
                    format: 'PNG'           // output format
                });
                imageBuffer = Buffer.from(outputBuffer);
                processedMimeType = 'image/png';
                 console.log('HEIC conversion successful.');
            } catch (conversionError) {
                console.error('Server-side HEIC conversion failed:', conversionError);
                throw new Error('Failed to convert HEIC image on the server.');
            }
        }

        // Send to the background removal API
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            contentType: processedMimeType,
            filename: `image.${processedMimeType.split('/')[1] || 'png'}`
        });

        const apiResponse = await fetch('https://rembg.stylgpt.com/remove-bg', {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders()
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Background removal API failed:', errorText);
            throw new Error(`Background removal API failed with status: ${apiResponse.status} ${errorText}`);
        }

        const processedBuffer = await apiResponse.buffer();

        // Upload the new buffer to Firebase Storage using Admin SDK
        const bucket = getBucket();
        const storagePath = `processed-items/${user.uid}/${uuidv4()}.png`;
        const file = bucket.file(storagePath);

        await file.save(processedBuffer, {
            metadata: { contentType: 'image/png' },
        });

        // Get the download URL
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Far-future expiration
        });
        
        return { photoUrl: url, storagePath };
        
    } catch (error) {
        console.error('[Action] Error in removeBackground action:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { error: `Failed to remove background: ${errorMessage}` };
    }
}

export async function updateClothingItemImage(userId: string | null, itemId: string, photoDataUri: string) {
    const user = await verifyUser(userId);
    
    const db = getDb();
    const wardrobeCollection = db.collection('wardrobe');
    const itemRef = wardrobeCollection.doc(itemId);
    const itemDoc = await itemRef.get();
    
    if (!itemDoc.exists) {
        console.error(`updateClothingItemImage: Item not found with ID ${itemId}`);
        return { error: 'Item not found.' };
    }
    const item = itemDoc.data() as ClothingItem;

    // Security check
    if (item.userId && item.userId !== user.uid) {
        console.error(`updateClothingItemImage: User ${user.uid} unauthorized to update item ${itemId}`);
        return { error: 'You are not authorized to update this item.' };
    }

    try {
        // Delete old image from storage if it exists
        if (item.storagePath) {
            try {
                const oldStorageRef = ref(clientStorage, item.storagePath);
                await deleteObject(oldStorageRef);
            } catch (e: any) {
                 if (e.code === 'storage/object-not-found') {
                    console.warn(`Old image not found, continuing update: ${item.storagePath}`);
                } else {
                    throw e; // Rethrow other storage errors
                }
            }
        }

        // Upload new image
        const mimeType = photoDataUri.match(/data:(.*);base64,/)?.[1] || 'image/png';
        const fileExtension = mimeType.split('/')[1] || 'png';
        const newStoragePath = `wardrobe-items/${user.uid}/${uuidv4()}.${fileExtension}`;
        
        const base64Data = photoDataUri.split(',')[1];
        if (!base64Data) {
            return { error: 'Invalid data URI for upload.' };
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const bucket = getBucket();
        const file = bucket.file(newStoragePath);
        await file.save(imageBuffer, {
            metadata: { contentType: mimeType },
        });
        
        const [newPhotoUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });


        // Update firestore
        await itemRef.update({
            photoUrl: newPhotoUrl,
            storagePath: newStoragePath,
        });

        // Revalidate and return success
        revalidatePath('/remove-background');
        revalidatePath('/wardrobe');
        return { success: true, newPhotoUrl };

    } catch (error) {
        console.error(`Failed to update clothing item image for item ${itemId}:`, error);
        return { error: 'An error occurred while updating the image.' };
    }
}
