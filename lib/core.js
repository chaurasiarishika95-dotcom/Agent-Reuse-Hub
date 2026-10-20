// ===== Company data (fictional demo) =====
export const company = {
  name: "SwiftRoute Logistics",
  tagline: "Fictional demo company · AI agents across 6 sites in India · find where one solution can help another team"
};

export const agents = [
  {
    id: "invoice-matcher", name: "Invoice Matcher", team: "Finance", location: "Mumbai",
    owner: "Priya S.", status: "Live",
    description: "Matches vendor invoices against purchase orders and goods receipts, and flags mismatches for review.",
    tags: ["invoices", "purchase-orders", "reconciliation", "document-extraction", "vendor-payments"],
    impact: "Cut manual reconciliation time by 70%", hoursSavedPerMonth: 120
  },
  {
    id: "route-planner", name: "Delivery Route Planner", team: "Last-mile Ops", location: "Bengaluru",
    owner: "Arjun K.", status: "Live",
    description: "Plans daily delivery routes for riders using order locations, time windows and live traffic.",
    tags: ["routing", "delivery-scheduling", "fleet", "traffic-data", "last-mile"],
    impact: "Average route length down 12%", hoursSavedPerMonth: 300
  },
  {
    id: "tracking-assistant", name: "Customer Tracking Assistant", team: "Customer Support", location: "Gurugram",
    owner: "Neha R.", status: "Live",
    description: "Answers 'where is my parcel' questions on chat and WhatsApp using live shipment data.",
    tags: ["customer-queries", "shipment-tracking", "chat-support", "whatsapp", "faq"],
    impact: "Resolves 65% of tracking chats without a human", hoursSavedPerMonth: 450
  },
  {
    id: "demand-forecaster", name: "Demand Forecaster", team: "Planning", location: "Gurugram",
    owner: "Rahul M.", status: "Live",
    description: "Forecasts shipment volumes by lane and week so hubs can plan inventory and capacity.",
    tags: ["forecasting", "demand-planning", "inventory", "time-series"],
    impact: "Forecast error down from 22% to 9% on top lanes", hoursSavedPerMonth: 80
  },
  {
    id: "hiring-screener", name: "Hiring Screener", team: "HR", location: "Gurugram",
    owner: "Sana A.", status: "Live",
    description: "Screens high volumes of job applications, shortlists candidates and schedules interviews.",
    tags: ["recruitment", "resume-screening", "interview-scheduling", "high-volume-hiring", "candidate-communication"],
    impact: "Time to shortlist cut from 5 days to 1", hoursSavedPerMonth: 200
  },
  {
    id: "damage-inspector", name: "Parcel Damage Inspector", team: "Warehouse Ops", location: "Jaipur",
    owner: "Vikram T.", status: "Pilot",
    description: "Checks parcel photos for damage at handover and builds photo evidence for claims.",
    tags: ["image-inspection", "quality-checks", "claims", "photo-evidence", "warehouse"],
    impact: "Damage claims decided in hours instead of 4 days", hoursSavedPerMonth: 150
  },
  {
    id: "shift-planner", name: "Shift Roster Planner", team: "Warehouse Ops", location: "Kolkata",
    owner: "Ananya D.", status: "Live",
    description: "Builds weekly warehouse shift rosters from expected volumes, attendance and staff availability.",
    tags: ["shift-scheduling", "staffing", "attendance", "warehouse", "forecasting"],
    impact: "Overtime cost down 18%", hoursSavedPerMonth: 60
  },
  {
    id: "contract-reviewer", name: "Vendor Contract Reviewer", team: "Legal", location: "Mumbai",
    owner: "Karan J.", status: "Pilot",
    description: "Does a first-pass review of vendor contracts and highlights risky or missing clauses.",
    tags: ["contracts", "document-extraction", "compliance", "risk-flags", "vendor-management"],
    impact: "First-pass review of 40 contracts a month", hoursSavedPerMonth: 70
  }
];

