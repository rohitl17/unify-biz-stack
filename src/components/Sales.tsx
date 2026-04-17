import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus, 
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Lead {
  id: string;
  company: string;
  contactName: string;
  email: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  leadScore: number;
  value: number;
  ownerId: string;
  createdAt: any;
}

interface SalesProps {
  onSelectCustomer: (name: string) => void;
}

export default function Sales({ onSelectCustomer }: SalesProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({ company: '', contactName: '', email: '', value: 0 });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leads'));
    return () => unsub();
  }, [user]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic lead scoring logic simulated:
      const score = Math.floor(Math.random() * 60) + 20; // Simulated logic
      await addDoc(collection(db, 'leads'), {
        ...newLead,
        status: 'new',
        stage: 'discovery',
        leadScore: score,
        ownerId: user?.uid,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewLead({ company: '', contactName: '', email: '', value: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
    }
  };

  const updateField = async (leadId: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { [field]: value });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const stats = [
    { label: 'Active Leads', value: leads.length, icon: Users, color: 'text-accent-sales', bg: 'bg-[#dbeafe]' },
    { label: 'Avg lead Score', value: leads.length > 0 ? Math.round(leads.reduce((acc,l) => acc + (l.leadScore || 0), 0) / leads.length) : 0, icon: CheckCircle2, color: 'text-accent-cs', bg: 'bg-[#dcfce7]' },
    { label: 'Pipeline Value', value: `$${leads.reduce((acc, l) => acc + (l.value || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-accent-marketing', bg: 'bg-[#ede9fe]' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const filteredLeads = leads.filter(lead => 
    lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Sales Pipeline</h2>
          <p className="text-bento-muted font-medium">Manage your leads and track performance</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="dashboard-card flex-row items-center gap-4"
          >
            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl shrink-0`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-bento-muted uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-extrabold text-bento-text">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-bento-border flex-1 max-sm text-sm">
            <Search className="w-4 h-4 text-bento-muted" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full font-bold text-sm text-bento-text placeholder:text-bento-muted/50" 
            />
          </div>
          <button className="btn-secondary h-11 px-5">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredLeads.map((lead, i) => (
              <motion.div 
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectCustomer(lead.company)}
                className="dashboard-card group hover:border-bento-text/20 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bento-bg flex items-center justify-center border border-bento-border group-hover:bg-accent-sales/5 transition-colors">
                      <Users className="w-5 h-5 text-accent-sales" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-bento-text leading-tight tracking-tight">{lead.company}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-bento-muted font-bold uppercase tracking-widest">{lead.contactName}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${getScoreColor(lead.leadScore || 0)}`}>
                          SCORE: {lead.leadScore || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-bento-muted hover:text-bento-text p-1 translate-x-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] text-bento-muted font-extrabold uppercase tracking-widest">Status</p>
                      <select 
                        value={lead.status} 
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateField(lead.id, 'status', e.target.value)}
                        className={`w-full py-1 text-[11px] font-bold rounded-lg border-none outline-none appearance-none cursor-pointer text-center ${
                          lead.status === 'qualified' ? 'pill-cs' :
                          lead.status === 'contacted' ? 'pill-sales' :
                          lead.status === 'lost' ? 'bg-red-50 text-red-500' :
                          'bg-gray-100 text-bento-muted'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-bento-muted font-extrabold uppercase tracking-widest">Stage</p>
                      <select 
                        value={lead.stage || 'discovery'} 
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateField(lead.id, 'stage', e.target.value)}
                        className="w-full py-1 text-[11px] font-bold rounded-lg border-none outline-none appearance-none cursor-pointer text-center bg-accent-marketing/5 text-accent-marketing"
                      >
                        <option value="discovery">Discovery</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest mb-1">Deal Value</p>
                      <p className="text-2xl font-black text-bento-text tracking-tighter">${(lead.value || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-bento-bg flex items-center justify-between text-[11px] font-bold text-bento-muted uppercase tracking-wider">
                    <span className="truncate max-w-[150px]">{lead.email}</span>
                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6"
          >
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Company Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium"
                  value={newLead.company}
                  onChange={e => setNewLead({...newLead, company: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Contact Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium"
                    value={newLead.contactName}
                    onChange={e => setNewLead({...newLead, contactName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Value ($)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium"
                    value={newLead.value}
                    onChange={e => setNewLead({...newLead, value: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium"
                  value={newLead.email}
                  onChange={e => setNewLead({...newLead, email: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Lead</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
