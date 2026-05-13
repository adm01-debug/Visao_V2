-- Função para exclusão de conta (LGPD)
-- Executa em cascata deletando dados de todas as tabelas vinculadas ao user_id
CREATE OR REPLACE FUNCTION public.delete_user_data(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id uuid;
BEGIN
    caller_id := auth.uid();
    
    -- Só permite deletar a si mesmo, a menos que seja admin
    IF caller_id <> _target_user_id AND NOT public.has_role(caller_id, 'admin') THEN
        RAISE EXCEPTION 'Acesso negado. Você só pode excluir sua própria conta.';
    END IF;

    -- Logs de auditoria antes da exclusão (persistente mesmo após delete se a tabela audit_logs não tiver cascade ou se inserirmos agora)
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (caller_id, 'user.delete_request', 'user', _target_user_id, jsonb_build_object('reason', 'LGPD request'));

    -- Deletar dados em cascata (assumindo que as FKs estão configuradas com ON DELETE CASCADE)
    -- Caso contrário, deletamos explicitamente as tabelas principais
    DELETE FROM public.user_roles WHERE user_id = _target_user_id;
    DELETE FROM public.profiles WHERE user_id = _target_user_id;
    DELETE FROM public.alerts WHERE user_id = _target_user_id;
    DELETE FROM public.cameras WHERE user_id = _target_user_id;
    DELETE FROM public.registered_persons WHERE user_id = _target_user_id;
    DELETE FROM public.rules WHERE user_id = _target_user_id;
    DELETE FROM public.zones WHERE user_id = _target_user_id;
    -- Adicionar outras tabelas conforme necessário

    -- Por fim, deletar o usuário da auth (requer service_role no edge function para chamar auth.admin.deleteUser)
    -- Mas aqui no SQL não temos acesso direto à auth.users de forma segura para deletar, 
    -- o Edge Function cuidará da parte da auth após chamar esta função.
END;
$$;

-- Revogar execução pública de funções críticas (Segurança Hardening)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC;