-- Change default buy-in from 1000 to 800
alter table sessions alter column buy_in set default 800;

-- Drop the overly permissive "anyone in domain can edit any chips" policy
drop policy if exists "sp_update_same_domain" on session_players;

-- Only session creator can update any player's chips
create policy "sp_update_creator" on session_players
  for update using (
    exists (
      select 1 from sessions s
      where s.id = session_id
        and s.created_by = auth.uid()
        and not s.is_locked
    )
  );

-- sp_update_own_chips already exists: participants can edit their own row
