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

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        setAlias(snap.exists() ? (snap.data().alias as string) : null);
      } else {
        setAlias(null);
      }
      setLoading(false);
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
  };

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    setAlias(snap.exists() ? (snap.data().alias as string) : null);
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
