# Prompt log: README live URL (issue #188)

1. While Claude checked the deploy after PRs #185, #186 and #187, it found that `https://jumper-inky-sigma.vercel.app/` redirects (307) to `https://jumper-hardware.vercel.app/`. `README.md` still gave the old URL.
2. Hanif: "fix the README URL in a small PR"
3. Claude changed the two URLs in `README.md` (the "Live app" line and the example video link) and checked that both new links give 200. The prompt logs in `prompts/` keep the old URL, because they record what occurred at that time.
