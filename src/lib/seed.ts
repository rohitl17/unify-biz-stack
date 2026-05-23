import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

const COMPANIES = [
  'Acme Corp', 'Globex Industries', 'Stark Enterprises', 'Wayne Capital',
  'Umbrella Corp', 'Initech Solutions', 'Massive Dynamic', 'Hooli',
  'Pied Piper', 'Dunder Mifflin',
];

const CONTACTS = [
  'Sarah Chen', 'Marcus Webb', 'Priya Nair', 'James Okafor',
  'Elena Russo', 'David Kim', 'Fatima Al-Hassan', 'Tom Bradley',
  'Lucia Mendez', 'Arjun Patel',
];

async function clearCol(name: string) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, name, d.id))));
}

async function seedCol(name: string, docs: object[]) {
  await Promise.all(docs.map(d => addDoc(collection(db, name), d)));
}

export async function runSeed(uid: string): Promise<string> {
  const COLS = ['customers', 'leads', 'tickets', 'campaigns', 'activities', 'tasks', 'marketingEngagement'];
  for (const c of COLS) await clearCol(c);

  const customers = COMPANIES.map(name => ({
    name,
    healthScore: pick([45, 58, 62, 70, 75, 80, 85, 88, 92, 96]),
    plan: pick(['basic', 'pro', 'enterprise']),
    renewalDate: daysFromNow(pick([15, 32, 45, 60, 90, 120, 180, 210, 270, 340])),
    successManagerId: uid,
  }));

  const campaignDocs = [
    'Q2 Email Nurture Sequence', 'Spring Webinar: Scale Your CRM',
    'LinkedIn Thought Leadership Ads', 'Re-engagement: Churned Leads',
    'Product Launch Announcement', 'Customer Success Stories Series',
    'Google Ads — SMB Segment', 'Partner Co-marketing Campaign',
  ].map(name => ({
    name,
    type: pick(['email', 'social', 'webinar', 'ads'] as const),
    status: pick(['active', 'active', 'planned', 'completed'] as const),
    budget: pick([1000, 2500, 5000, 8000, 12000, 20000]),
    startDate: daysAgo(rand(5, 60)),
  }));

  // Seed campaigns first so we can capture their IDs for lead attribution
  const campaignRefs = await Promise.all(campaignDocs.map(d => addDoc(collection(db, 'campaigns'), d)));
  const campaignIds = campaignRefs.map(r => r.id);

  const stages = ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
  const statuses = ['new', 'contacted', 'qualified', 'lost'] as const;

  const leads = COMPANIES.map((company, i) => {
    const stage = pick([...stages]);
    const status = stage === 'closed_won' ? 'qualified' : stage === 'closed_lost' ? 'lost' : pick([...statuses]);
    // ~70% of leads are attributed to a campaign
    const attributed = Math.random() > 0.3;
    return {
      company,
      contactName: CONTACTS[i],
      email: `${CONTACTS[i].split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(/ /g, '')}.com`,
      status,
      stage,
      value: pick([5000, 8500, 12000, 18000, 25000, 40000, 60000, 85000]),
      leadScore: 0,
      ownerId: uid,
      createdAt: daysAgo(rand(1, 90)),
      ...(attributed ? { campaignId: pick(campaignIds) } : {}),
    };
  });

  const ticketSubjects = [
    'Integration not syncing after update', 'Billing discrepancy on last invoice',
    'Need to add 5 new seats ASAP', 'Dashboard loads slowly on mobile',
    'Password reset link expired', 'SSO configuration failing',
    'Export to CSV missing columns', 'API rate limits hit in production',
    'Feature request: bulk import', 'Onboarding walkthrough broken',
  ];
  const ticketDescriptions = [
    'Salesforce sync stopped working after latest update. Getting a 403 error.',
    'Invoice #2041 shows $2,400 but our contract says $2,000/mo.',
    'Onboarding a new team, need 5 seats activated by Friday.',
    'Dashboard takes 8-10s to load on iOS Safari. Desktop is fine.',
    'User tried to reset password but the link expired in under 5 minutes.',
    'SAML SSO with Okta returning assertion error. Tried twice.',
    'Exporting deals to CSV — contactName and value columns are missing.',
    'Hit API rate limit at 2AM during nightly sync. Need higher limits.',
    'Want to bulk import 500 leads from CSV. Currently adding one by one.',
    'Interactive onboarding tour crashes on step 3 for new users.',
  ];
  const tickets = COMPANIES.map((company, i) => ({
    subject: ticketSubjects[i],
    description: ticketDescriptions[i],
    priority: pick(['low', 'medium', 'high', 'urgent'] as const),
    status: pick(['open', 'open', 'in-progress', 'resolved'] as const),
    customerId: company,
    assignedTo: pick(['Support Team', 'Alex Rivera', 'Jordan Smith']),
    createdAt: daysAgo(rand(0, 14)),
  }));

  const activityContents = [
    'Had a productive intro call. Evaluating 3 vendors. Decision in 6 weeks.',
    'Sent over the proposal deck. Positive feedback on the pricing page.',
    'QBR completed. Health score strong. Identified 2 expansion opportunities.',
    'Escalated billing issue to finance. Following up EOD tomorrow.',
    'Left voicemail. Will try again Thursday.',
    'Renewal conversation initiated. They want to upgrade to Enterprise.',
    'Demo of the new reporting module — loved the custom dashboards.',
    'Support ticket resolved. Customer confirmed the issue is fixed.',
    'Negotiating final contract terms. 10% discount requested.',
    'Onboarding session #2 complete. All 8 users now active.',
    'Checked in post-launch. Adoption rate at 85%, above target.',
    'Received NPS survey back — score of 9/10.',
  ];
  const activities: object[] = [];
  COMPANIES.forEach(company => {
    const count = rand(2, 5);
    for (let j = 0; j < count; j++) {
      activities.push({
        type: pick(['note', 'call', 'meeting'] as const),
        subject: pick(['CALL', 'NOTE', 'MEETING']),
        content: pick(activityContents),
        customerId: company,
        createdBy: uid,
        createdAt: daysAgo(rand(0, 30)),
      });
    }
  });

  const taskTitles = [
    'Send renewal proposal', 'Follow up after demo', 'Schedule QBR',
    'Prepare onboarding checklist', 'Resolve billing dispute',
    'Share product roadmap', 'Check in after support ticket',
    'Negotiate contract terms', 'Review health score drop', 'Upsell expansion seats',
  ];
  const tasks = COMPANIES.map((company, i) => ({
    title: taskTitles[i % taskTitles.length],
    priority: pick(['low', 'medium', 'high'] as const),
    category: pick(['sales', 'support', 'success', 'marketing'] as const),
    relatedTo: company,
    assignedTo: uid,
    dueDate: daysFromNow(rand(1, 30)),
    createdAt: daysAgo(rand(0, 7)),
  }));

  const engagements: object[] = [];
  COMPANIES.forEach(company => {
    const count = rand(5, 20);
    for (let j = 0; j < count; j++) {
      engagements.push({
        customerName: company,
        type: pick(['email_open', 'link_click', 'web_visit'] as const),
        timestamp: daysAgo(rand(0, 60)),
      });
    }
  });

  await seedCol('customers', customers);
  await seedCol('leads', leads);
  await seedCol('tickets', tickets);
  // campaigns already seeded above (needed IDs for lead attribution)
  await seedCol('activities', activities);
  await seedCol('tasks', tasks);
  await seedCol('marketingEngagement', engagements);

  return `Seeded: ${customers.length} customers, ${leads.length} leads, ${tickets.length} tickets, ${campaignDocs.length} campaigns, ${activities.length} activities, ${tasks.length} tasks, ${engagements.length} engagements`;
}
