// Deterministic account health, computed from live cross-module signals —
// the same philosophy as computeLeadScore() in Sales. The stored
// `healthScoreOverride` field, when present, wins over the computed value.

export interface HealthSignals {
  openTickets: number;        // status !== 'resolved'/'closed'
  urgentOrHighOpen: number;   // open tickets at high/urgent priority
  recentActivities: number;   // activities in the last 30 days
  recentEngagements: number;  // marketing engagements in the last 30 days
  daysToRenewal: number | null;
}

export interface HealthFactor {
  label: string;
  delta: number;
}

export function computeHealthScore(s: HealthSignals): { score: number; factors: HealthFactor[] } {
  const factors: HealthFactor[] = [{ label: 'Baseline', delta: 75 }];

  const activityBonus = Math.min(15, s.recentActivities * 3);
  if (activityBonus) factors.push({ label: `${s.recentActivities} recent activities`, delta: activityBonus });

  const engagementBonus = Math.min(10, s.recentEngagements * 2);
  if (engagementBonus) factors.push({ label: `${s.recentEngagements} marketing engagements`, delta: engagementBonus });

  const ticketPenalty = Math.min(20, s.openTickets * 5);
  if (ticketPenalty) factors.push({ label: `${s.openTickets} open tickets`, delta: -ticketPenalty });

  const urgentPenalty = Math.min(15, s.urgentOrHighOpen * 5);
  if (urgentPenalty) factors.push({ label: `${s.urgentOrHighOpen} high-priority open`, delta: -urgentPenalty });

  if (s.daysToRenewal !== null && s.daysToRenewal <= 30) {
    factors.push({ label: 'Renewal within 30 days', delta: -10 });
  }

  const score = Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.delta, 0)));
  return { score, factors };
}

const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

const toMs = (t: any): number => (t?.toDate ? t.toDate().getTime() : new Date(t).getTime());

// Assembles HealthSignals for one customer from raw org-wide collections.
// Ticket/activity/engagement docs are matched by their customerName join key.
export function signalsForCustomer(
  customerName: string,
  renewalDate: string | undefined,
  tickets: { customerId?: string; status?: string; priority?: string }[],
  activities: { customerId?: string; createdAt?: string }[],
  engagements: { customerName?: string; timestamp?: any }[]
): HealthSignals {
  const now = Date.now();
  const open = tickets.filter(t => t.customerId === customerName && t.status !== 'resolved' && t.status !== 'closed');
  return {
    openTickets: open.length,
    urgentOrHighOpen: open.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    recentActivities: activities.filter(a => a.customerId === customerName && a.createdAt && now - toMs(a.createdAt) <= RECENT_MS).length,
    recentEngagements: engagements.filter(e => e.customerName === customerName && e.timestamp && now - toMs(e.timestamp) <= RECENT_MS).length,
    daysToRenewal: renewalDate ? Math.ceil((new Date(renewalDate).getTime() - now) / 86400000) : null,
  };
}

// Effective health: manual override if set, otherwise computed.
export function effectiveHealth(
  customer: { name: string; renewalDate?: string; healthScoreOverride?: number | null },
  tickets: any[],
  activities: any[],
  engagements: any[]
): { score: number; isOverride: boolean; factors: HealthFactor[] } {
  const { score, factors } = computeHealthScore(
    signalsForCustomer(customer.name, customer.renewalDate, tickets, activities, engagements)
  );
  if (typeof customer.healthScoreOverride === 'number') {
    return { score: customer.healthScoreOverride, isOverride: true, factors };
  }
  return { score, isOverride: false, factors };
}
