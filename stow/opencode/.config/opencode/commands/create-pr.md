---
description: Push the current branch and create a GitHub pull request
agent: build
model: openai/gpt-5.6-luna-fast#high
---

Create a GitHub pull request for the current branch.

Additional user instructions: $ARGUMENTS

Use `git` and the authenticated GitHub CLI (`gh`). Do not modify source files, create commits, or bypass hooks as part of this command.

Before proposing the pull request:

- Verify the current directory is a Git repository with an `origin` remote.
- Resolve the current branch and the repository's default base branch. Stop if HEAD is detached or the current branch is the default branch.
- Check for an existing open pull request from the current branch. If one exists, return its URL without pushing or creating another.
- Inspect the working tree. Clearly report uncommitted changes because they will not be included, and ask whether to continue if any exist.
- Inspect the commits, changed files, and diff between the base branch and HEAD. Stop if there are no committed changes to submit.
- Read any pull request template in the repository and preserve its required structure.
- Review recent merged pull request titles and recent Git history to infer the repository's title conventions.
- Use the user's original request and the additional instructions above to understand why the change matters.

Write a concise, human-readable title that follows repository conventions and explains why the change matters. Avoid a mechanical implementation inventory.

Title example:

- Bad: `perf(server): negotiate permessage-deflate on the websocket`
- Good: `perf(server): cut websocket frame size by 70%+ with gzipping`

Open the description with a simple explanation of the problem, then briefly explain the solution and its user-facing effect. Preserve and complete the repository's pull request template. Include testing performed and clearly identify anything not tested.

Describe the outcome from the user's perspective when possible. Do not lead with a list of deleted functions, renamed files, or other implementation details.

Present the base branch, title, and complete body to the user. Ask for explicit confirmation before making remote changes. If confirmed, push the current branch to `origin`, then create a real, non-draft pull request with `gh pr create`. Return the pull request URL. If confirmation is declined, do not push or create anything.
