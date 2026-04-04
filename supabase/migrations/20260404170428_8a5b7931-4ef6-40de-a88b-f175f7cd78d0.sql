-- Strengthen the user_roles INSERT policy to prevent privilege escalation
-- Drop the existing policy and recreate with stricter check
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add unique constraint if not exists to prevent duplicate role assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;