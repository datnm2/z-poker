-- Allow multiple sessions per day per domain
alter table sessions drop constraint if exists sessions_played_date_domain_key;
