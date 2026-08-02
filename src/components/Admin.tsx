import React, { useEffect, useState } from 'react';
import { onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { Shield, UserPlus, Users, Mail, CheckCircle2, Ban, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { addOrgDoc, orgDoc, orgQuery } from '../lib/firestoreWithOrg';
import { useAuth, UserProfile } from '../hooks/useAuth';

type Role = UserProfile['role'];
type MemberStatus = 'active' | 'disabled';

interface Member {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  joinedAt?: string;
}

interface Invite {
  id: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
}

const roles: Role[] = ['admin', 'sales', 'marketing', 'support', 'success'];

export default function Admin() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('sales');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) return;
    const unsubMembers = onSnapshot(
      orgQuery('members', profile.orgId, orderBy('email', 'asc')),
      (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member))),
      (error) => handleFirestoreError(error, OperationType.LIST, `organizations/${profile.orgId}/members`)
    );
    const unsubInvites = onSnapshot(
      orgQuery('invites', profile.orgId, orderBy('createdAt', 'desc')),
      (snap) => setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite))),
      (error) => handleFirestoreError(error, OperationType.LIST, `organizations/${profile.orgId}/invites`)
    );
    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [profile?.orgId]);

  const requireAdmin = () => profile?.role === 'admin' && profile.status !== 'disabled' && profile.orgId;

  const updateMember = async (member: Member, patch: Partial<Pick<Member, 'role' | 'status'>>) => {
    if (!requireAdmin() || !profile?.orgId) return;
    if (member.uid === user?.uid && (patch.role && patch.role !== 'admin')) return;
    try {
      await updateDoc(orgDoc(profile.orgId, 'members', member.id), patch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${profile.orgId}/members/${member.id}`);
    }
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAdmin() || !profile?.orgId || !user || !inviteEmail.trim()) return;
    try {
      await addOrgDoc('invites', {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: 'pending',
        invitedBy: user.uid,
        createdAt: new Date().toISOString(),
      }, profile.orgId);
      setInviteEmail('');
      setInviteRole('sales');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${profile.orgId}/invites`);
    }
  };

  const inviteMessage = (invite: Invite) =>
    `You've been invited to join Unify as ${invite.role}. ` +
    `Sign in at ${window.location.origin} with your Google account (${invite.email}) to get access.`;

  const copyInviteMessage = async (invite: Invite) => {
    try {
      await navigator.clipboard.writeText(inviteMessage(invite));
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId(prev => (prev === invite.id ? null : prev)), 2000);
    } catch {
      // Clipboard access can fail (e.g. insecure context); nothing to fall back to.
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Shield className="w-10 h-10 mx-auto text-bento-muted mb-3" />
          <h2 className="text-2xl font-extrabold text-bento-text tracking-tighter">Admin Access Required</h2>
          <p className="text-sm text-bento-muted font-medium mt-2">Only organization admins can manage users and invites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">User Management</h2>
          <p className="text-bento-muted font-medium">Manage organization members, roles, and pending invites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card flex-row items-center gap-4">
          <div className="bg-[#dbeafe] text-accent-sales p-4 rounded-xl"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-[12px] font-bold text-bento-muted uppercase tracking-wider">Members</p>
            <p className="text-2xl font-extrabold text-bento-text">{members.length}</p>
          </div>
        </div>
        <div className="dashboard-card flex-row items-center gap-4">
          <div className="bg-[#dcfce7] text-accent-cs p-4 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
          <div>
            <p className="text-[12px] font-bold text-bento-muted uppercase tracking-wider">Active</p>
            <p className="text-2xl font-extrabold text-bento-text">{members.filter(m => m.status !== 'disabled').length}</p>
          </div>
        </div>
        <div className="dashboard-card flex-row items-center gap-4">
          <div className="bg-[#fef3c7] text-accent-support p-4 rounded-xl"><Mail className="w-6 h-6" /></div>
          <div>
            <p className="text-[12px] font-bold text-bento-muted uppercase tracking-wider">Pending Invites</p>
            <p className="text-2xl font-extrabold text-bento-text">{invites.filter(i => i.status === 'pending').length}</p>
          </div>
        </div>
      </div>

      <form onSubmit={createInvite} className="bg-white border border-bento-border rounded-[16px] p-5 flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Invite by Email</label>
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-bento-text outline-none transition-all font-medium"
            placeholder="teammate@company.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Role</label>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as Role)}
            className="w-full lg:w-44 px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-bold capitalize"
          >
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary h-12">
          <UserPlus className="w-4 h-4" /> Create Invite
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest px-1">Members</h3>
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="dashboard-card flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-bento-text truncate">{member.name || member.email}</h4>
                  {member.uid === user?.uid && <span className="pill bg-gray-100 text-bento-muted">You</span>}
                  {member.status === 'disabled' && <span className="pill bg-red-50 text-red-500">Disabled</span>}
                </div>
                <p className="text-xs text-bento-muted font-bold truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={member.role}
                  disabled={member.uid === user?.uid}
                  onChange={e => updateMember(member, { role: e.target.value as Role })}
                  className="px-3 py-2 rounded-xl bg-bento-bg border border-bento-border text-[12px] font-bold outline-none cursor-pointer capitalize disabled:opacity-50"
                >
                  {roles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <button
                  type="button"
                  disabled={member.uid === user?.uid}
                  onClick={() => updateMember(member, { status: member.status === 'disabled' ? 'active' : 'disabled' })}
                  className="btn-secondary h-10 px-3 disabled:opacity-50"
                  title={member.status === 'disabled' ? 'Reactivate user' : 'Disable user'}
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest px-1">Invites</h3>
          <div className="space-y-3">
            {invites.length === 0 && (
              <div className="dashboard-card text-sm text-bento-muted font-bold italic">No pending invites.</div>
            )}
            {invites.map(invite => (
              <div key={invite.id} className="dashboard-card gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-bento-text truncate">{invite.email}</p>
                    <p className="text-[10px] text-bento-muted font-black uppercase tracking-widest">{invite.role} role</p>
                  </div>
                  <span className={`pill ${invite.status === 'pending' ? 'pill-support' : 'bg-gray-100 text-bento-muted'}`}>{invite.status}</span>
                </div>
                <p className="text-[10px] text-bento-muted font-bold">Created {new Date(invite.createdAt).toLocaleDateString()}</p>
                {invite.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => copyInviteMessage(invite)}
                    className="btn-secondary h-9 text-[11px] justify-center gap-2 mt-1"
                  >
                    {copiedInviteId === invite.id ? (
                      <><Check className="w-3.5 h-3.5" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy invite message</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
