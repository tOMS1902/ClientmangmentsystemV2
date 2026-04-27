-- Allow coaches to disable check-in photos per client
alter table clients add column if not exists checkin_photos_enabled boolean default true;
