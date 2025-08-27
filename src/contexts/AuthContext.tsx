import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailLink, 
  sendSignInLinkToEmail, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  isSignInWithEmailLink
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isGuestMode: boolean;
  setGuestMode: (guestMode: boolean) => void;
  sendSignInLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserLastSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsGuest(!user && !isGuestMode);
      
      if (user) {
        // Create or update user document
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          // New user - create document
          await setDoc(userRef, {
            email: user.email,
            createdAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
          });
        } else {
          // Existing user - update lastSeenAt
          await setDoc(userRef, {
            lastSeenAt: serverTimestamp(),
          }, { merge: true });
        }
      }
      
      setLoading(false);
    });

    // Check if this is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            // User is now signed in
          })
          .catch((error) => {
            console.error('Error signing in with email link:', error);
          });
      }
    }

    return unsubscribe;
  }, [isGuestMode]);

  const setGuestMode = (guestMode: boolean) => {
    setIsGuestMode(guestMode);
    setIsGuest(!user && !guestMode);
  };

  const sendSignInLink = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIsGuestMode(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserLastSeen = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        lastSeenAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isGuest,
    isGuestMode,
    setGuestMode,
    sendSignInLink,
    signOut,
    updateUserLastSeen,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
