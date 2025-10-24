
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendSignInLinkToEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const actionCodeSettings = {
            url: `${window.location.origin}/finish-signin`,
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setSubmitted(true);
        } catch (error) {
            console.error('Error sending sign in link', error);
            toast({
                title: 'Error',
                description: 'Could not send login link. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    const handlePasswordAuth = async (action: 'signIn' | 'signUp') => {
        if (!email || !password) {
            toast({
                title: 'Missing Information',
                description: 'Please enter both email and password.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            const userCredential = action === 'signUp'
                ? await createUserWithEmailAndPassword(auth, email, password)
                : await signInWithEmailAndPassword(auth, email, password);

            toast({ 
                title: action === 'signUp' ? 'Account Created!' : 'Signed In!',
                description: action === 'signUp' ? 'You have been signed in.' : 'Welcome back.'
            });
            router.push('/wardrobe');

        } catch (error) {
            console.error(`Error with ${action}`, error);
            let description = 'An unexpected error occurred. Please try again.';
            if (error instanceof FirebaseError) {
                switch(error.code) {
                    case 'auth/email-already-in-use':
                        description = 'This email is already in use. Please sign in or use a different email.';
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential':
                        description = 'Invalid email or password. If you signed up with a magic link, please use that method to sign in, or create an account with a password.';
                        break;
                    case 'auth/weak-password':
                        description = 'The password is too weak. Please use at least 6 characters.';
                        break;
                    default:
                        description = error.message;
                }
            } else if (error instanceof Error) {
                description = error.message;
            }

            toast({
                title: 'Authentication Failed',
                description: description,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };


    if (submitted) {
        return (
            <div className="max-w-md mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Check your email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>A sign-in link has been sent to <strong>{email}</strong>. Click the link to complete your login.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Welcome</CardTitle>
                    <CardDescription>Sign in or create an account to manage your wardrobe.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="password">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="password">Password</TabsTrigger>
                            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
                        </TabsList>

                        <TabsContent value="password" className="pt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-password">Email Address</Label>
                                    <Input
                                        id="email-password"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => handlePasswordAuth('signIn')} className="w-full" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin" /> : <Lock />}
                                        Sign In
                                    </Button>
                                     <Button onClick={() => handlePasswordAuth('signUp')} variant="secondary" className="w-full" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin" /> : null}
                                        Create Account
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="magic-link" className="pt-4">
                             <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-magic">Email Address</Label>
                                    <Input
                                        id="email-magic"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : <Mail />}
                                    Send Login Link
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
