import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'support' | 'success' | 'marketing';
  photoURL?: string;
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        // Try to fetch profile
        const profileRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(profileRef);
        
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // Create default profile for new user
          // First user gets admin, rest get basic user (handling via rules but also for UI state)
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || 'Anonymous User',
            email: fbUser.email || '',
            role: fbUser.email === 'rohitlokwani17@gmail.com' ? 'admin' : 'sales',
            photoURL: fbUser.photoURL || undefined
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Set up real-time profile listener if we have a user
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, profile, loading, login, logout };
}
