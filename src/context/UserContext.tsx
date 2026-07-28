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
  /** Try to sign in; if username doesn't exist, create the account automatically. */
  signInOrSignUp: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  alias: null,
  loading: true,
  signInOrSignUp: async () => {},
  logout: async () => {},
});

// We store users by username using a synthetic email so Firebase email/password
// auth works under the hood. The email is never shown to users.
const usernameToEmail = (username: string) =>
  `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@ventspace.app`;

// Cache alias locally so the UI is instant on reload
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
  const [alias, setAlias] = useState<string | null>(getCachedAlias);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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

  /**
   * If the username exists → sign in.
   * If the username doesn't exist → create a new account (auto sign-up).
   * Username is unique: enforced via `usernames/{normalized}` in Firestore.
   */
  const signInOrSignUp = async (username: string, password: string) => {
    const email = usernameToEmail(username);
    const normalized = username.toLowerCase().trim();

    try {
      // Happy path: try sign-in first
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const fetched = snap.exists() ? (snap.data().alias as string) : username;
      setAlias(fetched);
      setCachedAlias(fetched);
    } catch (err: any) {
      const isNewUser =
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-email'; // synthetic email not registered yet

      if (!isNewUser) throw err; // wrong password or other error

      // Username uniqueness check
      const usernameSnap = await getDoc(doc(db, 'usernames', normalized));
      if (usernameSnap.exists()) {
        // Username is taken by someone else — wrong password
        const e: any = new Error('Wrong password for this username.');
        e.code = 'auth/wrong-password';
        throw e;
      }

      // Create new account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: normalized,
        alias: username,
        createdAt: serverTimestamp(),
      });
      // Reserve the username
      await setDoc(doc(db, 'usernames', normalized), { uid: cred.user.uid });
      setAlias(username);
      setCachedAlias(username);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setAlias(null);
    setCachedAlias(null);
  };

  return (
    <UserContext.Provider value={{ user, alias, loading, signInOrSignUp, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
