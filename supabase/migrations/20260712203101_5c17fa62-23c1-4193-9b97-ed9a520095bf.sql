CREATE OR REPLACE FUNCTION public.replace_user_role(_target_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(caller_id, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF caller_id = _target_user_id THEN
    RAISE EXCEPTION 'Não é possível alterar sua própria role' USING ERRCODE = '22023';
  END IF;

  -- Substituição atômica dentro da mesma transação
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
END;
$$;

-- Restringir execução apenas a usuários autenticados (a função valida admin internamente)
REVOKE ALL ON FUNCTION public.replace_user_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_user_role(uuid, app_role) TO authenticated, service_role;