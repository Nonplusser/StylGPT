

export type ClothingItem = {
  id: string;
  userId: string | null; // Allow null for sample/public items
  photoUrl: string;
  storagePath: string; // Path to the file in Firebase Storage
  type: string;
  color: string;
  texture: string;
  brand?: string;
  fit: string;
  season: 'summer' | 'winter' | 'spring' | 'fall' | 'all';
};

export type ItemLayout = {
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
    zIndex: number;
}

export type Outfit = {
  id: string;
  userId: string;
  name: string;
  description: string;
  itemIds: string[];
  category: string;
  itemLayouts?: Record<string, ItemLayout>; // Optional for backward compatibility
};

export type PlannerEntry = {
  date: string; // YYYY-MM-DD
  outfitIds: string[];
  userId: string;
};

export type UserProfile = {
    uid: string;
    displayName?: string;
    email?: string;
    notifications: {
        email: boolean;
        appAlerts: boolean;
    };
    language: string;
    genderPreference?: 'male' | 'female' | 'unisex';
    age?: number;
    weight?: number; // in preferred units (e.g., kg or lbs)
    height?: number; // in preferred units (e.g., cm or inches)
    bodyType?: string;
    colorPreferences: string[];
    unusedItemPreference?: 'low' | 'medium' | 'high';
    unitPreference?: 'metric' | 'imperial';
    stylePreferences?: string[];
    lastUpdated?: string;
}
