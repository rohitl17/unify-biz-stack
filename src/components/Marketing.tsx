import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Megaphone, 
  Plus, 
  BarChart3, 
  Mail, 
  Users, 
  Target,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'webinar' | 'ads';
  status: 'planned' | 'active' | 'completed' | 'paused';
  budget: number;
  leadsGenerated: number;
  startDate: string;
}

export default function Marketing() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCamp, setNewCamp] = useState({ name: '', type: 'email' as Campaign['type'], budget: 1000 });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'campaigns'), orderBy('startDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'campaigns'));
    return () => unsub();
  }, [user]);

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'campaigns'), {
        ...newCamp,
        status: 'active',
        leadsGenerated: 0,
        startDate: new Date().toISOString()
      });
      setIsAdding(false);
      setNewCamp({ name: '', type: 'email', budget: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'campaigns');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Marketing Hub</h2>
          <p className="text-bento-muted font-medium">Launch campaigns and track acquisition performance</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dashboard-card bg-[#ede9fe] text-accent-marketing">
          <Mail className="w-8 h-8 mb-4 opacity-50" />
          <h4 className="text-accent-marketing/60 text-[10px] font-extrabold uppercase tracking-widest mb-1">Email Campaigns</h4>
          <p className="text-3xl font-black">{campaigns.filter(c => c.type === 'email').length}</p>
        </div>
        <div className="dashboard-card bg-[#fef3c7] text-accent-support">
          <Users className="w-8 h-8 mb-4 opacity-50" />
          <h4 className="text-accent-support/60 text-[10px] font-extrabold uppercase tracking-widest mb-1">Total Leads</h4>
          <p className="text-3xl font-black">{campaigns.reduce((acc, c) => acc + (c.leadsGenerated || 0), 0)}</p>
        </div>
        <div className="dashboard-card bg-bento-text text-white">
          <BarChart3 className="w-8 h-8 mb-4 opacity-50" />
          <h4 className="text-white/40 text-[10px] font-extrabold uppercase tracking-widest mb-1">Avg ROI</h4>
          <p className="text-3xl font-black">2.4x</p>
        </div>
        <div className="dashboard-card bg-[#dcfce7] text-accent-cs">
          <Target className="w-8 h-8 mb-4 opacity-50" />
          <h4 className="text-accent-cs/60 text-[10px] font-extrabold uppercase tracking-widest mb-1">Conversion</h4>
          <p className="text-3xl font-black">12%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {campaigns.map((camp, i) => (
            <motion.div 
              key={camp.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="dashboard-card border-l-[6px] border-l-accent-marketing space-y-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-extrabold text-bento-text tracking-tighter uppercase">{camp.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="pill pill-marketing px-2 py-0.5 uppercase">{camp.type}</span>
                    <span className="pill bg-gray-100 text-bento-muted px-2 py-0.5 uppercase">{camp.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest">Budget</p>
                  <p className="text-lg font-extrabold text-bento-text">${camp.budget.toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-5 border-t border-bento-bg flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-accent-marketing" />
                  <span className="font-extrabold text-bento-text uppercase tracking-tight text-[11px]">{camp.leadsGenerated} Leads Generated</span>
                </div>
                <button className="text-[11px] text-accent-marketing font-extrabold uppercase tracking-widest hover:underline underline-offset-4">Analytics →</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6"
          >
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Launch New Campaign</h3>
            <form onSubmit={handleAddCampaign} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Campaign Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-marketing outline-none transition-all font-medium"
                  value={newCamp.name}
                  onChange={e => setNewCamp({...newCamp, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Channel</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium"
                    value={newCamp.type}
                    onChange={e => setNewCamp({...newCamp, type: e.target.value as Campaign['type']})}
                  >
                    <option value="email">Email</option>
                    <option value="social">Social Media</option>
                    <option value="webinar">Webinar</option>
                    <option value="ads">Paid Ads</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Budget ($)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-marketing outline-none transition-all font-medium"
                    value={newCamp.budget}
                    onChange={e => setNewCamp({...newCamp, budget: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Launch</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
