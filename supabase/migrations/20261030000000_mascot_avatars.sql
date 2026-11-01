-- Feature: more mascots (feature/mascots). Bulb, Coil and Knob are profile characters too, so the check on the avatar
-- column accepts their ids. The ids are the characters in content/ui/avatars.json.
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles
  add constraint profiles_avatar_check
  check (avatar in ('volt', 'diode', 'pixel', 'servo', 'chip', 'bulb', 'coil', 'knob'));
