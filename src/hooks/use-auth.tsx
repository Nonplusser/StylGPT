
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  // Pass the user ID instead of the token
  withAuth: <T extends (userId: string | null, ...args: any[]) => Promise<any>>(action: T) => (...args: Parameters<T> extends [string | null, ...infer P] ? P : never) => Promise<Awaited<ReturnType<T>>>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  withAuth: (action) => async (...args) => action(null, ...args),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setLoading(true);
      setUser(newUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Updated withAuth to pass the user's UID directly
  const withAuth = useCallback(
    <T extends (userId: string | null, ...args: any[]) => Promise<any>>(action: T) => {
      return async (...args: Parameters<T> extends [string | null, ...infer P] ? P : never) => {
        // No token needed, just the user's UID from the context
        return action(user?.uid || null, ...args);
      };
    },
    [user] // Depend on the user object
  );

  return (
    <AuthContext.Provider value={{ user, loading, withAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
