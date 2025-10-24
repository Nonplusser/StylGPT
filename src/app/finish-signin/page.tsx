
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinishSignInPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processSignIn = async () => {
            const url = window.location.href;
            if (isSignInWithEmailLink(auth, url)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    // User opened the link on a different device. To prevent session fixation
                    // attacks, ask the user to provide the associated email again.
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (!email) {
                    setError('Email is required to complete sign-in.');
                    return;
                }

                try {
                    await signInWithEmailLink(auth, email, url);
                    window.localStorage.removeItem('emailForSignIn');
                    toast({ title: 'Success!', description: 'You have been signed in.' });
                    router.push('/wardrobe');
                } catch (err) {
                    console.error(err);
                    setError('Failed to sign in. The link may be invalid or expired.');
                    toast({ title: 'Sign-in Failed', description: 'The link may be invalid or expired. Please try again.', variant: 'destructive' });
                }
            } else {
                 setError('Invalid sign-in link.');
            }
        };

        processSignIn();
    }, [router, toast]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center font-headline">Completing Sign-In</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    {error ? (
                        <div>
                            <p className="text-destructive">{error}</p>
                            <Button variant="link" onClick={() => router.push('/login')}>
                                Try again
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Please wait while we sign you in...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
