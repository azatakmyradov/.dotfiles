---
description: Verify all review findings with a subagent
---

Spawn one native `general` subagent for each review finding. Give each subagent its finding and relevant context, and tell it to load the `diagnosing-bugs` skill and verify the finding without fixing it.

Wait for all subagents and report their results. Ask before fixing confirmed findings.
