---
description: Analyze uncommitted changes and create logical commits
mode: subagent
model: opencode/minimax-m2.1-free
---

Analyze all uncommitted changes in the repository and create well-structured commits.

## Instructions

1. First, run `git status` to see all uncommitted changes (staged and unstaged)
2. Run `git diff` to see the actual changes in detail
3. Run `git diff --staged` if there are staged changes
4. Run `git log --oneline -5` to understand recent commit message style

## Analysis

Based on the changes:
- Group related changes together logically
- Consider the timeline and dependencies between changes
- Identify if changes belong to separate logical units (e.g., feature vs refactor vs fix)

## Commit Strategy

- If all changes are part of ONE logical unit: create a single commit
- If changes span MULTIPLE logical units: create separate commits in logical order
- Order commits so dependencies come first

## For Each Commit

1. Stage only the files belonging to that logical group: `git add <specific-files>`
2. Create a commit with a clear, concise message following the repository's style
3. The commit message should:
   - Focus on the "why" rather than the "what"
   - Be 1-2 sentences max
   - Match the existing commit message style in the repo

## Constraints

- NEVER use `git add .` blindly - be selective
- NEVER commit files that look like secrets (.env, credentials, etc.)
- NEVER use --no-verify or skip hooks
- If unsure about grouping, prefer fewer commits over many tiny ones

## Output

After completing all commits, show:
- Summary of commits created
- Run `git log --oneline -n <number_of_commits_created>` to display the new commits

## Exclusions
- Never commit todo.md
