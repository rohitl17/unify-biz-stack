// Derives an in-app notification feed from data already loaded in App.tsx —
// no separate `notifications` collection needed. Signals: high/urgent open
// tickets, accounts whose computed health has dropped below 60, and tasks
// due today or overdue. This is the "reduce time between a signal appearing
// and a human acting on it" thesis from docs/PRODUCT.md, made visible.

import { effectiveHealth } from './healthScore';

export type Module = 'overview' | 'sales' | 'support' | 'marketing' | 'success' | 'admin';

export interface AppNotification {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  subtitle: string;
  module: Module;
  customerName?: string;
  sortKey: number; // higher = more urgent/recent, for ordering
}

const TASK_MODULE: Record<string, Module> = {
  sales: 'sales', support: 'support', success: 'success', marketing: 'marketing',
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildNotifications(
  customers: { name: string; renewalDate?: string; healthScoreOverride?: number }[],
  tickets: { id: string; subject: string; customerId?: string; priority?: string; status?: string }[],
  activities: any[],
  engagements: any[],
  tasks: { id: string; title: string; dueDate?: string; category?: string; relatedTo?: string }[]
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const t of tickets) {
    if ((t.priority === 'high' || t.priority === 'urgent') && t.status !== 'resolved' && t.status !== 'closed') {
      notifications.push({
        id: `ticket-${t.id}`,
        severity: t.priority === 'urgent' ? 'high' : 'medium',
        title: t.subject,
        subtitle: `${t.customerId || 'Unassigned account'} · ${t.priority} priority ticket`,
        module: 'support',
        sortKey: t.priority === 'urgent' ? 100 : 90,
      });
    }
  }

  for (const c of customers) {
    const { score } = effectiveHealth(c, tickets, activities, engagements);
    if (score < 60) {
      notifications.push({
        id: `health-${c.name}`,
        severity: score < 40 ? 'high' : 'medium',
        title: `${c.name} health dropped to ${score}%`,
        subtitle: score < 40 ? 'At serious churn risk' : 'Below the healthy threshold',
        module: 'success',
        customerName: c.name,
        sortKey: score < 40 ? 95 : 70,
      });
    }
  }

  const today = startOfToday();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const due = new Date(t.dueDate).getTime();
    if (due > today + 86400000 - 1) continue; // due later than today
    const overdue = due < today;
    notifications.push({
      id: `task-${t.id}`,
      severity: overdue ? 'high' : 'medium',
      title: t.title,
      subtitle: overdue ? `Overdue since ${new Date(t.dueDate).toLocaleDateString()}` : 'Due today',
      module: TASK_MODULE[t.category || ''] || 'overview',
      customerName: t.relatedTo,
      sortKey: overdue ? 98 : 80,
    });
  }

  return notifications.sort((a, b) => b.sortKey - a.sortKey);
}
