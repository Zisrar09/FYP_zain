-- Migration: Add job criteria fields to jobs table for automated CV matching
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS minimum_education TEXT NOT NULL DEFAULT 'Bachelor''s';
