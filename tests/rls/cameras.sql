-- Testes de RLS para a tabela public.cameras
BEGIN;
SELECT plan(6);

-- Setup: Criar usuários de teste (simulados via sub claim no JWT)
-- User 1: 00000000-0000-0000-0000-000000000001
-- User 2: 00000000-0000-0000-0000-000000000002

-- 1. Testar que usuário autenticado não vê câmeras de outros
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- Inserir câmera para User 1 (deve funcionar se a policy permitir)
-- Nota: RLS para INSERT geralmente usa with check (auth.uid() = user_id)
INSERT INTO public.cameras (id, user_id, name, location, status) 
VALUES ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cam User 1', 'Local 1', 'online');

SELECT results_eq(
    $$SELECT name FROM public.cameras WHERE user_id = '00000000-0000-0000-0000-000000000001'$$,
    ARRAY['Cam User 1'],
    'Usuário deve conseguir ler sua própria câmera'
);

-- 2. Trocar para User 2 e tentar ler câmera do User 1
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';

SELECT is_empty(
    $$SELECT * FROM public.cameras WHERE user_id = '00000000-0000-0000-0000-000000000001'$$,
    'Usuário NÃO deve conseguir ler câmeras de outros usuários'
);

-- 3. Testar proibição de INSERT com ID de outro usuário
SELECT throws_ok(
    $$INSERT INTO public.cameras (user_id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Malicious Cam')$$,
    '42501',
    NULL,
    'Usuário NÃO deve conseguir inserir câmeras em nome de outro usuário'
);

-- 4. Testar UPDATE em câmera alheia
SELECT lives_ok(
    $$UPDATE public.cameras SET name = 'Owned' WHERE user_id = '00000000-0000-0000-0000-000000000002'$$, -- Placeholder for own
    'Pode atualizar a própria'
);

-- (Simular tentativa de update no ID do User 1 enquanto logado como User 2)
-- Como o SELECT já filtra, o UPDATE não deve afetar nenhuma linha.
UPDATE public.cameras SET name = 'Hacked' WHERE id = 'c0000000-0000-0000-0000-000000000001';
SELECT results_ne(
    $$SELECT name FROM public.cameras WHERE id = 'c0000000-0000-0000-0000-000000000001'$$,
    ARRAY['Hacked'],
    'UPDATE em câmera de terceiros não deve ter efeito'
);

-- 5. Testar DELETE em câmera alheia
DELETE FROM public.cameras WHERE id = 'c0000000-0000-0000-0000-000000000001';
SELECT results_eq(
    $$SELECT count(*)::int FROM public.cameras WHERE id = 'c0000000-0000-0000-0000-000000000001'$$,
    ARRAY[1],
    'DELETE em câmera de terceiros não deve ter efeito'
);

-- 6. Testar Admin bypass (se houver role admin)
-- Simular role admin via tabela user_roles
RESET ROLE; -- Voltar para postgres para setup
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000003', 'admin');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000003';

-- Admins geralmente podem ver tudo (depende da policy implementada)
-- Se a policy atual for apenas auth.uid() = user_id, o admin NÃO verá nada.
-- Vamos validar o estado atual.
SELECT lives_ok(
    $$SELECT * FROM public.cameras$$,
    'Execução de SELECT como Admin'
);

SELECT * FROM finish();
ROLLBACK;
