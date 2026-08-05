-- =============================================================================
-- RLS HARDENING: Drop permissive "Allow all" policies, fix anon access,
-- restrict audit_log inserts to service_role.
--
-- Fixes three vulnerability classes:
--
--   F-01 (CRITICAL IDOR): Ten tables carry "Allow all operations on X"
--        policies with USING(true) created as temporary scaffolding.
--        The 76d7a62e hardening migration created proper user-scoped
--        policies on cameras/alerts/stream_recordings/analysis_history/rules
--        but only tried to DROP its own newly-created names, leaving the
--        original "Allow all" policies intact.  Because PostgreSQL RLS uses
--        OR-logic across PERMISSIVE policies, USING(true) on any one policy
--        grants full access regardless of other restrictions.
--
--   F-02 (CRITICAL anon access): heatmap_data and heatmap_snapshots
--        "Anyone can view …" policies have no TO clause, which PostgreSQL
--        resolves to PUBLIC (including the anon role used by unauthenticated
--        callers).
--
--   F-06 (HIGH audit_log forge): "System can insert audit logs" grants
--        INSERT to the `authenticated` role with no server-side guard.
--        Any logged-in user can forge audit entries with arbitrary action
--        and entity_type values.
-- =============================================================================


-- ===========================================================================
-- F-01: DROP "Allow all operations on …" policies
-- ===========================================================================
-- Tables where 76d7a62e already created proper user-scoped policies —
-- dropping the "Allow all" is sufficient to seal the IDOR.

DROP POLICY IF EXISTS "Allow all operations on cameras"
  ON public.cameras;

DROP POLICY IF EXISTS "Allow all operations on alerts"
  ON public.alerts;

DROP POLICY IF EXISTS "Allow all operations on stream_recordings"
  ON public.stream_recordings;

DROP POLICY IF EXISTS "Allow all operations on analysis_history"
  ON public.analysis_history;

DROP POLICY IF EXISTS "Allow all operations on rules"
  ON public.rules;

-- -----------------------------------------------------------------------
-- Tables NOT covered by 76d7a62e: drop "Allow all" AND create replacements.
-- These tables lack a direct user_id column; ownership is resolved through
-- the camera that owns the row (cameras.user_id = auth.uid()).
-- -----------------------------------------------------------------------

-- stream_stats (camera_id → cameras.user_id)
DROP POLICY IF EXISTS "Allow all operations on stream_stats"
  ON public.stream_stats;

CREATE POLICY "stream_stats_select_own"
  ON public.stream_stats FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = stream_stats.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "stream_stats_insert_own"
  ON public.stream_stats FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = stream_stats.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "stream_stats_update_own"
  ON public.stream_stats FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = stream_stats.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "stream_stats_delete_own"
  ON public.stream_stats FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = stream_stats.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

-- camera_snapshots (camera_id → cameras.user_id)
DROP POLICY IF EXISTS "Allow all operations on camera_snapshots"
  ON public.camera_snapshots;

CREATE POLICY "camera_snapshots_select_own"
  ON public.camera_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = camera_snapshots.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "camera_snapshots_insert_own"
  ON public.camera_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = camera_snapshots.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "camera_snapshots_update_own"
  ON public.camera_snapshots FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = camera_snapshots.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "camera_snapshots_delete_own"
  ON public.camera_snapshots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = camera_snapshots.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

-- continuous_analysis_configs (created_by = auth.uid())
DROP POLICY IF EXISTS "Allow all operations on continuous_analysis_configs"
  ON public.continuous_analysis_configs;

CREATE POLICY "analysis_configs_select_own"
  ON public.continuous_analysis_configs FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "analysis_configs_insert_own"
  ON public.continuous_analysis_configs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "analysis_configs_update_own"
  ON public.continuous_analysis_configs FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "analysis_configs_delete_own"
  ON public.continuous_analysis_configs FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- analysis_sessions (camera_id → cameras.user_id)
DROP POLICY IF EXISTS "Allow all operations on analysis_sessions"
  ON public.analysis_sessions;

CREATE POLICY "analysis_sessions_select_own"
  ON public.analysis_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = analysis_sessions.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "analysis_sessions_insert_own"
  ON public.analysis_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = analysis_sessions.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "analysis_sessions_update_own"
  ON public.analysis_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = analysis_sessions.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "analysis_sessions_delete_own"
  ON public.analysis_sessions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = analysis_sessions.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

-- rule_violations (camera_id → cameras.user_id)
DROP POLICY IF EXISTS "Allow all operations on rule_violations"
  ON public.rule_violations;

CREATE POLICY "rule_violations_select_own"
  ON public.rule_violations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = rule_violations.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "rule_violations_insert_own"
  ON public.rule_violations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = rule_violations.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "rule_violations_update_own"
  ON public.rule_violations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = rule_violations.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "rule_violations_delete_own"
  ON public.rule_violations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = rule_violations.camera_id
        AND cameras.user_id = auth.uid()
    )
  );


-- ===========================================================================
-- F-02: Fix anon access on heatmap tables
-- ===========================================================================
-- "Anyone can view …" and "System can insert …" policies have no TO clause
-- → PostgreSQL applies them to PUBLIC (anon + authenticated).  Drop them and
-- replace with authenticated-only policies using the camera ownership chain.

-- heatmap_data (camera_id → cameras.user_id)
DROP POLICY IF EXISTS "Anyone can view heatmap_data"    ON public.heatmap_data;
DROP POLICY IF EXISTS "System can insert heatmap_data"  ON public.heatmap_data;

CREATE POLICY "heatmap_data_select_own"
  ON public.heatmap_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = heatmap_data.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

CREATE POLICY "heatmap_data_insert_own"
  ON public.heatmap_data FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cameras
      WHERE cameras.id = heatmap_data.camera_id
        AND cameras.user_id = auth.uid()
    )
  );

-- heatmap_snapshots: the 76d7a62e hardening migration already created
-- proper user_id-based policies.  Only the anon-accessible "Anyone can view"
-- policy from the original heatmap migration was never removed.
DROP POLICY IF EXISTS "Anyone can view heatmap_snapshots"   ON public.heatmap_snapshots;
DROP POLICY IF EXISTS "System can insert heatmap_snapshots" ON public.heatmap_snapshots;


-- ===========================================================================
-- F-06: Restrict audit_log inserts to service_role only
-- ===========================================================================
-- "System can insert audit logs" FOR INSERT TO authenticated lets any logged-in
-- user forge records with arbitrary action, entity_type, and user_id.
-- Service_role (used exclusively by edge functions and SECURITY DEFINER
-- triggers) is the only caller that should ever write audit entries.

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
