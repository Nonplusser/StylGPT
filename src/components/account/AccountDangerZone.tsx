
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/app/actions/user';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export function AccountDangerZone() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user, loading, withAuth } = useAuth();
  const router = useRouter();


  const handleDelete = async () => {
    setIsDeleting(true);
    if (!user) {
        toast({ title: 'Not Authenticated', variant: 'destructive' });
        setIsDeleting(false);
        return;
    }
    
    try {
      // Note: This now only deletes user data from JSON files, not from Firebase Auth.
      // A full implementation requires client-side re-authentication and deletion.
      const result = await withAuth(deleteUserAccount)();
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'Account Data Deleted',
        description: "Your account's data has been deleted. To complete, sign out and perform deletion on the client.",
        variant: 'destructive'
      });
      // The auth state change will trigger a redirect via useAuth hook
      router.push('/login');

    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-destructive p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Delete Account</h4>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all of your content. This action is not fully reversible without the admin SDK.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading}>Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account data from our servers. You will need to re-authenticate on the client to fully delete your account from Firebase.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <Trash2 />
                )}
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
