import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
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
  ArrowUpRight,
  ClipboardList,
  Check,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', plan: 'pro' as Customer['plan'], healthScore: 80 });
  const [editingScoreFor, setEditingScoreFor] = useState<string | null>(null);
  const [editingScoreValue, setEditingScoreValue] = useState('');
  const [creatingTaskFor, setCreatingTaskFor] = useState<Customer | null>(null);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));
    return () => unsub();
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCust,
        successManagerId: user?.uid,
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setIsAdding(false);
      setNewCust({ name: '', plan: 'pro', healthScore: 80 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const saveHealthScore = async (custId: string) => {
    const val = Math.min(100, Math.max(0, Number(editingScoreValue)));
    if (isNaN(val)) { setEditingScoreFor(null); return; }
    try {
      await updateDoc(doc(db, 'customers', custId), { healthScore: val });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${custId}`);
    }
    setEditingScoreFor(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingTaskFor) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        relatedTo: creatingTaskFor.name,
        category: 'success',
        assignedTo: user?.uid,
        createdAt: new Date().toISOString(),
      });
      setCreatingTaskFor(null);
      setNewTask({ title: '', priority: 'medium', dueDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-accent-cs';
    if (score >= 60) return 'text-accent-support';
    return 'text-red-500';
  };

  const sortedByRenewal = [...customers].sort((a, b) =>
    new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
  );

  const filteredCustomers = customers.filter(cust =>
    cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Customer Success</h2>
          <p className="text-bento-muted font-medium">Monitor account health and drive expansions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-bento-border text-sm">
            <Search className="w-4 h-4 text-bento-muted" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-48 font-bold text-sm text-bento-text placeholder:text-bento-muted/50"
            />
          </div>
          <button onClick={() => setIsAdding(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accounts by Health */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2 px-1">
            <ShieldCheck className="w-4 h-4 text-accent-cs" /> Top Accounts by Health
          </h3>
          <div className="space-y-3">
            {filteredCustomers.map((cust, i) => (
              <motion.div
                key={cust.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="dashboard-card group cursor-pointer hover:border-bento-text/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-4 flex-1 min-w-0"
                    onClick={() => onSelectCustomer(cust.name)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-bento-bg flex items-center justify-center border border-bento-border group-hover:bg-white transition-colors shrink-0">
                      <Building className="w-6 h-6 text-bento-text" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-bento-text text-lg tracking-tight leading-tight truncate">{cust.name}</h4>
                      <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest leading-none mt-1">{cust.plan} Plan</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-bento-muted font-bold uppercase tracking-widest">Health</p>
                      {editingScoreFor === cust.id ? (
                        <div className="flex items-center gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            max="100"
                            value={editingScoreValue}
                            onChange={e => setEditingScoreValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveHealthScore(cust.id); if (e.key === 'Escape') setEditingScoreFor(null); }}
                            className="w-14 text-lg font-black text-center border-b-2 border-accent-cs outline-none bg-transparent"
                          />
                          <button onClick={() => saveHealthScore(cust.id)} className="text-accent-cs"><Check className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p
                          className={`text-2xl font-black cursor-pointer hover:underline underline-offset-2 ${getHealthColor(cust.healthScore)}`}
                          title="Click to edit"
                          onClick={(e) => { e.stopPropagation(); setEditingScoreFor(cust.id); setEditingScoreValue(String(cust.healthScore)); }}
                        >
                          {cust.healthScore}%
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setCreatingTaskFor(cust); }}
                        className="p-1.5 text-bento-muted hover:text-accent-sales rounded-lg hover:bg-accent-sales/5 transition-colors opacity-0 group-hover:opacity-100"
                        title="Create task"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                      <ArrowUpRight
                        className="w-5 h-5 text-bento-border group-hover:text-bento-text transition-colors cursor-pointer"
                        onClick={() => onSelectCustomer(cust.name)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-accent-sales" /> Upcoming Renewals
          </h3>
          <div className="bg-white border border-bento-border rounded-[16px] overflow-hidden shadow-sm">
            <div className="divide-y divide-bento-bg">
              {sortedByRenewal.slice(0, 6).map((cust) => {
                const daysUntil = Math.ceil((new Date(cust.renewalDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={cust.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div>
                      <p className="font-bold text-bento-text tracking-tight">{cust.name}</p>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${daysUntil <= 30 ? 'text-red-500' : daysUntil <= 90 ? 'text-accent-support' : 'text-bento-muted'}`}>
                        {daysUntil > 0 ? `${daysUntil}d — ${new Date(cust.renewalDate).toLocaleDateString()}` : 'Expired'}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectCustomer(cust.name)}
                      className="text-[11px] text-accent-sales font-extrabold uppercase tracking-widest hover:underline underline-offset-4"
                    >
                      Review Account
                    </button>
                  </div>
                );
              })}
              {customers.length === 0 && (
                <div className="p-8 text-center text-bento-muted font-medium italic">No accounts found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6">
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Add New Account</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Account Name</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-cs outline-none transition-all font-medium" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Plan</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium" value={newCust.plan} onChange={e => setNewCust({ ...newCust, plan: e.target.value as Customer['plan'] })}>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Initial Health (%)</label>
                  <input type="number" max="100" min="0" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-cs outline-none transition-all font-medium" value={newCust.healthScore} onChange={e => setNewCust({ ...newCust, healthScore: Number(e.target.value) })} />
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

      {/* Create Task Modal */}
      <AnimatePresence>
        {creatingTaskFor && (
          <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[16px] p-8 max-w-md w-full shadow-2xl border border-bento-border space-y-5">
              <div>
                <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Create Task</h3>
                <p className="text-xs text-bento-muted font-bold uppercase tracking-widest mt-1">For: {creatingTaskFor.name}</p>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Task Title</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-cs outline-none font-medium" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Priority</label>
                    <select className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none font-medium" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Due Date</label>
                    <input type="date" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none font-medium" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => setCreatingTaskFor(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create Task</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