export const processes = [
  { id: "freight-bills", name: "Freight bill verification", team: "Procurement", location: "Gurugram",
    current: "Checked by hand in spreadsheets, 3-day backlog",
    needs: ["invoices", "reconciliation", "vendor-payments", "document-extraction"] },
  { id: "b2b-pickups", name: "B2B pickup scheduling", team: "Operations", location: "Pune",
    current: "Planned by phone and WhatsApp each morning",
    needs: ["routing", "delivery-scheduling", "fleet", "customer-queries"] },
  { id: "driver-onboarding", name: "Driver onboarding", team: "HR", location: "Kolkata",
    current: "Paper forms and manual calls to candidates",
    needs: ["recruitment", "high-volume-hiring", "candidate-communication", "document-extraction"] },
  { id: "returns-claims", name: "Returns and claims handling", team: "Customer Support", location: "Mumbai",
    current: "Agents review customer photos one by one",
    needs: ["claims", "photo-evidence", "customer-queries", "image-inspection"] },
  { id: "peak-staffing", name: "Peak-season staffing", team: "Warehouse Ops", location: "Pune",
    current: "Supervisors guess headcount before festive sales",
    needs: ["staffing", "shift-scheduling", "forecasting", "attendance"] },
  { id: "seller-support", name: "Seller support on WhatsApp", team: "Seller Success", location: "Bengaluru",
    current: "Small team answers repeat questions manually",
    needs: ["customer-queries", "whatsapp", "faq", "chat-support"] },
  { id: "lease-renewals", name: "Warehouse lease renewals", team: "Admin", location: "Jaipur",
    current: "Leases reviewed by outside lawyers, slow and costly",
    needs: ["contracts", "compliance", "risk-flags", "document-extraction"] },
  { id: "replenishment", name: "Packaging stock replenishment", team: "Fulfillment", location: "Kolkata",
    current: "Reordered when stock runs out",
    needs: ["inventory", "demand-planning", "forecasting"] },
  { id: "inbound-qc", name: "Inbound quality checks", team: "Warehouse Ops", location: "Bengaluru",
    current: "Visual checks with no records kept",
    needs: ["quality-checks", "image-inspection", "warehouse"] }
];

// ===== Matching logic =====
const lc = s => String(s || "").trim().toLowerCase();

export function listAgents({ team, location } = {}) {
  return agents
    .filter(a => (!team || lc(a.team) === lc(team)) && (!location || lc(a.location) === lc(location)))
    .map(a => ({ id: a.id, name: a.name, team: a.team, location: a.location, owner: a.owner,
                 status: a.status, description: a.description, impact: a.impact }));
}

export function findOpportunities({ location, team, agentId, limit = 20, minScore = 0.3 } = {}) {
  const out = [];
  for (const a of agents) {
    if (agentId && a.id !== agentId) continue;
    for (const p of processes) {
      if (location && lc(p.location) !== lc(location)) continue;
      if (team && lc(p.team) !== lc(team)) continue;
      if (lc(p.location) === lc(a.location) && lc(p.team) === lc(a.team)) continue;
      const shared = p.needs.filter(n => a.tags.includes(n));
      const score = shared.length / p.needs.length;
      if (!shared.length || score < minScore) continue;
      const pct = Math.round(score * 100);
      out.push({
        agentId: a.id, agentName: a.name, agentTeam: a.team, agentLocation: a.location, owner: a.owner,
        processId: p.id, processName: p.name, processTeam: p.team, processLocation: p.location,
        currentState: p.current, score: pct, sharedSkills: shared,
        missingSkills: p.needs.filter(n => !a.tags.includes(n)),
        reason: `${a.name} (${a.team}, ${a.location}) already covers ${shared.join(", ")}: ${pct}% of what "${p.name}" in ${p.location} needs.`
      });
    }
  }
  const max = Math.max(1, Math.min(Number(limit) || 20, 100));
  return out.sort((x, y) => y.score - x.score).slice(0, max);
}

export function getAgent(id) {
  const a = agents.find(x => x.id === id);
  if (!a) return null;
  return { ...a, reuseOpportunities: findOpportunities({ agentId: id, limit: 50 }) };
}

const STOP = new Set("the and for with our that this from into need needs want help have has are was were can could would will how what which who you your they them there then than just also about".split(" "));
const tokens = s => lc(s).replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter(w => w.length > 2 && !STOP.has(w));
const similar = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));

export function findAgentsForNeed(need, location) {
  const q = [...new Set(tokens(need))];
  if (!q.length) return { need, matches: [], note: "Describe the problem in a few words, e.g. 'checking freight invoices against orders'." };
  const matches = agents.map(a => {
    const t = tokens([a.name, a.description, a.team, a.tags.join(" ")].join(" "));
    const hit = q.filter(w => t.some(x => similar(w, x)));
    return { id: a.id, name: a.name, builtFor: `${a.team} · ${a.location}`, owner: a.owner,
             description: a.description, impact: a.impact, matchedTerms: hit,
             score: Math.round(100 * hit.length / q.length) };
  }).filter(m => m.matchedTerms.length).sort((x, y) => y.score - x.score).slice(0, 5);
  return {
    need, forLocation: location || null, matches,
    note: matches.length
      ? "These agents were built elsewhere and already cover parts of this need. Talk to the owner before reusing."
      : "No existing agent matches yet. This may need a new build."
  };
}
