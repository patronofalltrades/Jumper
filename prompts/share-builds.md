# Prompt log: Share builds (issue #87)

1. Task for Claude on branch `Feature/ShareBuild`: build issue #87, "Share builds: a public read-only link for a snapshot". Hanif made these decisions before the work:
   - Share is a real feature, not a "Coming soon" note: a public read-only link `/s/<snapshot id>`.
   - A switch "Anyone with the link can see this build", off by default. The owner can turn it off at any time.
   - Database: one column `snapshots.shared boolean default false`, and one `security definer` function `get_shared_snapshot(id)`. It gives the snapshot, its level title and its project slug only when `shared` is true. Row-level security is not opened to anonymous users. The function sets `search_path`, and gives the display name of the owner, never the email.
   - The shared page needs no log-in. It shows the view-only 3D board, the title, the level, the notes, the result and the display name of the owner. It has a "Make your own on Jumper" button to the home page.
   - Migration file `20261029000000_share_builds.sql`. Hanif applies it to the live project himself.
