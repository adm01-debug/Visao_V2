-- Create enum for rule categories
CREATE TYPE public.rule_category AS ENUM ('security', 'safety', 'operations', 'access', 'analytics');

-- Create enum for rule severity
CREATE TYPE public.rule_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for rule actions
CREATE TYPE public.rule_action AS ENUM ('alert', 'notify', 'record', 'lockdown', 'dispatch');

-- Create enum for condition types
CREATE TYPE public.condition_type AS ENUM (
  'people_count', 'no_ppe', 'restricted_area', 'face_recognition',
  'vehicle_detection', 'loitering', 'crowd_density', 'motion_detection',
  'object_left', 'perimeter_breach'
);

-- Create enum for condition operators
CREATE TYPE public.condition_operator AS ENUM ('greater_than', 'less_than', 'equals', 'not_equals', 'contains', 'between');

-- Create rules table
CREATE TABLE public.rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category rule_category NOT NULL DEFAULT 'security',
  severity rule_severity NOT NULL DEFAULT 'medium',
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions rule_action[] NOT NULL DEFAULT '{}',
  cameras TEXT[] NOT NULL DEFAULT '{}',
  schedule JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now since no auth)
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be restricted later with auth)
CREATE POLICY "Allow all operations on rules"
ON public.rules
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rules_updated_at
BEFORE UPDATE ON public.rules
FOR EACH ROW
EXECUTE FUNCTION public.update_rules_updated_at();