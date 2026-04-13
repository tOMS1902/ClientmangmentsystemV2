-- Allow coaches to disable weekly and/or midweek check-ins per client
alter table clients add column if not exists weekly_checkin_enabled boolean default true;
alter table clients add column if not exists midweek_check_enabled boolean default true;
