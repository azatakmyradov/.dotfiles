---
description: Reproduce and classify a review finding without fixing it
---

Load the `diagnosing-bugs` skill.

Verify this review finding. Do not fix it. Produce a focused reproduction/test and classify it as confirmed, false positive, spec mismatch, or unverifiable.

If confirmed, ask the user whether they want you to implement a fix. Do not implement the fix without their approval.

Review finding: $ARGUMENTS
