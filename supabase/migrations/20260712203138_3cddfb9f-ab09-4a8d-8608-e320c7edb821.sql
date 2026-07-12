CREATE OR REPLACE FUNCTION public.replace_user_role(_target_user_id uuid, _new_role app_role, _admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id ausente' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF _admin_id = _target_user_id THEN
    RAISE EXCEPTION 'Não é possível alterar sua própria role' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_role(uuid, app_role, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_role(uuid, app_role, uuid) TO service_role;

-- Remover a assinatura antiga (não usada) para manter a API limpa
DROP FUNCTION IF EXISTS public.replace_user_role(uuid, app_role);