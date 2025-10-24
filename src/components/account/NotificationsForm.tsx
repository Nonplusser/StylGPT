
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { updateNotificationSettings } from '@/app/actions/user';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const notificationsFormSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    appAlerts: z.boolean().default(true),
  }),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export function NotificationsForm({ profile }: { profile: UserProfile }) {
    const { toast } = useToast();
    const { user, withAuth } = useAuth();
    
    const form = useForm<NotificationsFormValues>({
        resolver: zodResolver(notificationsFormSchema),
        defaultValues: {
            notifications: {
                email: profile.notifications?.email ?? true,
                appAlerts: profile.notifications?.appAlerts ?? true,
            },
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(data: NotificationsFormValues) {
        if (!user) {
            toast({ title: 'Not Authenticated', variant: 'destructive' });
            return;
        }

        try {
            const result = await withAuth(updateNotificationSettings)(data);
            if (result.error) throw new Error(result.error);
            toast({
                title: 'Settings Updated',
                description: 'Your notification preferences have been saved.',
            });
        } catch (error) {
            toast({
                title: 'Update Failed',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
                variant: 'destructive',
            });
        }
    }

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div>
            <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="notifications.email"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                        Communication emails
                        </FormLabel>
                        <FormDescription>
                        Receive emails about new features, and updates.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
            </div>
            </div>
            <div>
            <h3 className="mb-4 text-lg font-medium">App Alerts</h3>
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="notifications.appAlerts"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            Outfit Suggestions
                        </FormLabel>
                        <FormDescription>
                            Receive in-app alerts for new outfit suggestions.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
            </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update notifications
            </Button>
        </form>
        </Form>
    );
}
