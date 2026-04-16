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
  Heart, 
  Plus, 
  Search,
  ShieldCheck,
  Calendar,
  Building,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  name: string;
  healthScore: number;
  plan: 'basic' | 'pro' | 'enterprise';
  renewalDate: string;
  successManagerId: string;
}

interface CustomerSuccessProps {
  onSelectCustomer: (name: string) => void;
}

export default function CustomerSuccess({ onSelectCustomer }: CustomerSuccessProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', plan: 'pro' as Customer['plan'], healthScore: 80 });

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'customers');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));
    return () => unsub();
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCust,
        successManagerId: user?.uid,
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
      setIsAdding(false);
      setNewCust({ name: '', plan: 'pro', healthScore: 80 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-accent-cs';
    if (score >= 60) return 'text-accent-support';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Customer Success</h2>
          <p className="text-bento-muted font-medium">Monitor account health and drive expansions</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2 px-1">
            <ShieldCheck className="w-4 h-4 text-accent-cs" />
            Top Accounts by Health
          </h3>
          <AnimatePresence>
            <div className="space-y-3">
              {customers.map((cust, i) => (
                <motion.div 
                  key={cust.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onSelectCustomer(cust.name)}
                  className="dashboard-card group cursor-pointer hover:border-bento-text/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-bento-bg flex items-center justify-center border border-bento-border group-hover:bg-white transition-colors">
                        <Building className="w-6 h-6 text-bento-text" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-bento-text text-lg tracking-tight leading-tight">{cust.name}</h4>
                        <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest leading-none mt-1">{cust.plan} Plan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-bento-muted font-bold uppercase tracking-widest">Health</p>
                        <p className={`text-2xl font-black ${getHealthColor(cust.healthScore)}`}>
                          {cust.healthScore}%
                        </p>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-bento-border group-hover:text-bento-text transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-accent-sales" />
            Upcoming Renewals
          </h3>
          <div className="bg-white border border-bento-border rounded-[16px] overflow-hidden shadow-sm">
            <div className="divide-y divide-bento-bg">
              {customers.slice(0, 5).map((cust) => (
                <div key={cust.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-bold text-bento-text tracking-tight">{cust.name}</p>
                    <p className="text-[11px] font-bold text-bento-muted uppercase tracking-wider">Expiring: {new Date(cust.renewalDate).toLocaleDateString()}</p>
                  </div>
                  <button className="text-[11px] text-accent-sales font-extrabold uppercase tracking-widest hover:underline underline-offset-4">
                    Review Account
                  </button>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="p-8 text-center text-bento-muted font-medium italic">
                  No accounts found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6"
          >
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Add New Account</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Account Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-cs outline-none transition-all font-medium"
                  value={newCust.name}
                  onChange={e => setNewCust({...newCust, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Plan</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium"
                    value={newCust.plan}
                    onChange={e => setNewCust({...newCust, plan: e.target.value as Customer['plan']})}
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Initial Health (%)</label>
                  <input 
                    type="number" 
                    max="100"
                    min="0"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-cs outline-none transition-all font-medium"
                    value={newCust.healthScore}
                    onChange={e => setNewCust({...newCust, healthScore: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Account</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
