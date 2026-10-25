# ScholarOS — Personal AI University Assistant

ScholarOS is an offline-first, personal academic management application designed to organize your university life across Windows PCs and mobile devices. Deployed on **Vercel** with **Neon/PostgreSQL** support or run 100% locally with zero external network dependencies.

---

## 🌟 Core Capabilities

* **Subject Workspaces:** Dedicated course hubs for Operating Systems, Database Systems, Artificial Intelligence, and any custom courses.
* **Universal Academic Input (Quick-Capture):** Paste messy announcements directly from WhatsApp, CRs, or portals. Heuristics extract subjects, assignment deadlines, quiz dates, and preparation topics.
* **Assignment & Deadline Management:** Tracks statuses (`Not Started`, `In Progress`, `Ready to Submit`, `Submitted`, `Completed`, `Overdue`), logs audit history for every deadline change, and recalculates reminders.
* **Assessment Manager:** Schedules quizzes, midterms, presentations, and final exams with identified syllabus topics.
* **Unified Academic Calendar:** Interactive monthly and agenda planner showing deadlines, quizzes, and project milestones.
* **Document Processing & Deep Analysis:** Indexes lecture slides (PDFs, PPTs) and generates beginner-friendly study guides, revision sheets, formula cards, and definitions.
* **Interactive AI Assessment Mode:** Practice quizzes that ask one question at a time, grade responses, provide step-by-step conceptual explanations, and track your scores.
* **Natural Language Assistant:** Connected directly to your academic database to answer questions like *"What assignments do I have this week?"* or execute actions like *"Create an assignment for DB Systems due Nov 5 at 11:59 PM"*.
* **Data Safety & Portability:** Single-click full JSON export and restoration with complete audit logs.
* **Vercel Serverless & Cron Ready:** Fully optimized for zero-cost operation on Vercel's free tier with automated reminder crons.

---

## 🛠️ Architecture & Tech Stack

| Layer | Component | Detail |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | React Server Components, Client Hydration, API Routes |
| **Language** | TypeScript (Strict) | End-to-end type safety across domain models |
| **Styling** | Tailwind CSS + Radix UI | Accessible component primitives, responsive mobile design, dark mode |
| **Icons** | Lucide React | High-clarity vector academic icons |
| **Database** | Prisma ORM + PostgreSQL | Supports Neon serverless PostgreSQL, SQLite, or local storage |
| **Deployment** | Vercel | Vercel Edge/Serverless functions, zero cold-start footprint |
| **Background Jobs**| Vercel Cron | Automated hourly deadline reminder checks |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* Node.js v18+ (tested on Node v24)
* npm v10+

### Setup Instructions
1. Clone the repository and enter the directory:
   ```bash
   cd scholar-os
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Configure environment variables (optional for local offline mode):
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Acceptance Testing

Run the test suite covering subject creation, WhatsApp announcement extraction, ambiguous relative date handling, deadline modification history, reminder engine, and backup/restore:

```bash
npx tsx scripts/test-workflows.ts
```

---

## 🌐 Deploying to Vercel (Zero Cost)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on setting up Neon PostgreSQL, configuring Vercel Cron, and installing the app as a Progressive Web App on Windows and mobile phones.
