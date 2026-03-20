# Supabase Account Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase](https://supabase.com) and sign in to your project
2. Navigate to **Settings** → **API**
3. Copy your:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)

## Step 2: Update .env File

Replace the placeholders in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_anon_public_key_here
```

## Step 3: Create Database Tables

In Supabase, go to **SQL Editor** and run this query:

```sql
-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  project TEXT DEFAULT 'personal',
  due_date DATE,
  created_date DATE NOT NULL,
  completed_date DATE,
  labels TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reminder_date_time TIMESTAMP NOT NULL,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks table
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for reminders table
CREATE POLICY "Users can view their own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(reminder_date_time);
```

**Note:** You can also run the complete schema from the `supabase_schema.sql` file in your project root.

## Step 4: Enable Email/Password Auth

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Email Templates** and customize if needed

## Step 5: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
4. Deploy

## Features Included

✅ Sign up with email and password
✅ Sign in to existing account
✅ User profile storage in Supabase
✅ Persistent authentication
✅ Logout functionality
✅ Error handling and validation
✅ Tasks stored in Supabase with full CRUD operations
✅ Reminders stored in Supabase
✅ Automatic sync between local and cloud storage
✅ Row Level Security (RLS) for data protection

## Testing Locally

1. Update `.env` with your Supabase credentials
2. Run the SQL schema in Supabase SQL Editor (from Step 3)
3. Run `npm run dev`
4. You'll see the auth modal on first load
5. Create an account or sign in
6. Your tasks and reminders will be stored in Supabase and synced automatically

## Troubleshooting

### Tasks not saving or deleting
- Make sure you've run the SQL schema in Supabase (Step 3)
- Check that your Supabase URL and Key are correct in `.env`
- Open browser console (F12) to see any error messages
- Verify that Row Level Security policies are created

### "Failed to sync tasks to cloud" error
- Check your internet connection
- Verify your Supabase credentials
- Make sure the `tasks` and `reminders` tables exist in your database

### Tasks appear after refresh even though deleted
- This was a bug that has been fixed
- Make sure you're using the latest version of the code
- Clear your browser cache and localStorage
- Re-run the SQL schema to ensure proper table structure
