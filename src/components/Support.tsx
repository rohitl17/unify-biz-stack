import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  MessageSquare,
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  User,
  X,
  Send,
  StickyNote,
  PhoneCall,
  ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  customerId: string;
  assignedTo: string;
  createdAt: string;
}

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [threadTicket, setThreadTicket] = useState<Ticket | null>(null);
  const [threadActivities, setThreadActivities] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [creatingTaskFor, setCreatingTaskFor] = useState<Ticket | null>(null);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    customerId: '',
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'tickets'), orderBy('createdAt', 'desc')),
      (snap) => setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'tickets')
    );
    const custUnsub = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub(); custUnsub(); };
  }, [user]);

  // Load thread activities when a ticket is selected
  useEffect(() => {
    if (!threadTicket) { setThreadActivities([]); return; }
    const q = query(
      collection(db, 'activities'),
      where('customerId', '==', threadTicket.customerId),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setThreadActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {
      const fallback = query(collection(db, 'activities'), where('customerId', '==', threadTicket.customerId));
      onSnapshot(fallback, (snap) => setThreadActivities(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsub();
  }, [threadTicket]);

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.customerId) return;
    try {
      await addDoc(collection(db, 'tickets'), {
        ...newTicket,
        status: 'open',
        assignedTo: user?.displayName || 'Support Team',
        createdAt: new Date().toISOString(),
      });
      setIsAdding(false);
      setNewTicket({ subject: '', description: '', priority: 'medium', customerId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tickets');
    }
  };

  const updateStatus = async (ticketId: string, status: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticketId}`);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !threadTicket) return;
    try {
      await addDoc(collection(db, 'activities'), {
        type: 'note',
        subject: `Support: ${threadTicket.subject}`,
        content: replyText,
        customerId: threadTicket.customerId,
        createdBy: user?.uid,
        createdAt: new Date().toISOString(),
      });
      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingTaskFor) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        relatedTo: creatingTaskFor.customerId,
        category: 'support',
        assignedTo: user?.uid,
        createdAt: new Date().toISOString(),
      });
      setCreatingTaskFor(null);
      setNewTask({ title: '', priority: 'medium', dueDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const stats = [
    { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: MessageSquare, color: 'text-accent-support', bg: 'bg-[#fef3c7]' },
    { label: 'High Priority', value: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle, color: 'text-accent-cs', bg: 'bg-[#dcfce7]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Support Center</h2>
          <p className="text-bento-muted font-medium">Track and resolve customer issues in real-time</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="dashboard-card flex-row items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl shrink-0`}><stat.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-[12px] font-bold text-bento-muted uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-extrabold text-bento-text">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {tickets.map((ticket, i) => (
            <motion.div key={ticket.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="dashboard-card group hover:border-bento-text/20 transition-all">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                      ticket.priority === 'urgent' ? 'bg-red-600 text-white' :
                      ticket.priority === 'high' ? 'bg-red-50 text-red-500' :
                      ticket.priority === 'medium' ? 'bg-[#fef3c7] text-accent-support' :
                      'bg-blue-50 text-accent-sales'
                    }`}>{ticket.priority}</span>
                    <h3 className="text-lg font-extrabold text-bento-text leading-tight">{ticket.subject}</h3>
                  </div>
                  <p className="text-bento-muted font-medium line-clamp-2 text-sm">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-bento-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{ticket.assignedTo || 'Unassigned'}</span>
                    {ticket.customerId && <span className="text-accent-support">{ticket.customerId}</span>}
                  </div>
                </div>
                <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 min-w-[160px]">
                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value as Ticket['status'])}
                    className={`w-full px-4 py-2.5 rounded-xl border-dashed border-2 text-[11px] font-extrabold uppercase tracking-widest outline-none appearance-none cursor-pointer transition-all ${
                      ticket.status === 'resolved' ? 'border-accent-cs bg-[#dcfce7] text-accent-cs' :
                      ticket.status === 'open' ? 'border-accent-support bg-[#fef3c7] text-accent-support' :
                      'border-bento-border bg-bento-bg text-bento-muted'
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => { setThreadTicket(ticket); setReplyText(''); }}
                      className="flex-1 text-[11px] text-accent-support hover:text-bento-text font-extrabold uppercase tracking-widest transition-colors border border-dashed border-accent-support/30 hover:border-bento-border rounded-lg py-1.5 px-2"
                    >
                      Thread
                    </button>
                    <button
                      onClick={() => setCreatingTaskFor(ticket)}
                      className="p-1.5 text-bento-muted hover:text-accent-sales rounded-lg hover:bg-accent-sales/5 transition-colors border border-transparent hover:border-bento-border"
                      title="Create task"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Ticket Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6">
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Create New Ticket</h3>
            <form onSubmit={handleAddTicket} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Subject</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-support outline-none transition-all font-medium" value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Customer Account</label>
                <select required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium" value={newTicket.customerId} onChange={e => setNewTicket({ ...newTicket, customerId: e.target.value })}>
                  <option value="">Select a customer...</option>
                  {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Priority</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium" value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as Ticket['priority'] })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Description</label>
                  <textarea required rows={4} className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-support outline-none transition-all resize-none font-medium" value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit Ticket</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Thread Modal */}
      <AnimatePresence>
        {threadTicket && (
          <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4 z-50">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="bg-white rounded-[16px] w-full max-w-lg shadow-2xl border border-bento-border flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-bento-bg flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-bento-text tracking-tight">{threadTicket.subject}</h3>
                  <p className="text-[11px] text-bento-muted font-bold uppercase tracking-widest mt-0.5">{threadTicket.customerId} · {threadTicket.priority} priority</p>
                </div>
                <button onClick={() => setThreadTicket(null)} className="p-2 hover:bg-bento-bg rounded-xl text-bento-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-3 bg-bento-bg rounded-xl border border-bento-border">
                  <p className="text-[10px] font-black text-bento-muted uppercase tracking-widest mb-1">Original Issue</p>
                  <p className="text-sm font-medium text-bento-text">{threadTicket.description}</p>
                </div>

                {threadActivities.length === 0 ? (
                  <p className="text-center text-sm text-bento-muted italic py-4">No replies yet. Be the first to respond.</p>
                ) : threadActivities.map(act => (
                  <div key={act.id} className={`flex gap-3 ${act.createdBy === user?.uid ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-black ${act.type === 'call' ? 'bg-accent-sales' : act.type === 'meeting' ? 'bg-accent-marketing' : 'bg-accent-support'}`}>
                      {act.type === 'call' ? <PhoneCall className="w-3 h-3" /> : <StickyNote className="w-3 h-3" />}
                    </div>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${act.createdBy === user?.uid ? 'bg-bento-text text-white rounded-tr-sm' : 'bg-bento-bg text-bento-text rounded-tl-sm'}`}>
                      <p className="font-medium">{act.content}</p>
                      <p className={`text-[9px] font-bold mt-1 ${act.createdBy === user?.uid ? 'text-white/50' : 'text-bento-muted'}`}>{new Date(act.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-bento-bg flex gap-3">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-bento-bg border border-bento-border outline-none font-medium text-sm focus:ring-2 focus:ring-accent-support"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className={`p-2.5 rounded-xl transition-all ${replyText.trim() ? 'bg-bento-text text-white hover:opacity-90' : 'bg-bento-bg text-bento-muted cursor-not-allowed'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {creatingTaskFor && (
          <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[16px] p-8 max-w-md w-full shadow-2xl border border-bento-border space-y-5">
              <div>
                <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Create Task</h3>
                <p className="text-xs text-bento-muted font-bold uppercase tracking-widest mt-1">For: {creatingTaskFor.customerId}</p>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Task Title</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-support outline-none font-medium" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
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
