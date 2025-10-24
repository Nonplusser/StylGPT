'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/app/actions/user';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useEffect, useState } from 'react';
import { Checkbox } from '../ui/checkbox';

const stylePreferencesOptions = [
    { id: 'casual', label: 'Casual' },
    { id: 'formal', label: 'Formal' },
    { id: 'sporty', label: 'Sporty' },
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'business-casual', label: 'Business Casual' },
    { id: 'bohemian', label: 'Bohemian' },
    { id: 'minimalist', label: 'Minimalist' },
];

const colorOptions = [
    { id: '#FF0000', label: 'Red' },
    { id: '#FFA500', label: 'Orange' },
    { id: '#FFFF00', label: 'Yellow' },
    { id: '#008000', label: 'Green' },
    { id: '#0000FF', label: 'Blue' },
    { id: '#4B0082', label: 'Indigo' },
    { id: '#EE82EE', label: 'Violet' },
    { id: '#000000', label: 'Black' },
    { id: '#FFFFFF', label: 'White' },
    { id: '#808080', label: 'Gray' },
    { id: '#A52A2A', label: 'Brown' },
    { id: '#F5DEB3', label: 'Beige' },
];

const profileFormSchema = z.object({
  genderPreference: z.enum(['male', 'female', 'unisex']),
  age: z.coerce.number({invalid_type_error: "Age must be a number."}).positive('Age must be a positive number.').optional().or(z.literal('')),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number."}).positive('Weight must be a positive number.').optional().or(z.literal('')),
  height: z.coerce.number({invalid_type_error: "Height must be a number."}).positive('Height must be a positive number.').optional().or(z.literal('')),
  feet: z.coerce.number({invalid_type_error: "Feet must be a number."}).positive('Feet must be a positive number.').optional().or(z.literal('')),
  inches: z.coerce.number({invalid_type_error: "Inches must be a number."}).min(0, "Inches can't be negative.").max(11, 'Inches must be less than 12.').optional().or(z.literal('')),
  bodyType: z.string().optional(),
  unitPreference: z.enum(['metric', 'imperial']),
  unusedItemPreference: z.enum(['low', 'medium', 'high']),
  stylePreferences: z.array(z.string()).optional(),
  colorPreferences: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ user, profile, onSave }: { user: any; profile: UserProfile, onSave: () => void }) {
  const { toast } = useToast();
  const { withAuth } = useAuth();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      genderPreference: profile.genderPreference || 'unisex',
      age: profile.age || '',
      weight: profile.weight || '',
      height: profile.unitPreference === 'metric' ? (profile.height || '') : '',
      feet: profile.unitPreference === 'imperial' && profile.height ? Math.floor(profile.height / 12) : '',
      inches: profile.unitPreference === 'imperial' && profile.height ? profile.height % 12 : '',
      bodyType: profile.bodyType || '',
      unitPreference: profile.unitPreference || 'metric',
      unusedItemPreference: profile.unusedItemPreference || 'medium',
      stylePreferences: profile.stylePreferences || [],
      colorPreferences: profile.colorPreferences || [],
    },
    mode: 'onChange',
  });

  const { control, handleSubmit, watch, setValue } = form;
  const unitPreference = watch('unitPreference');
  const { isSubmitting } = form.formState;

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'unitPreference') {
        setValue('height', '');
        setValue('feet', '');
        setValue('inches', '');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);


  async function onSubmit(data: ProfileFormValues) {
    try {
        const result = await withAuth(updateUserProfile)(data);
        if (result.error) throw new Error(result.error);
        toast({
            title: 'Profile updated',
            description: 'Your profile information has been successfully updated.',
        });
        onSave();
    } catch (error) {
        toast({
            title: 'Update failed',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
            variant: 'destructive',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
         <Card>
            <CardHeader>
                <CardTitle>Edit Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={control}
                    name="unitPreference"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Unit System</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="metric" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Metric (cm, kg)
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="imperial" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Imperial (ft/in, lbs)
                                </FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                    control={control}
                    name="genderPreference"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Gender Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a preference" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="unisex">Unisex</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            This helps us tailor suggestions.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name="bodyType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Body Type</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Athletic, Slim, Curvy" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                            Describe your body shape.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={control}
                        name="age"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Your age" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name="weight"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Weight ({unitPreference === 'imperial' ? 'lbs' : 'kg'})</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Your weight" {...field} value={field.value || ''}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div>
                  {unitPreference === 'metric' ? (
                     <FormField
                        control={control}
                        name="height"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Your height" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name="feet"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Height (ft)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Feet" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="inches"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>(in)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Inches" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  )}
                </div>
            </CardContent>
         </Card>
        
         <Card>
            <CardHeader>
                <CardTitle>Edit Style Preferences</CardTitle>
                <CardDescription>Customize the AI's suggestions to better match your personal style.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                <FormField
                    control={control}
                    name="stylePreferences"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Your Styles</FormLabel>
                            <FormDescription>
                            Select the styles that best describe you.
                            </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {stylePreferencesOptions.map((item) => (
                            <FormField
                            key={item.id}
                            control={control}
                            name="stylePreferences"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize">
                                        {item.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="colorPreferences"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Your Favorite Colors</FormLabel>
                            <FormDescription>
                                Pick the colors you like to wear.
                            </FormDescription>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {colorOptions.map((item) => (
                            <FormField
                            key={item.id}
                            control={control}
                            name="colorPreferences"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: item.id }}/>
                                        {item.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="unusedItemPreference"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unused Item Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            How strongly should the AI prioritize using items you haven't worn in a while?
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />

             </CardContent>
         </Card>

        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            Save Changes
        </Button>
      </form>
    </Form>
  );
}
