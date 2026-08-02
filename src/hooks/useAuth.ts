import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  collectionGroup, query, where, getDocs, onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'support' | 'success' | 'marketing';
  photoURL?: string;
  orgId: string;
  status?: 'active' | 'disabled';
}

const memberRef = (orgId: string, uid: string) => doc(db, 'organizations', orgId, 'members', uid);

async function upsertMembership(fbUser: FirebaseUser, orgId: string, role: UserProfile['role'] = 'admin') {
  const ref = memberRef(orgId, fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Self-heal: the org owner recovers admin access if their membership doc
    // is stuck on a stale role (e.g. from a prior data model). Firestore
    // rules only allow this specific self-update when ownerId matches, so
    // it's a no-op for anyone who isn't the org's designated owner.
    if (role === 'admin' && snap.data().role !== 'admin') {
      const orgSnap = await getDoc(doc(db, 'organizations', orgId));
      if (orgSnap.exists() && orgSnap.data().ownerId === fbUser.uid) {
        await updateDoc(ref, { role: 'admin' });
      }
    }
    return;
  }

  await setDoc(ref, {
    uid: fbUser.uid,
    name: fbUser.displayName || 'Anonymous User',
    email: fbUser.email || '',
    role,
    status: 'active',
    photoURL: fbUser.photoURL || null,
    joinedAt: new Date().toISOString(),
  });
}

// Finds a pending invite for this email and, if found, joins that org at the
// invited role instead of creating a brand-new org.
async function findAndAcceptInvite(fbUser: FirebaseUser): Promise<{ orgId: string; role: UserProfile['role']; orgName: string } | null> {
  if (!fbUser.email) return null;
  const invitesQ = query(
    collectionGroup(db, 'invites'),
    where('email', '==', fbUser.email.toLowerCase()),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(invitesQ);
  if (snap.empty) return null;

  const inviteDoc = snap.docs[0];
  const orgId = inviteDoc.ref.parent.parent?.id;
  if (!orgId) return null;
  const role = (inviteDoc.data().role || 'sales') as UserProfile['role'];

  await upsertMembership(fbUser, orgId, role);
  await updateDoc(inviteDoc.ref, { status: 'accepted', acceptedAt: new Date().toISOString() });

  const orgSnap = await getDoc(doc(db, 'organizations', orgId));
  const orgName = (orgSnap.exists() && orgSnap.data().name) || 'the organization';
  return { orgId, role, orgName };
}

async function getOrCreateOrg(fbUser: FirebaseUser): Promise<{ orgId: string; role: UserProfile['role']; joinedOrgName?: string }> {
  // Check if user already has a profile with an orgId
  const profileRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(profileRef);
  if (snap.exists() && snap.data().orgId) {
    const orgId = snap.data().orgId as string;
    const role = (snap.data().role || 'admin') as UserProfile['role'];
    await upsertMembership(fbUser, orgId, role);
    return { orgId, role };
  }

  // New user — join via pending invite if one exists, otherwise create a new org.
  const accepted = await findAndAcceptInvite(fbUser);
  if (accepted) return { orgId: accepted.orgId, role: accepted.role, joinedOrgName: accepted.orgName };

  const orgRef = await addDoc(collection(db, 'organizations'), {
    name: fbUser.displayName ? `${fbUser.displayName}'s Org` : 'My Organization',
    plan: 'starter',
    ownerId: fbUser.uid,
    createdAt: new Date().toISOString(),
  });
  await upsertMembership(fbUser, orgRef.id, 'admin');
  return { orgId: orgRef.id, role: 'admin' };
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [joinedOrgName, setJoinedOrgName] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const profileRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(profileRef);

          if (snap.exists() && snap.data().orgId) {
            const baseProfile = snap.data() as UserProfile;
            await upsertMembership(fbUser, baseProfile.orgId, baseProfile.role || 'admin');
            const memberSnap = await getDoc(memberRef(baseProfile.orgId, fbUser.uid));
            setProfile({ ...baseProfile, ...(memberSnap.exists() ? memberSnap.data() : {}) } as UserProfile);
          } else {
            // New user or existing user missing orgId — join via invite, or create/assign org
            const { orgId, role, joinedOrgName: joined } = await getOrCreateOrg(fbUser);
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Anonymous User',
              email: fbUser.email || '',
              role,
              photoURL: fbUser.photoURL || undefined,
              orgId,
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
            if (joined) setJoinedOrgName(joined);
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
    if (!user || !profile?.orgId) return;
    const unsub = onSnapshot(memberRef(profile.orgId, user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(prev => prev ? { ...prev, ...snap.data() } as UserProfile : prev);
      }
    });
    return () => unsub();
  }, [user, profile?.orgId]);

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

  return { user, profile, loading, authError, login, logout, joinedOrgName, dismissJoinedOrgName: () => setJoinedOrgName(null) };
}
