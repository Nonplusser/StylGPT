
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { auth } from '@/lib/firebase';

const passwordFormSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function UpdatePasswordForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requiresReauth, setRequiresReauth] = useState(false);
  
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: PasswordFormValues) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to update your password.', variant: 'destructive'});
        return;
    }
    
    try {
        const isPasswordProvider = currentUser.providerData.some(p => p.providerId === 'password');
        
        if (isPasswordProvider && requiresReauth && data.currentPassword) {
            const credential = EmailAuthProvider.credential(currentUser.email!, data.currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
        }

        await updatePassword(currentUser, data.newPassword);
        toast({ title: 'Success!', description: 'Your password has been updated successfully.'});
        form.reset();
        setRequiresReauth(false);
    } catch (error: any) {
        console.error('Password update error:', error);
        if (error.code === 'auth/requires-recent-login') {
            setRequiresReauth(true);
            toast({ title: 'Re-authentication Required', description: 'For security, please enter your current password to continue.', variant: 'destructive'});
        } else if (error.code === 'auth/wrong-password') {
            toast({ title: 'Incorrect Password', description: 'The current password you entered is incorrect.', variant: 'destructive'});
             form.setError('currentPassword', { type: 'manual', message: 'Incorrect password' });
        } else {
            toast({ title: 'Error', description: error.message || 'Failed to update password.', variant: 'destructive'});
        }
    }
  };
  
  const isPasswordUser = user?.providerData.some(p => p.providerId === 'password');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {(requiresReauth || isPasswordUser) && (
            <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="Enter your current password" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Update Password
        </Button>
      </form>
    </Form>
  );
}
