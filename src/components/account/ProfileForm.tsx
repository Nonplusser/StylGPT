
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
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, {
      message: 'Display name must be at least 2 characters.',
    })
    .max(30, {
      message: 'Display name must not be longer than 30 characters.',
    }).optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional(),
  genderPreference: z.enum(['male', 'female', 'unisex']).optional(),
  age: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  bodyType: z.string().optional(),
  colorPreferences: z.array(z.string()).optional(),
  unusedItemPreference: z.enum(['low', 'medium', 'high']).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ user, profile }: { user: any; profile: UserProfile }) {
  const { toast } = useToast();
  const { withAuth } = useAuth();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user.displayName || '',
      email: user.email || '',
      genderPreference: profile.genderPreference || 'unisex',
      age: profile.age || undefined,
      weight: profile.weight || undefined,
      height: profile.height || undefined,
      bodyType: profile.bodyType || '',
      colorPreferences: profile.colorPreferences || [],
      unusedItemPreference: profile.unusedItemPreference || 'medium',
    },
    mode: 'onChange',
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ProfileFormValues) {
    try {
        const result = await withAuth(updateUserProfile)(data);
        if (result.error) throw new Error(result.error);
        toast({
            title: 'Profile updated',
            description: 'Your profile information has been successfully updated.',
        });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your display name" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name. It can be your real name or a
                pseudonym.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} />
              </FormControl>
              <FormDescription>
                This field is for display purposes. Email changes must be handled separately.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
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
            control={form.control}
            name="bodyType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Body Type</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Athletic, Slim, Curvy" {...field} />
                </FormControl>
                 <FormDescription>
                    Describe your body shape.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="Your age" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="Your height" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="Your weight" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
         </div>
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update profile
        </Button>
      </form>
    </Form>
  );
}
