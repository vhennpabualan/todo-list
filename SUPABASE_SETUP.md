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

## Step 3: Create Database Table

In Supabase, go to **SQL Editor** and run this query:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

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

## Testing Locally

1. Update `.env` with your Supabase credentials
2. Run `npm run dev`
3. You'll see the auth modal on first load
4. Create an account or sign in
5. Your tasks will be stored locally (ready to sync to Supabase in next phase)
