import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

// Whitelist of authorized emails
const ALLOWED_EMAILS = [
    'maurolapadula@gmail.com',
    'agostina.urquiza@gmail.com',
];

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Check if email is in whitelist
                const email = firebaseUser.email?.toLowerCase();
                if (email && ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
                    setUser(firebaseUser);
                    setError(null);
                } else {
                    // Email not authorized - sign out
                    await signOut(auth);
                    setUser(null);
                    setError('Tu cuenta no está autorizada para acceder a esta aplicación.');
                }
            } else {
                setUser(null);
                setError(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setError(null);
            const result = await signInWithPopup(auth, googleProvider);

            // Check if email is authorized
            const email = result.user.email?.toLowerCase();
            if (!email || !ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
                await signOut(auth);
                throw new Error('Tu cuenta no está autorizada para acceder a esta aplicación.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            throw err;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setError(null);
        } catch (err) {
            console.error('Error signing out:', err);
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
