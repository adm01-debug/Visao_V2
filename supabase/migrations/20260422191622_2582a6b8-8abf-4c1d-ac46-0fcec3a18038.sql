-- Tabela para persistir filtros do usuário entre navegadores
CREATE TABLE IF NOT EXISTS public.user_filter_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_user_filter_preferences_user_scope
  ON public.user_filter_preferences(user_id, scope);

ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own filter preferences"
  ON public.user_filter_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filter preferences"
  ON public.user_filter_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter preferences"
  ON public.user_filter_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter preferences"
  ON public.user_filter_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_filter_preferences_updated_at
  BEFORE UPDATE ON public.user_filter_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();