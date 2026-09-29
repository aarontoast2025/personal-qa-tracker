# Personal QA Productivity Tracker

A Next.js (App Router), Supabase (PostgreSQL), and Google Sheets productivity tracking application.

## Features
- **Scoped QA Assignments**: View assignments specifically assigned to the logged-in QA evaluator.
- **Dynamic Date Navigation**:
  - **Day View**: `"Mon, Sep 28, 2026"`
  - **Week View**: `"WE 10.04.2026"` (Monday to Sunday, ending Sunday)
  - **Month View**: `"September 2026"`
- **Global Interaction ID Uniqueness**: Pre-checks all evaluations across all users to block duplicate evaluations.
- **Quota-Safe Google Sheet Sync**: Supabase acts as a local cache to preserve Google Sheets API quotas.
- **Icon-Only Fetch Button**: Fast on-demand sync with spinning indicator and rate-limit safeguards.
- **Settings Management**: Configure Google Sheet ID, tab mappings, and credentials.
- **Extensible Architecture**: Ready for browser Bookmarklet integration and Google Gemini AI assistance.

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS, Lucide React
- **Database & Auth**: Supabase
- **Hosting**: Vercel
- **APIs**: Google Sheets API v4, Google Generative AI
