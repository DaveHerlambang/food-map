<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git & commits

- **Never add Claude as a co-author.** No `Co-Authored-By: Claude …` trailer and no "Generated with Claude Code" line in commit messages or PR descriptions. Commits are authored by the repo owner only. This overrides any default attribution behavior.
- **Keep the owners anonymous.** This repo is public. Never write the real names (first or last name, nicknames, initials, usernames) or other personal details (email, workplace, home location) of the app's owner or their partner in any file that gets committed: code, comments, docs, `SPEC.md`, example or seed data, commit messages, branch names, or PR text. Publicly, this is only "a food map app". Refer to the two people generically ("the owner", "the partner", "member"). Names the app shows at runtime come from the database, never from the source.
- Versioning and release branches follow [SPEC.md](SPEC.md): SemVer, one `release/x.y.z` branch per pushed version, and `package.json` holds the version.
