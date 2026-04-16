import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Building, 
  Mail, 
  Phone, 
  ShieldCheck, 
  TrendingUp, 
  MessageSquare, 
  Target,
  ChevronLeft,
  Calendar,
  Activity as ActivityIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  StickyNote,
  PhoneCall,
  Users as UsersIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerDetailProps {
  customerName: string;
  onBack: () => void;
}

export default function CustomerDetail({ customerName, onBack }: CustomerDetailProps) {
  const { user } = useAuth();
  const [salesLeads, setSalesLeads] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [marketingEngagement, setMarketingEngagement] = useState<any[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newNote, setNewNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // 1. Fetch Sales Leads for this company
    const leadsQ = query(collection(db, 'leads'), where('company', '==', customerName));
    const unsubLeads = onSnapshot(leadsQ, (snap) => {
      setSalesLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Support Tickets
    const ticketsQ = query(collection(db, 'tickets'), where('customerId', '==', customerName), orderBy('createdAt', 'desc'), limit(5));
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {
       const fallbackQ = query(collection(db, 'tickets'), where('customerId', '==', customerName));
       onSnapshot(fallbackQ, (snap) => setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    });

    // 3. Fetch Marketing Engagement
    const marketingQ = query(collection(db, 'marketingEngagement'), limit(10));
    const unsubMarketing = onSnapshot(marketingQ, (snap) => {
      setMarketingEngagement(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch Customer Success Data
    const successQ = query(collection(db, 'customers'), where('name', '==', customerName));
    const unsubSuccess = onSnapshot(successQ, (snap) => {
      if (!snap.empty) {
        setSuccessData({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setLoading(false);
    });

    // 5. Fetch Activities (Timeline)
    const activitiesQ = query(
      collection(db, 'activities'), 
      where('customerId', '==', customerName),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubActivities = onSnapshot(activitiesQ, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {
      const fb = query(collection(db, 'activities'), where('customerId', '==', customerName));
      onSnapshot(fb, (snap) => setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    });

    // 6. Fetch Tasks
    const tasksQ = query(collection(db, 'tasks'), where('relatedTo', '==', customerName));
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubLeads(); unsubTickets(); unsubMarketing(); unsubSuccess(); unsubActivities(); unsubTasks();
    };
  }, [customerName]);

  const handleLogActivity = async (type: 'note' | 'call' | 'meeting') => {
    if (!newNote.trim()) return;
    try {
      await addDoc(collection(db, 'activities'), {
        type,
        subject: type.toUpperCase(),
        content: newNote,
        customerId: customerName,
        createdBy: user?.uid,
        createdAt: new Date().toISOString()
      });
      setNewNote('');
      setIsLogging(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-xl transition-colors text-bento-muted hover:text-bento-text border border-transparent hover:border-bento-border">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Unified 360 View</h2>
            <p className="text-bento-muted font-medium uppercase text-xs tracking-widest">{customerName}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsLogging(true)} className="btn-secondary">
             <Plus className="w-4 h-4" /> Log Activity
           </button>
        </div>
      </div>

      <div className="bento-grid !min-h-0">
        {/* HEADER / IDENTITY CARD */}
        <div className="dashboard-card col-span-1 md:col-span-2 lg:col-span-3 flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-bento-bg border border-bento-border flex items-center justify-center">
            <Building className="w-8 h-8 text-bento-text" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-bento-text tracking-tighter">{customerName}</h3>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-bento-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-cs" />
                {successData?.plan || 'Free'} Plan
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-bento-muted">
                <Calendar className="w-3.5 h-3.5" />
                Renewal: {successData?.renewalDate ? new Date(successData.renewalDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest">Health Score</p>
             <p className={`text-4xl font-black ${successData?.healthScore >= 80 ? 'text-accent-cs' : successData?.healthScore >= 60 ? 'text-accent-support' : 'text-red-500'}`}>
                {successData?.healthScore || 0}%
             </p>
          </div>
        </div>

        {/* RECENT TIMELINE - HubSpot Style */}
        <section className="dashboard-card col-span-1 md:col-span-2 lg:row-span-2">
          <div className="flex items-center justify-between mb-4">
             <span className="pill pill-sales uppercase">Activity Timeline</span>
             <div className="flex gap-1">
                <button onClick={() => setIsLogging(true)} className="p-1.5 hover:bg-gray-50 rounded-lg text-bento-muted transition-colors"><StickyNote className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsLogging(true)} className="p-1.5 hover:bg-gray-50 rounded-lg text-bento-muted transition-colors"><PhoneCall className="w-3.5 h-3.5" /></button>
             </div>
          </div>
          
          <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-bento-bg">
            {activities.map((act) => (
              <div key={act.id} className="relative pl-8 group">
                <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-100 ${
                   act.type === 'call' ? 'bg-accent-sales' : act.type === 'meeting' ? 'bg-accent-marketing' : 'bg-accent-support'
                }`}>
                   {act.type === 'call' && <PhoneCall className="w-2.5 h-2.5 text-white" />}
                   {act.type === 'meeting' && <UsersIcon className="w-2.5 h-2.5 text-white" />}
                   {act.type === 'note' && <StickyNote className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                   <p className="text-[12px] font-black text-bento-text uppercase tracking-tight">{act.subject}</p>
                   <p className="text-[11px] text-bento-text mt-1 leading-relaxed opacity-80">{act.content}</p>
                   <p className="text-[9px] text-bento-muted font-extrabold mt-1.5 uppercase">{new Date(act.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="py-8 text-center bg-bento-bg/30 rounded-2xl border border-dashed border-bento-border mx-4">
                 <p className="text-sm font-bold text-bento-muted italic">No activities logged yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* TASKS - HubSpot Style */}
        <section className="dashboard-card col-span-1">
          <span className="pill pill-success uppercase mb-4">Pending Tasks</span>
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex gap-3 p-3 bg-bento-bg rounded-xl border border-bento-border group hover:bg-white transition-all">
                <div className={`w-1.5 h-full rounded-full shrink-0 ${task.priority === 'high' ? 'bg-red-400' : 'bg-accent-cs'}`} />
                <div>
                   <p className="text-[12px] font-bold text-bento-text">{task.title}</p>
                   <p className="text-[10px] text-bento-muted font-bold">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs font-medium text-bento-muted italic">No active tasks.</p>}
          </div>
        </section>

        {/* SALES CONTEXT */}
        <section className="dashboard-card col-span-1">
          <span className="pill pill-sales uppercase mb-4">Deal Pipeline</span>
          <div className="space-y-3">
             {salesLeads.map(lead => (
               <div key={lead.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black">{lead.stage?.toUpperCase() || 'DISCOVERY'}</p>
                    <p className="text-[11px] font-black text-accent-sales">${(lead.value || 0).toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 w-full bg-bento-bg rounded-full overflow-hidden">
                    <div className="h-full bg-accent-sales" style={{ width: lead.stage === 'proposal' ? '50%' : lead.stage === 'negotiation' ? '75%' : '25%' }} />
                  </div>
               </div>
             ))}
          </div>
        </section>

        {/* SUPPORT & MARKETING MINI-BLOCKS */}
        <section className="dashboard-card col-span-1">
          <span className="pill pill-support uppercase mb-2">CS Roadmap</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
             {['Onboarding', 'Expansion', 'Renewal', 'Advocacy'].map((lab, i) => (
                <div key={i} className="p-2 bg-bento-bg border border-bento-border rounded-lg text-center">
                   <p className="text-[9px] font-black text-bento-muted uppercase tracking-tighter">{lab}</p>
                </div>
             ))}
          </div>
        </section>
      </div>

      {/* ACTIVITY LOG MODAL */}
      <AnimatePresence>
        {isLogging && (
          <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-xl font-extrabold text-bento-text">Log Interaction</h3>
              <div className="flex gap-2">
                 {['note', 'call', 'meeting'].map(type => (
                    <button key={type} onClick={() => handleLogActivity(type as any)} className="flex-1 py-10 rounded-xl bg-bento-bg border border-bento-border hover:bg-white hover:border-bento-text transition-all flex flex-col items-center gap-2 group">
                       {type === 'note' && <StickyNote className="w-5 h-5 text-bento-muted group-hover:text-accent-support" />}
                       {type === 'call' && <PhoneCall className="w-5 h-5 text-bento-muted group-hover:text-accent-sales" />}
                       {type === 'meeting' && <UsersIcon className="w-5 h-5 text-bento-muted group-hover:text-accent-marketing" />}
                       <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                    </button>
                 ))}
              </div>
              <textarea 
                placeholder="Enter details about the interaction..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="w-full h-32 p-4 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-bento-text outline-none transition-all font-medium text-sm"
              />
              <div className="flex gap-3">
                 <button onClick={() => setIsLogging(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
