import React, { useState, useEffect } from 'react';
import {
  updateDoc,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { addOrgDoc, orgQuery, orgCollection, orgDoc } from '../lib/firestoreWithOrg';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  Search,
  Filter,
  X,
  ClipboardList,
  Upload,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initials, avatarColors } from '../lib/avatar';
import { parseCsv, validateLeadRows, toCsv, downloadCsv, RowResult } from '../lib/csv';
import { findNameMatch } from '../lib/customerMatch';

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
  campaignId?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'completed' | 'paused';
}

interface SalesProps {
  onSelectCustomer: (name: string) => void;
  campaigns: Campaign[];
  customers: { name: string }[];
}

function computeLeadScore(lead: Partial<Lead>): number {
  const stagePoints: Record<string, number> = {
    discovery: 20, proposal: 40, negotiation: 60, closed_won: 100, closed_lost: 0,
  };
  const statusPoints: Record<string, number> = {
    new: 0, contacted: 5, qualified: 15, lost: 0,
  };
  const valuePoints = Math.min(25, Math.floor(((lead.value || 0) / 20000) * 25));
  const stage = stagePoints[lead.stage || 'discovery'] ?? 20;
  const status = statusPoints[lead.status || 'new'] ?? 0;
  return Math.min(100, stage + status + valuePoints);
}

