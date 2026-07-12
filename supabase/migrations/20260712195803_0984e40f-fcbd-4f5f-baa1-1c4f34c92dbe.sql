
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  stmt TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid()%' AND qual NOT LIKE '%( SELECT auth.uid()%')
        OR
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid()%' AND with_check NOT LIKE '%( SELECT auth.uid()%')
      )
  LOOP
    new_qual := regexp_replace(r.qual, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
    new_check := regexp_replace(r.with_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');

    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;
