
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { UserProfile } from '@/types';
import admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase-admin';

// --- Default Profile Structure ---
const defaultProfile: Omit<UserProfile, 'uid' | 'lastUpdated'> = {
    notifications: {
        email: true,
        appAlerts: true,
    },
    language: 'en',
    genderPreference: 'unisex',
    colorPreferences: [],
    unusedItemPreference: 'medium',
    unitPreference: 'metric',
    stylePreferences: [],
};


// --- Server Actions ---

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const db = getDb();
  const profilesCollection = db.collection('profiles');
  const profileDocRef = profilesCollection.doc(uid);
  const profileDoc = await profileDocRef.get();

  if (profileDoc.exists) {
    const data = profileDoc.data();
    const profileData = { ...defaultProfile, ...data, uid };

    if (profileData.lastUpdated instanceof Timestamp) {
        profileData.lastUpdated = profileData.lastUpdated.toDate().toISOString();
    }
    
    return profileData as UserProfile;
  } else {
    // Create a new profile if one doesn't exist
    const newProfile: UserProfile = {
      uid,
      ...defaultProfile,
    };
    await profileDocRef.set(newProfile);
    return newProfile;
  }
}

const updateProfileSchema = z.object({
    displayName: z.string().min(2, 'Display name must be at least 2 characters.').optional(),
    email: z.string().email('Please enter a valid email address.').optional(),
    genderPreference: z.enum(['male', 'female', 'unisex']),
    age: z.coerce.number().positive('Age must be a positive number.').optional().or(z.literal('')),
    weight: z.coerce.number().positive('Weight must be a positive number.').optional().or(z.literal('')),
    height: z.coerce.number().positive('Height must be a positive number.').optional().or(z.literal('')),
    feet: z.coerce.number().positive('Feet must be a positive number.').optional().or(z.literal('')),
    inches: z.coerce.number().min(0, 'Inches must be a positive number.').max(11, 'Inches must be less than 12.').optional().or(z.literal('')),
    bodyType: z.string().min(1, "Body type cannot be empty.").optional().or(z.literal('')),
    colorPreferences: z.array(z.string()).optional(),
    unusedItemPreference: z.enum(['low', 'medium', 'high']).optional(),
    unitPreference: z.enum(['metric', 'imperial']).optional(),
    stylePreferences: z.array(z.string()).optional(),
});


export async function updateUserProfile(userId: string, formData: Partial<UserProfile & { feet: number, inches: number }>) {
    if (!userId) {
      return { error: 'You must be logged in to update your profile.' };
    }
    
    const parsed = updateProfileSchema.safeParse(formData);

    if (!parsed.success) {
        return { error: 'Invalid data provided.', details: parsed.error.flatten() };
    }

    try {
        const db = getDb();
        const profilesCollection = db.collection('profiles');
        const profileDocRef = profilesCollection.doc(userId);
        
        // Prepare data for update, converting empty strings for numbers to undefined
        const dataToUpdate: Partial<UserProfile & { lastUpdated: FieldValue }> = { ...parsed.data };
        if (dataToUpdate.age === '') dataToUpdate.age = undefined;
        if (dataToUpdate.bodyType === '') dataToUpdate.bodyType = undefined;
        
        // Handle height conversion for imperial units
        if (parsed.data.unitPreference === 'imperial') {
            const feet = Number(parsed.data.feet) || 0;
            const inches = Number(parsed.data.inches) || 0;
            if (feet > 0 || inches > 0) {
                dataToUpdate.height = (feet * 12) + inches;
            } else {
                dataToUpdate.height = undefined;
            }
        } else {
            if (parsed.data.height === '') dataToUpdate.height = undefined;
        }

        if (parsed.data.weight === '') dataToUpdate.weight = undefined;

        dataToUpdate.lastUpdated = FieldValue.serverTimestamp();

        // Merge the validated data into the existing profile
        await profileDocRef.set(dataToUpdate, { merge: true });

        console.log(`Profile update for ${userId} successful with:`, dataToUpdate);
        
        revalidatePath('/account');
        revalidatePath('/profile');
        return { success: true, message: 'Profile updated successfully.' };
    } catch (error: any) {
        console.error('Error updating user profile:', error);
        return { error: error.message || 'Failed to update profile.' };
    }
}


const notificationSettingsSchema = z.object({
    notifications: z.object({
        email: z.boolean(),
        appAlerts: z.boolean(),
    }),
});

export async function updateNotificationSettings(userId: string, formData: z.infer<typeof notificationSettingsSchema>) {
    if (!userId) {
      return { error: 'You must be logged in to update your settings.' };
    }
    const parsed = notificationSettingsSchema.safeParse(formData);

    if (!parsed.success) {
        return { error: 'Invalid data provided.' };
    }
    
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    const profileDocRef = profilesCollection.doc(userId);
    await profileDocRef.set({
      notifications: parsed.data.notifications,
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });


    revalidatePath('/account');
    return { success: true, message: 'Notification settings updated.' };
}

export async function deleteUserAccount(userId: string) {
     if (!userId) {
      return { error: 'You must be logged in to delete your account.' };
    }
    try {
        const db = getDb();
        const profilesCollection = db.collection('profiles');
        await admin.auth().deleteUser(userId);
        await profilesCollection.doc(userId).delete();
        // In a real app, you would also delete user data from other collections (wardrobe, outfits, planner)
        // and from Firebase Storage. This is a simplified example.

        revalidatePath('/'); // Revalidate all paths after deletion
        return { success: true, message: 'Account deleted successfully.' };
    } catch (error: any) {
        console.error('Error deleting user account data:', error);
        // Handle cases where the user may have already been deleted from Auth
        if (error.code === 'auth/user-not-found') {
            const db = getDb();
            const profilesCollection = db.collection('profiles');
            await profilesCollection.doc(userId).delete().catch();
            return { success: true, message: 'Account data cleaned up.' };
        }
        return { error: error.message || 'Failed to delete account data.' };
    }
}
