# Hey It's Mom 🎓

A student-parent daily check-in web app designed specifically for boarding school families. Students track their hourly mood and activities, log meals from the school cafeteria, and stay connected with parents through daily messages.

**Project 2 for CMU 15-113: Effective Coding with AI (Spring 2026)**

## Overview

This is a full-stack web application built with **Next.js, React, TypeScript, and Supabase**. It demonstrates professional-grade engineering practices including:
- Secure frontend-backend communication via Next.js API routes
- Row Level Security (RLS) for data isolation
- Third-party API integration with caching
- Real-time database synchronization
- Thoughtful error handling and user experience

## Key Features

### 📅 Student Dashboard
- **Monthly Calendar View**: Visual mood tracking with emoji indicators
- **Invite Code**: 6-digit code to share with parents for linking
- **Quick Access**: One-click navigation to any day's entry

### 📝 Daily Entry Interface
- **16-Hour Tracking**: Log activities, mood, and notes from 8 AM to 11 PM
- **Emoji Mood Picker**: Intuitive selection (excellent/good/okay/bad/terrible)
- **Live Cafeteria Menu**: Real-time menu data from Epicure Menus API
- **Food Logging**: Select from menu, add custom snacks/outside food
- **Daily Reflection**: Overall comment about the day

### 👨‍👩‍👧 Parent Portal
- **Student Dashboard**: Read-only view of linked student's mood calendar
- **Daily Messaging**: One message per day (cannot edit after sending)
- **Student Replies**: See student responses to your messages

### 🔐 Security First
- **Supabase Row Level Security**: All data isolated by user role
- Students see only their data
- Parents see only linked students' data
- Database-level authorization (not just frontend checks)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Supabase) with RLS policies |
| **Authentication** | Supabase Auth (email/password) |
| **Menu Data** | Cheerio (HTML parsing) + Caching |
| **Deployment** | Vercel (with Cron jobs) |
| **Version Control** | Git + GitHub |

## Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/hey-its-mom.git
cd hey-its-mom
```

### 2. Set Up Supabase

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. Copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. In the SQL Editor, run the SQL from `supabase/schema.sql` to create all tables and RLS policies
4. Create a service role key (Settings → API → Service role key)

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MENU_REFRESH_SECRET=dev-secret-token-any-string
CRON_SECRET=dev-cron-secret-any-string
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### 6. Demo Seed Accounts (Local Testing Only)

Create two test accounts in Supabase Auth:

**Student Account**:
- Email: `student@example.com`
- Password: `demo123456`
- Then manually insert into `profiles` table:
  ```sql
  INSERT INTO profiles (id, role, display_name) 
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'student@example.com'),
    'student',
    'Alex Student'
  );
  ```

**Parent Account**:
- Email: `parent@example.com`
- Password: `demo123456`
- Then manually insert into `profiles` table and link:
  ```sql
  INSERT INTO profiles (id, role, display_name) 
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'parent@example.com'),
    'parent',
    'Mom/Dad Parent'
  );

  INSERT INTO parent_student_links (parent_id, student_id)
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'parent@example.com'),
    (SELECT id FROM auth.users WHERE email = 'student@example.com')
  );
  ```

## Deployment to Vercel

### 1. Push to GitHub
```bash
git remote add origin https://github.com/yourusername/hey-its-mom.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and connect your GitHub repository
2. Set environment variables in Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MENU_REFRESH_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `CRON_SECRET`
3. Deploy

### 3. Enable Vercel Cron Jobs
The `vercel.json` file is already configured to refresh menus daily at 5 AM New York time. Cron jobs are enabled automatically on Vercel deployments for Pro plans.

For staging/testing, manually trigger the refresh:
```bash
curl -X POST https://your-app.vercel.app/api/menu \
  -H "authorization: Bearer YOUR_MENU_REFRESH_SECRET"
```

## How Menu Scraping Works

### Data Source
- URL: https://epicuremenus.com/clients/exeter/online?date=YYYY-MM-DD
- Updated daily by Exeter Academy dining services

### Parser Design (Resilient to Changes)

The `menuScraper.ts` parser is designed to handle variable menu structures:

1. **Detects meal period headings** dynamically (Breakfast, Lunch, Dinner, Brunch, Supper, etc.)
2. **Detects section headings** (Proteins, Vegetables, Starches/Grains, Desserts, etc.)
3. **Extracts menu items** and cleans up allergen icons and structural text
4. **Returns structured JSON**:

```json
{
  "date": "2026-02-28",
  "location": "Elm",
  "mealPeriods": [
    {
      "name": "Breakfast",
      "sections": [
        {
          "sectionName": "Proteins",
          "items": ["Scrambled Eggs", "Chicken Sausage"]
        },
        {
          "sectionName": "Starches/Grains",
          "items": ["Pancakes", "Toast"]
        }
      ]
    },
    ...
  ]
}
```

