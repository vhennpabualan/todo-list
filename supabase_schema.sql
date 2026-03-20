-- TaskFlow Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create the required tables
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

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
  created_date DATE,
  completed_date DATE,
  labels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Create policies for tasks table
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- REMINDERS TABLE
-- ============================================================================

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reminder_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can view their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;

-- Create policies for reminders table
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(reminder_date_time);

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (for clean re-runs)
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