export default function Sales({ onSelectCustomer, campaigns, customers }: SalesProps) {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({ company: '', contactName: '', email: '', value: 0, campaignId: '' });
  const [creatingTaskFor, setCreatingTaskFor] = useState<Lead | null>(null);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });
  const [importRows, setImportRows] = useState<RowResult[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!user || !profile?.orgId) return;
    const q = orgQuery('leads', profile.orgId, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leads'));
    return () => unsub();
  }, [user, profile?.orgId]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.orgId) return;
    try {
      const { campaignId, ...rest } = newLead;
      const draft = { ...rest, status: 'new' as const, stage: 'discovery' as const };
      await addOrgDoc('leads', {
        ...draft,
        leadScore: computeLeadScore(draft),
        ownerId: user?.uid,
        createdAt: new Date().toISOString(),
        ...(campaignId ? { campaignId } : {}),
      }, profile.orgId);
      setIsAdding(false);
      setNewLead({ company: '', contactName: '', email: '', value: 0, campaignId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
    }
  };

  const updateField = async (leadId: string, field: string, value: any) => {
    if (!profile?.orgId) return;
    try {
      const lead = leads.find(l => l.id === leadId);
      const updated = { ...(lead || {}), [field]: value };
      await updateDoc(orgDoc(profile.orgId, 'leads', leadId), { [field]: value, leadScore: computeLeadScore(updated) });

      if (field === 'stage' && value === 'closed_won' && lead) {
        // Normalized match so "Acme Inc." doesn't create a duplicate of "Acme Inc"
        const match = findNameMatch(lead.company, customers.map(c => c.name));
        if (!match) {
          const renewalDate = new Date();
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          await addOrgDoc('customers', {
            name: lead.company,
            plan: 'basic',
            healthScore: 75,
            renewalDate: renewalDate.toISOString(),
            successManagerId: user?.uid || '',
          }, profile.orgId);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingTaskFor || !profile?.orgId) return;
    try {
      await addOrgDoc('tasks', {
        ...newTask,
        relatedTo: creatingTaskFor.company,
        category: 'sales',
        assignedTo: user?.uid,
        createdAt: new Date().toISOString(),
      }, profile.orgId);
      setCreatingTaskFor(null);
      setNewTask({ title: '', priority: 'medium', dueDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      setImportError('The file is empty.');
      setImportRows([]);
      return;
    }
    const { results, headerError } = validateLeadRows(parsed);
    if (headerError) {
      setImportError(headerError);
      setImportRows([]);
      return;
    }
    setImportRows(results);
  };

  const confirmImport = async () => {
    if (!importRows || !profile?.orgId || !user) return;
    const valid = importRows.filter(r => r.lead);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      // Firestore batches cap at 500 writes; chunk to stay under it.
      for (let i = 0; i < valid.length; i += 400) {
        const batch = writeBatch(db);
        for (const row of valid.slice(i, i + 400)) {
          const ref = doc(orgCollection(profile.orgId, 'leads'));
          batch.set(ref, {
            ...row.lead,
            leadScore: computeLeadScore(row.lead!),
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            orgId: profile.orgId,
          });
        }
        await batch.commit();
      }
      setImportRows(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
      setImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['company', 'contactName', 'email', 'value', 'status', 'stage', 'leadScore', 'createdAt'],
        leads.map(l => [l.company, l.contactName, l.email, l.value || 0, l.status, l.stage || 'discovery', computeLeadScore(l), l.createdAt || ''])
      )
    );
  };

  const activeFilters = [filterStatus, filterStage].filter(Boolean).length;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesStage = !filterStage || lead.stage === filterStage;
    return matchesSearch && matchesStatus && matchesStage;
  });

  const stats = [
    { label: 'Active Leads', value: leads.length, icon: Users, color: 'text-accent-sales', bg: 'bg-[#dbeafe]' },
    { label: 'Avg Lead Score', value: leads.length > 0 ? Math.round(leads.reduce((acc, l) => acc + computeLeadScore(l), 0) / leads.length) : 0, icon: CheckCircle2, color: 'text-accent-cs', bg: 'bg-[#dcfce7]' },
    { label: 'Pipeline Value', value: `$${leads.reduce((acc, l) => acc + (l.value || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-accent-marketing', bg: 'bg-[#ede9fe]' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-bento-text tracking-tighter">Sales Pipeline</h2>
          <p className="text-bento-muted font-medium">Manage your leads and track performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary" title="Export leads to CSV" disabled={leads.length === 0}>
            <Download className="w-4 h-4" /> Export
          </button>
          <label className="btn-secondary cursor-pointer" title="Import leads from CSV">
            <Upload className="w-4 h-4" /> Import
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />
          </label>
          <button onClick={() => setIsAdding(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="dashboard-card flex-row items-center gap-3.5">
            <div className={`${stat.bg} ${stat.color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0`}><stat.icon className="w-[18px] h-[18px]" /></div>
            <div>
              <p className="text-[11px] font-bold text-bento-muted uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-extrabold text-bento-text">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-bento-border flex-1 text-sm">
            <Search className="w-4 h-4 text-bento-muted" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full font-bold text-sm text-bento-text placeholder:text-bento-muted/50"
            />
          </div>
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`btn-secondary h-11 px-5 relative ${activeFilters > 0 ? 'border-accent-sales text-accent-sales' : ''}`}
          >
            <Filter className="w-4 h-4" /> Filter
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-sales text-white text-[9px] font-black flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-bento-border rounded-2xl p-4 flex flex-wrap gap-4 items-end"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black text-bento-muted uppercase tracking-widest">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-bento-bg border border-bento-border text-[12px] font-bold outline-none cursor-pointer"
                >
                  <option value="">All</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-bento-muted uppercase tracking-widest">Stage</label>
                <select
                  value={filterStage}
                  onChange={e => setFilterStage(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-bento-bg border border-bento-border text-[12px] font-bold outline-none cursor-pointer"
                >
                  <option value="">All</option>
                  <option value="discovery">Discovery</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterStage(''); }}
                  className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
              <p className="text-[11px] text-bento-muted font-bold ml-auto">{filteredLeads.length} of {leads.length} leads</p>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 font-extrabold text-[13px]"
                      style={{ background: avatarColors(i).bg, color: avatarColors(i).fg }}
                    >
                      {initials(lead.company)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-bento-text leading-tight tracking-tight truncate">{lead.company}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-bento-muted font-bold uppercase tracking-widest">{lead.contactName}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${getScoreColor(computeLeadScore(lead))}`}>
                          SCORE: {computeLeadScore(lead)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreatingTaskFor(lead); }}
                    className="text-bento-muted hover:text-accent-sales p-1.5 translate-x-1 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-accent-sales/5"
                    title="Create task"
                  >
                    <ClipboardList className="w-4 h-4" />
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

                  <div>
                    <p className="text-[10px] text-bento-muted font-extrabold uppercase tracking-widest mb-1">Deal Value</p>
                    <p className="text-2xl font-black text-bento-text tracking-tighter">${(lead.value || 0).toLocaleString()}</p>
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

      {/* Add Lead Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[16px] p-8 max-w-lg w-full shadow-2xl border border-bento-border space-y-6">
            <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Company Name</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium" value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} />
                {(() => {
                  const match = findNameMatch(newLead.company, customers.map(c => c.name));
                  if (match?.kind !== 'near') return null;
                  return (
                    <p className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Existing account "{match.name}" is spelled differently — using this spelling would disconnect it from that account's history.{' '}
                      <button
                        type="button"
                        onClick={() => setNewLead({ ...newLead, company: match.name })}
                        className="underline underline-offset-2 hover:text-amber-800"
                      >
                        Use "{match.name}"
                      </button>
                    </p>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Contact Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium" value={newLead.contactName} onChange={e => setNewLead({ ...newLead, contactName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Value ($)</label>
                  <input type="number" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium" value={newLead.value} onChange={e => setNewLead({ ...newLead, value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Email Address</label>
                <input type="email" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none transition-all font-medium" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
              </div>
              {campaigns.filter(c => c.status === 'active').length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Source Campaign <span className="normal-case font-medium">(optional)</span></label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border outline-none appearance-none cursor-pointer font-medium"
                    value={newLead.campaignId}
                    onChange={e => setNewLead({ ...newLead, campaignId: e.target.value })}
                  >
                    <option value="">— No attribution —</option>
                    {campaigns.filter(c => c.status === 'active').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Lead</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {(importRows !== null || importError) && (
        <div className="fixed inset-0 bg-bento-text/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[16px] p-8 max-w-2xl w-full shadow-2xl border border-bento-border space-y-5 max-h-[85vh] flex flex-col">
            <div>
              <h3 className="text-2xl font-extrabold text-bento-text tracking-tighter">Import Leads from CSV</h3>
              {importRows && importRows.length > 0 && !importError && (
                <p className="text-xs text-bento-muted font-bold uppercase tracking-widest mt-1">
                  {importRows.filter(r => r.lead).length} valid · {importRows.filter(r => !r.lead).length} skipped
                </p>
              )}
            </div>

            {importError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium break-words">{importError}</p>
              </div>
            )}

            {importRows && importRows.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {importRows.map(row => (
                  <div key={row.line} className={`rounded-xl border px-4 py-2.5 ${row.lead ? 'border-bento-border bg-bento-bg' : 'border-red-200 bg-red-50'}`}>
                    {row.lead ? (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-bold text-bento-text truncate">{row.lead.company} — {row.lead.contactName}</span>
                        <span className="text-xs text-bento-muted font-bold shrink-0">${row.lead.value.toLocaleString()} · {row.lead.stage}</span>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="font-black text-red-500 uppercase tracking-widest">Line {row.line} skipped</span>
                        <p className="text-red-600 font-medium mt-0.5">{row.errors.join('; ')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => { setImportRows(null); setImportError(null); }} className="btn-secondary flex-1" disabled={importing}>Cancel</button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing || !importRows || importRows.filter(r => r.lead).length === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${importRows ? importRows.filter(r => r.lead).length : 0} Leads`}
              </button>
            </div>
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
                <p className="text-xs text-bento-muted font-bold uppercase tracking-widest mt-1">For: {creatingTaskFor.company}</p>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-bento-muted uppercase tracking-widest">Task Title</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl bg-bento-bg border border-bento-border focus:ring-2 focus:ring-accent-sales outline-none font-medium" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
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
