-- Onda 139 — contagem de avisos colaborativos com separação por acionabilidade.
--
-- Motivo: o badge da navegação recebia apenas `unread`, um número plano. Um
-- convite recebido (que NUNCA pode ser silenciado e exige resposta humana com
-- prazo) ficava indistinguível de seis avisos informativos de "membro
-- reintegrado". A UI não tinha como pintar gravidade sem uma segunda consulta
-- pesada, e uma segunda consulta seria uma segunda verdade.
--
-- Acionável = kind não silenciável, ou seja, exatamente o complemento de
-- `collab_notification_silenceable`. Derivar do mesmo predicado impede que as
-- duas listas divirjam com o tempo.

DROP FUNCTION IF EXISTS public.collab_unread_counts(timestamptz);

CREATE OR REPLACE FUNCTION public.collab_unread_counts(p_now timestamptz DEFAULT now())
RETURNS TABLE(
  organization_id uuid,
  unread integer,
  silenced integer,
  actionable integer,
  critical integer,
  oldest_unread_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT n.organization_id,
         count(*) FILTER (WHERE NOT muted)::int AS unread,
         count(*) FILTER (WHERE muted)::int AS silenced,
         -- Acionável só conta o que está efetivamente visível (NOT muted);
         -- por construção nenhum acionável é silenciável, mas manter o filtro
         -- torna a invariante explícita em vez de implícita.
         count(*) FILTER (WHERE NOT muted AND NOT silenceable)::int AS actionable,
         count(*) FILTER (WHERE NOT muted AND severity = 'critical')::int AS critical,
         min(created_at) FILTER (WHERE NOT muted) AS oldest_unread_at
    FROM (
      SELECT n.organization_id,
             n.severity,
             n.created_at,
             public.collab_notification_silenceable(n.kind) AS silenceable,
             (public.collab_notification_silenceable(n.kind)
              AND s.user_id IS NOT NULL
              AND n.kind = ANY(s.silenced_kinds)
              AND s.silenced_until > p_now) AS muted
        FROM public.collab_notifications n
        LEFT JOIN public.collab_notification_silences s
               ON s.user_id = auth.uid() AND s.organization_id = n.organization_id
       WHERE auth.uid() IS NOT NULL
         AND n.organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
         AND NOT EXISTS (
           SELECT 1 FROM public.collab_notification_reads r
            WHERE r.notification_id = n.id AND r.user_id = auth.uid())
    ) n
   GROUP BY n.organization_id
$function$;

-- Permissões: `DROP` levou embora o ACL anterior, então recompomos exatamente
-- o mesmo desenho da Onda 131 — nada de acesso anônimo a dados de rede.
REVOKE ALL ON FUNCTION public.collab_unread_counts(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.collab_unread_counts(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.collab_unread_counts(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collab_unread_counts(timestamptz) TO service_role;

COMMENT ON FUNCTION public.collab_unread_counts(timestamptz) IS
  'Onda 139 — avisos colaborativos não lidos por organização: total visível, silenciados, acionáveis (kinds não silenciáveis), críticos e data do mais antigo visível.';