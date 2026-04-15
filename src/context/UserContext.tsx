import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface UserContextType {
  user: User | null;
  alias: string | null;
  loading: boolean;
  signUp: (phone: string, password: string, alias: string) => Promise<void>;
  signIn: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  alias: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
});

// We store users by phone using a synthetic email to leverage Firebase email/password auth.
// The phone number is never exposed to other users — only the chosen alias is.
const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, '')}@ventspace.app`;

// Cache alias locally so we don't hit Firestore on every app load
const ALIAS_KEY = 'vs_alias';
const getCachedAlias = () => {
  try { return localStorage.getItem(ALIAS_KEY); } catch { return null; }
};
const setCachedAlias = (a: string | null) => {
  try {
    if (a) localStorage.setItem(ALIAS_KEY, a);
    else localStorage.removeItem(ALIAS_KEY);
  } catch { /* ignore */ }
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // Seed alias from cache immediately — avoids blank screen while Firestore responds
  const [alias, setAlias] = useState<string | null>(getCachedAlias);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // If we already have a cached alias, show the app immediately
        // then refresh from Firestore in the background
        const cached = getCachedAlias();
        if (cached) {
          setAlias(cached);
          setLoading(false);
          // Background refresh
          getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
            if (snap.exists()) {
              const fresh = snap.data().alias as string;
              setAlias(fresh);
              setCachedAlias(fresh);
            }
          });
        } else {
          // First ever load — must wait for Firestore
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          const fetched = snap.exists() ? (snap.data().alias as string) : null;
          setAlias(fetched);
          setCachedAlias(fetched);
          setLoading(false);
        }
      } else {
        setAlias(null);
        setCachedAlias(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signUp = async (phone: string, password: string, chosenAlias: string) => {
    const email = phoneToEmail(phone);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      alias: chosenAlias,
      createdAt: serverTimestamp(),
    });
    setAlias(chosenAlias);
    setCachedAlias(chosenAlias);
  };

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    const fetched = snap.exists() ? (snap.data().alias as string) : null;
    setAlias(fetched);
    setCachedAlias(fetched);
  };

  const logout = async () => {
    await signOut(auth);
    setAlias(null);
  };

  return (
    <UserContext.Provider value={{ user, alias, loading, signUp, signIn, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
