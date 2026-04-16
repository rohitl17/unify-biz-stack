import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface CustomerDetailProps {
  customerName: string;
  onBack: () => void;
}

export default function CustomerDetail({ customerName, onBack }: CustomerDetailProps) {
  const [salesLeads, setSalesLeads] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [marketingEngagement, setMarketingEngagement] = useState<any[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // 1. Fetch Sales Leads for this company
    const leadsQ = query(
      collection(db, 'leads'),
      where('company', '==', customerName)
    );
    const unsubLeads = onSnapshot(leadsQ, (snap) => {
      setSalesLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Support Tickets
    // In our simplified schema, we use customerId which we'll treat as company name for demo
    const ticketsQ = query(
      collection(db, 'tickets'),
      where('customerId', '==', customerName),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
       // If no index, fall back to simple query
       const fallbackQ = query(collection(db, 'tickets'), where('customerId', '==', customerName));
       onSnapshot(fallbackQ, (snap) => setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    });

    // 3. Fetch Marketing Engagement
    // Using a simple where on company-like field or email if we had it. 
    // For now we'll fetch all and filter in app for the demo since we might not have email linked
    const marketingQ = query(collection(db, 'marketingEngagement'), limit(10));
    const unsubMarketing = onSnapshot(marketingQ, (snap) => {
      // For demo, we just show engagement if we find it
      setMarketingEngagement(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch Customer Success Data
    const successQ = query(
      collection(db, 'customers'),
      where('name', '==', customerName)
    );
    const unsubSuccess = onSnapshot(successQ, (snap) => {
      if (!snap.empty) {
        setSuccessData({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setLoading(false);
    });

    return () => {
      unsubLeads();
      unsubTickets();
      unsubMarketing();
      unsubSuccess();
    };
  }, [customerName]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white rounded-xl transition-colors text-bento-muted hover:text-bento-text border border-transparent hover:border-bento-border"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Customer Profile</h2>
          <p className="text-bento-muted font-medium uppercase text-xs tracking-widest">{customerName}</p>
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

        {/* SALES ENGAGEMENT */}
        <section className="dashboard-card col-span-1 md:col-span-2 lg:col-span-2">
          <span className="pill pill-sales uppercase mb-4">Sales Context</span>
          <div className="space-y-4">
            {salesLeads.map((lead) => (
              <div key={lead.id} className="p-4 bg-bento-bg rounded-xl border border-bento-border flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-bento-text">{lead.status.toUpperCase()}</p>
                  <p className="text-xs text-bento-muted font-bold">Value: ${lead.value?.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-accent-sales" />
              </div>
            ))}
            {salesLeads.length === 0 && <p className="text-sm font-medium text-bento-muted italic">No sales history found.</p>}
          </div>
        </section>

        {/* MARKETING ENGAGEMENT */}
        <section className="dashboard-card col-span-1 md:col-span-1">
          <span className="pill pill-marketing uppercase mb-4">Marketing Activity</span>
          <div className="space-y-3">
             {[
               { type: 'Email Open', name: 'Q2 Newsletter', date: '2h ago' },
               { type: 'Website Visit', name: 'Pricing Page', date: '5h ago' },
               { type: 'Ad Click', name: 'Retargeting A', date: '1d ago' },
             ].map((item, i) => (
               <div key={i} className="flex items-center gap-3">
                 <Activity className="w-4 h-4 text-accent-marketing shrink-0" />
                 <div className="overflow-hidden">
                   <p className="text-[11px] font-extrabold text-bento-text truncate uppercase">{item.type}: {item.name}</p>
                   <p className="text-[10px] text-bento-muted font-bold">{item.date}</p>
                 </div>
               </div>
             ))}
          </div>
        </section>

        {/* SUPPORT TICKETS */}
        <section className="dashboard-card col-span-1 md:col-span-2 lg:col-span-1">
          <span className="pill pill-support uppercase mb-4">Support History</span>
          <div className="space-y-3">
            {supportTickets.map((ticket) => (
               <div key={ticket.id} className="pb-3 border-b border-bento-bg last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                      ticket.status === 'resolved' ? 'bg-accent-cs/10 text-accent-cs' : 'bg-accent-support/10 text-accent-support'
                    }`}>
                      {ticket.status}
                    </span>
                    <span className="text-[9px] font-bold text-bento-muted">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[12px] font-bold text-bento-text truncate">{ticket.subject}</p>
               </div>
            ))}
            {supportTickets.length === 0 && <p className="text-[11px] font-medium text-bento-muted italic">No tickets recorded.</p>}
          </div>
        </section>

        {/* CUSTOMER SUCCESS JOURNEY */}
        <section className="dashboard-card col-span-1 md:col-span-1 lg:col-span-2">
          <span className="pill pill-cs uppercase mb-4">Success Roadmap</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Onboarding', completed: true },
               { label: 'Training', completed: true },
               { label: 'Integration', completed: false },
               { label: 'Optimization', completed: false },
             ].map((step, i) => (
                <div key={i} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 ${step.completed ? 'bg-accent-cs/5 border-accent-cs/20' : 'bg-bento-bg border-bento-border'}`}>
                   {step.completed ? <CheckCircle2 className="w-5 h-5 text-accent-cs" /> : <Clock className="w-5 h-5 text-bento-muted" />}
                   <p className="text-[10px] font-bold text-bento-text uppercase tracking-tight">{step.label}</p>
                </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  );
}
