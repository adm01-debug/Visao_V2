-- Add latitude and longitude columns to cameras table
ALTER TABLE public.cameras 
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;