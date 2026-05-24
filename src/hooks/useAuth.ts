import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'support' | 'success' | 'marketing';
  photoURL?: string;
  orgId: string;
}

async function getOrCreateOrg(fbUser: FirebaseUser): Promise<string> {
  // Check if user already has a profile with an orgId
  const profileRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(profileRef);
  if (snap.exists() && snap.data().orgId) {
    return snap.data().orgId as string;
  }
  // New user — create a new org for them
  const orgRef = await addDoc(collection(db, 'organizations'), {
    name: fbUser.displayName ? `${fbUser.displayName}'s Org` : 'My Organization',
    plan: 'starter',
    ownerId: fbUser.uid,
    createdAt: new Date().toISOString(),
  });
  return orgRef.id;
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const profileRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(profileRef);

          if (snap.exists() && snap.data().orgId) {
            setProfile(snap.data() as UserProfile);
          } else {
            // New user or existing user missing orgId — create/assign org
            const orgId = await getOrCreateOrg(fbUser);
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Anonymous User',
              email: fbUser.email || '',
              role: 'admin', // org creator is always admin of their own org
              photoURL: fbUser.photoURL || undefined,
              orgId,
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('Firestore profile error:', err);
          setAuthError(err instanceof Error ? err.message : String(err));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [user]);

  const login = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, profile, loading, authError, login, logout };
}
