-- Feature 17: profile page. The character that the learner chose, and the columns that a learner can change.

-- The ids are the characters in content/ui/avatars.json. 'volt' is the default.
alter table public.profiles
  add column avatar text not null default 'volt'
  check (avatar in ('volt', 'diode', 'pixel', 'servo', 'chip'));

-- A learner changes only the name and the character. Before, the "Owner only" policy let a learner set their own
-- XP with a direct call. The sign-up trigger adds the row, and no feature deletes a profile.
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;

-- XP now changes only in record_attempt. It must run as its owner to write the xp column. It still finds only the
-- user's own session (user_id = auth.uid()), and it writes only that session, its attempt and that user's profile.
alter function public.record_attempt(uuid, boolean, text, int, int, int) security definer;