### Caching Strategy

- **Stored in**: `cafeteria_menu_cache` table (date + location unique)
- **TTL**: 24 hours
- **Refresh**: Daily at 5 AM ET via Vercel Cron; also refreshes next 6 days
- **On-demand**: If cache is stale/missing, next client request triggers a refresh (fallback)

### Why This Approach?
- Avoids repeated scraping (respects Epicure's server)
- Handles network failures gracefully
- Allows offline viewing of cached menus
- Resilient to page structure changes (parser adapts to various heading formats)

## Database Schema

See `supabase/schema.sql` for complete schema. Key tables:

- `profiles`: Users with role (student/parent)
- `parent_student_links`: Link parents to students they oversee
- `daily_records`: One per student per day (overall mood, daily comment)
- `hourly_entries`: 8-23 hours per day (activity, mood, comment)
- `food_records`: What student ate (menu items, snacks, outside food)
- `parent_messages`: One message per day from parent; student can reply
- `cafeteria_menu_cache`: Cached parsed menus (date + location)

## Row Level Security (RLS) Policies

All tables have RLS enabled. Key policies:

- **Students** can only see/edit their own data
- **Parents** can only see/read linked student's data
- **Parents** cannot edit student data
- **Parent messages** are immutable after creation
- **Students** can only edit their reply to parent messages
- **Public read** on menu cache (no auth required)

## Environment Variables

```
# Public (safe to commit to GitHub)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Secret (NEVER commit; use Vercel/deployment secrets)
SUPABASE_SERVICE_ROLE_KEY
MENU_REFRESH_SECRET
CRON_SECRET
```

## Privacy & Security Notes

- **No geolocation**: We never know where students are
- **No movement tracking**: No GPS, cell tower triangulation, or WiFi sniffing
- **No health data**: We don't track sleep, steps, heart rate, or any health metrics
- **Role-based access**: Parents see only their linked student; students see only themselves
- **Audit trail**: All data has `created_at` and `updated_at` timestamps
- **RLS enforcement**: Database enforces access control at the data layer, not just the application layer

## Project Structure

```
hey-its-mom/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── auth/
│   │   │   ├── student-login/
│   │   │   └── parent-login/
│   │   ├── student/dashboard/       # Student calendar
│   │   ├── parent/dashboard/        # Parent calendar
│   │   ├── daily/[date]/            # Daily detail page
│   │   └── api/
│   │       ├── menu/route.ts        # Menu fetch & cache
│   │       └── cron/refresh-menu/   # Vercel Cron trigger
│   ├── components/                  # Reusable UI components
│   ├── lib/
│   │   ├── supabase.ts              # Client initialization
│   │   └── menuScraper.ts           # Menu parsing logic
│   └── styles/                      # Global styles
├── supabase/
│   └── schema.sql                   # Database setup
├── vercel.json                      # Cron job configuration
├── .env.example                     # Environment template
├── .env.local                       # Local dev secrets (gitignored)
└── README.md                        # This file
```

## Testing Checklist

### Auth Flow
- [ ] Student can sign up
- [ ] Student can log in
- [ ] Parent can sign up
- [ ] Parent can log in
- [ ] Student sees only their data
- [ ] Parent sees only linked student's data

### Student Dashboard
- [ ] Calendar loads with month view
- [ ] Days with mood show emoji indicator
- [ ] Can click date to view daily detail
- [ ] Can navigate months

### Daily Detail Page (Student)
- [ ] Cafeteria menu loads for the date
- [ ] Can toggle menu items as "eaten"
- [ ] Can add custom snack
- [ ] Can enter activity for each hour (8-23)
- [ ] Can select mood for each hour
- [ ] Can set overall daily mood
- [ ] Can write daily comment
- [ ] Auto-save works (check Supabase)
- [ ] Can see parent's message (if exists)
- [ ] Can reply to parent message
- [ ] Can edit own reply

### Parent Dashboard
- [ ] Calendar loads with linked student's data
- [ ] Can see calendar read-only
- [ ] Can click date to view student's day
- [ ] Can see all student entries (hourly, food, mood)
- [ ] Can write one message per day
- [ ] Cannot write second message (should be disabled/error)
- [ ] Can see student's reply
- [ ] Cannot edit message after sending

### Menu Caching
- [ ] Menu fetches and displays
- [ ] Menu updates daily (check cache timestamp)
- [ ] Handles missing menu gracefully
- [ ] Cache persists across page reloads
- [ ] Vercel Cron job runs (check logs)

### Mobile Responsive
- [ ] Calendar stacks on mobile
- [ ] Daily detail page stacks on mobile
- [ ] Inputs are touch-friendly
- [ ] No horizontal scroll

## License

MIT

## Contributing

This is a course project. Contact the author for contribution guidelines.
