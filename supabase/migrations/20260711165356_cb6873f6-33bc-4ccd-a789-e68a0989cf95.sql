-- Bug fix: rules.updated_at existia mas não era atualizado por trigger
DROP TRIGGER IF EXISTS update_rules_updated_at ON public.rules;
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rules_updated_at();