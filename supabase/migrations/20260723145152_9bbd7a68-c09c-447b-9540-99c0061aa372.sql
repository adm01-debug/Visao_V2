
create table if not exists public.agent_relay_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.local_agents(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('http_request')),
  request jsonb not null,
  status text not null default 'pending' check (status in ('pending','in_progress','done','failed','expired')),
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '60 seconds')
);

create index if not exists idx_agent_relay_tasks_agent_status
  on public.agent_relay_tasks(agent_id, status, created_at);
create index if not exists idx_agent_relay_tasks_user
  on public.agent_relay_tasks(user_id, created_at desc);

grant select, insert, update, delete on public.agent_relay_tasks to authenticated;
grant all on public.agent_relay_tasks to service_role;

alter table public.agent_relay_tasks enable row level security;

create policy "relay_tasks_owner_select" on public.agent_relay_tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "relay_tasks_owner_insert" on public.agent_relay_tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "relay_tasks_service_all" on public.agent_relay_tasks
  for all to service_role using (true) with check (true);

create or replace function public.claim_agent_relay_tasks(_agent_id uuid, _max int default 4)
returns setof public.agent_relay_tasks
language sql
security definer
set search_path = public
as $$
  with picked as (
    select id
      from public.agent_relay_tasks
     where agent_id = _agent_id
       and status = 'pending'
       and expires_at > now()
     order by created_at
     for update skip locked
     limit greatest(1, least(_max, 16))
  )
  update public.agent_relay_tasks t
     set status = 'in_progress', claimed_at = now()
    from picked
   where t.id = picked.id
  returning t.*;
$$;

revoke all on function public.claim_agent_relay_tasks(uuid, int) from public;
grant execute on function public.claim_agent_relay_tasks(uuid, int) to service_role;

create or replace function public.expire_agent_relay_tasks()
returns int
language sql
security definer
set search_path = public
as $$
  with expired as (
    update public.agent_relay_tasks
       set status = 'expired', completed_at = now(), error = coalesce(error, 'task_expired')
     where status in ('pending','in_progress')
       and expires_at < now()
    returning 1
  )
  select count(*)::int from expired;
$$;

revoke all on function public.expire_agent_relay_tasks() from public;
grant execute on function public.expire_agent_relay_tasks() to service_role;
