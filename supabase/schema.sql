-- Supabase schema for the time tracker app
-- Run this in Supabase SQL editor or via the Supabase CLI.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_email text references users(email) on delete cascade,
  clock_in_time timestamp with time zone not null,
  clock_out_time timestamp with time zone,
  total_hours float,
  created_at timestamp with time zone default timezone('utc', now())
);
