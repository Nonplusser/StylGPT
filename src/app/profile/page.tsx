'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { Loader2, User, Edit, X } from 'lucide-react';
import { getUserProfile } from '@/app/actions/user';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileForm } from '@/components/profile/ProfileForm';

function formatHeight(height: number, unit: 'metric' | 'imperial' | undefined) {
    if (!height) return '';
    if (unit === 'imperial') {
        const feet = Math.floor(height / 12);
        const inches = height % 12;
        return `${feet}' ${inches}"`;
    }
    return `${height} cm`;
}


function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && typeof value !== 'number') return null;
  return (
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      redirect('/login');
      return;
    }
    fetchProfile();
  }, [user, authLoading]);

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    fetchProfile(); // Refetch profile to display updated data
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <p>Could not load profile.</p>;
  }
  
  const weightUnit = profile.unitPreference === 'imperial' ? 'lbs' : 'kg';


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold font-headline text-primary flex items-center gap-3">
            <User className="w-10 h-10" />
            <span>{user.displayName || user.email}'s Profile</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage your account details and style preferences.
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? <X className="mr-2" /> : <Edit className="mr-2" />}
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {isEditing ? (
        <ProfileForm user={user} profile={profile} onSave={handleUpdateSuccess} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ProfileField label="Display Name" value={user.displayName} />
              <ProfileField label="Email" value={user.email} />
              <ProfileField label="Gender Preference" value={profile.genderPreference} />
              <ProfileField label="Age" value={profile.age} />
              <ProfileField label="Height" value={formatHeight(profile.height, profile.unitPreference)} />
              <ProfileField label="Weight" value={profile.weight ? `${profile.weight} ${weightUnit}` : ''} />
              <ProfileField label="Body Type" value={profile.bodyType} />
              <ProfileField label="Unit System" value={profile.unitPreference} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Style Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Preferred Styles</p>
                {profile.stylePreferences && profile.stylePreferences.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.stylePreferences.map(style => (
                      <Badge key={style} variant="secondary" className="capitalize">{style}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm">No style preferences set.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Color Preferences</p>
                {profile.colorPreferences && profile.colorPreferences.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.colorPreferences.map(color => (
                      <Badge key={color} variant="outline" style={{ backgroundColor: color, color: getContrastingTextColor(color) }}>{color}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm">No color preferences set.</p>
                )}
              </div>
              <ProfileField label="Unused Item Priority" value={profile.unusedItemPreference} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Helper to determine if text should be light or dark based on background color
function getContrastingTextColor(hexcolor: string){
  if (hexcolor.startsWith('#')) {
    hexcolor = hexcolor.slice(1);
  }
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(function (hex) {
      return hex + hex;
    }).join('');
  }

  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? 'black' : 'white';
}
