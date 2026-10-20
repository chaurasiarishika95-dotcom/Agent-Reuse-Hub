import { agents } from "./core.js";

export const useCases = [
  { id: "support-assistant", name: "AI support assistant", category: "Customer experience",
    problem: "Users ask the same questions again and again; support is slow or costly.",
    fitsWhen: "App has customers, orders, bookings, accounts, an FAQ, or a contact/support page." },
  { id: "smart-search", name: "Natural-language search", category: "Discovery",
    problem: "Users can't find what they want with exact keyword search.",
    fitsWhen: "App has a catalog, listings, documents, or a search box." },
  { id: "recommendations", name: "Personalized recommendations", category: "Engagement",
    problem: "Every user sees the same content, so engagement and repeat use stay low.",
    fitsWhen: "App has products, content, courses, or items users choose between, plus user history." },
  { id: "doc-extraction", name: "Document and form extraction", category: "Operations",
    problem: "People type data from documents by hand, which is slow and error-prone.",
    fitsWhen: "Users upload or handle invoices, IDs, receipts, resumes, forms, or PDFs." },
  { id: "onboarding-copilot", name: "Guided onboarding copilot", category: "Activation",
    problem: "New users drop off before they reach the app's main value.",
    fitsWhen: "App has signup, multi-step setup, or a complex dashboard." },
  { id: "forecasting", name: "Demand and usage forecasting", category: "Planning",
    problem: "Teams guess future volumes, causing stockouts, waste, or understaffing.",
    fitsWhen: "App records orders, inventory, bookings, sales, or other time-based data." },
  { id: "anomaly-fraud", name: "Anomaly and fraud detection", category: "Trust and safety",
    problem: "Suspicious payments, fake accounts, or unusual activity go unnoticed.",
    fitsWhen: "App handles payments, transactions, logins, reviews, or user-generated content." },
  { id: "content-drafting", name: "AI content drafting", category: "Productivity",
    problem: "Users struggle to write listings, posts, descriptions, or messages.",
    fitsWhen: "Users create text: product listings, profiles, posts, emails, or reports." },
  { id: "feedback-insights", name: "Feedback and review insights", category: "Product insight",
    problem: "Reviews, tickets, and feedback pile up unread, so patterns are missed.",
    fitsWhen: "App collects reviews, ratings, feedback forms, comments, or support tickets." },
  { id: "workflow-automation", name: "Workflow automation agent", category: "Operations",
    problem: "Staff repeat the same multi-step admin tasks every day.",
    fitsWhen: "App involves approvals, data entry between tools, status updates, or follow-ups." },
  { id: "ask-your-data", name: "Ask-your-data analytics", category: "Insight",
    problem: "Non-technical users can't get answers from dashboards and reports.",
    fitsWhen: "App has an admin panel, dashboard, reports, or stored business data." },
  { id: "image-understanding", name: "Image understanding", category: "Automation",
    problem: "Someone has to look at every photo to check quality, damage, or content.",
    fitsWhen: "Users upload photos of products, documents, damage, food, or places." },
  { id: "voice-multilingual", name: "Voice and multilingual access", category: "Accessibility",
    problem: "Users who prefer local languages or voice find the app hard to use.",
    fitsWhen: "Audience is in India or is multilingual, mobile-first, or less comfortable typing English." },
  { id: "lead-followup", name: "Lead qualification and follow-up", category: "Growth",
    problem: "Enquiries arrive but follow-up is slow or inconsistent, so leads go cold.",
    fitsWhen: "App has contact forms, demo requests, enquiries, or a sales pipeline." },
  { id: "smart-scheduling", name: "Smart scheduling and routing", category: "Operations",
    problem: "Appointments, deliveries, or staff are scheduled manually and inefficiently.",
    fitsWhen: "App manages appointments, deliveries, field staff, slots, or shifts." },
  { id: "learning-coach", name: "Personal learning coach", category: "Education",
    problem: "Learners get the same content regardless of their level and get stuck.",
    fitsWhen: "App offers courses, lessons, quizzes, practice, or skill building." }
];

export function getLibrary() {
  return [
    ...useCases.map(u => ({ ...u, source: "library" })),
    ...agents.map(a => ({
      id: "agent:" + a.id, name: a.name, source: "registry", owner: a.owner,
      category: `Existing agent (${a.team}, ${a.location})`,
      problem: a.description, fitsWhen: "Covers: " + a.tags.join(", ")
    }))
  ];
}
