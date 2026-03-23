-- Add password column to study_rooms table

ALTER TABLE public.study_rooms 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Create index for password lookup
CREATE INDEX IF NOT EXISTS idx_study_rooms_has_password 
ON public.study_rooms(id) 
WHERE password IS NOT NULL;
