# ScholarOS — Zero-Cost Vercel Deployment Guide

This guide explains how to deploy ScholarOS to **Vercel** with a public HTTPS URL accessible from your Windows PC and mobile devices at **zero financial cost** for personal academic use.

---

## 1. Zero-Cost Free-Tier Stack Overview

| Component | Free-Tier Service | Allowance | Cost |
|---|---|---|---|
| **Hosting & Compute** | Vercel Hobby Plan | 100GB Bandwidth, unlimited serverless invocations | **$0 / month** |
| **Persistent Database** | Neon PostgreSQL (Free Tier) | 0.5 GB storage, serverless autoscaling, pooling | **$0 / month** |
| **File Storage** | Vercel Blob / Local Storage | 1 GB storage, 5 GB egress / month | **$0 / month** |
| **Scheduled Reminders** | Vercel Cron | 1 cron job / project (Hourly or Daily execution) | **$0 / month** |
| **AI Inference** | Local (Ollama) or OpenAI Free Credits | User-configurable endpoint or offline heuristics | **$0 / month** |

---

## 2. Prerequisites

1. A [GitHub](https://github.com) account.
2. A [Vercel](https://vercel.com) account (sign in with your GitHub account).
3. A free [Neon](https://neon.tech) account for persistent cloud PostgreSQL (optional if using local offline mode).

---

## 3. Step-by-Step Vercel Deployment

### Step 1: Push Code to GitHub
1. Open PowerShell in `d:\uni assitant\scholar-os`:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit of ScholarOS academic assistant"
   ```
2. Create a new repository on GitHub (e.g. `scholar-os`).
3. Push your repository:
   ```powershell
   git remote add origin https://github.com/<your-username>/scholar-os.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Set Up Free Cloud PostgreSQL on Neon
1. Go to [neon.tech](https://neon.tech) and create a free project named `scholar-os`.
2. Copy the pooled connection string, which looks like:
   ```
   postgresql://scholar_owner:xxxx@ep-xyz-pooler.us-east-2.aws.neon.tech/scholar_os?sslmode=require
   ```

### Step 3: Deploy to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** &rarr; **"Project"**.
3. Import your `scholar-os` repository from GitHub.
4. Framework Preset: **Next.js** (automatically detected).
5. Open the **Environment Variables** section and add:
   * `DATABASE_URL`: Your Neon PostgreSQL connection string.
   * `NEXTAUTH_SECRET`: A random 32-character string (e.g. `openssl rand -base64 32`).
   * `NEXTAUTH_URL`: Your Vercel deployment URL (e.g. `https://scholar-os.vercel.app`).
   * `CRON_SECRET`: A random secret key for securing the background reminder endpoint.
   * `AI_PROVIDER`: `local` or `openai`.
   * `OPENAI_API_KEY`: (Optional) If using OpenAI cloud models.
6. Click **"Deploy"**.

Vercel will compile the Next.js production build and publish your application with an active SSL certificate.

---

## 4. Running Migrations in Production

Run Prisma migration to initialize your tables in Neon:
```bash
npx prisma db push
```
All 25+ academic tables (`subjects`, `assignments`, `reminders`, `academic_events`, `study_notes`, etc.) will be created with their indexes and foreign key constraints.

---

## 5. Automated Background Reminders (Vercel Cron)

ScholarOS includes `vercel.json` with an hourly cron job configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```
* Every hour, Vercel triggers `/api/cron/reminders`.
* The serverless handler checks for approaching deadlines in the database.
* Reminders are dispatched idempotently so you never receive duplicate notifications.

---

## 6. Installing on Mobile & Windows as a PWA

ScholarOS is built with mobile-first responsive viewports:
* **On Android (Chrome):** Open your Vercel URL, tap the 3 dots menu &rarr; tap **"Install App"** or **"Add to Home Screen"**.
* **On iOS (Safari):** Open your Vercel URL, tap the Share button &rarr; tap **"Add to Home Screen"**.
* **On Windows PC (Chrome / Edge):** Click the install icon in the URL bar to run ScholarOS as a dedicated desktop window.
