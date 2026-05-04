---
language: en-US
audience: agent
doc_type: issue-draft
status: filed
updated: 2026-05-04
upstream_repo: wo1fsea/dispatch-engine
upstream_issue: https://github.com/wo1fsea/dispatch-engine/issues/19
---

# [dogfood] blocked run cannot recover after worker protocol violations and autonomous test-repair decision

## Context

- Target: private local dogfood repo for Paseo Passport.
- Dispatch Engine run id: `20260504T055050436139Z`.
- Dispatch Engine skill commit observed locally: `e7eb43a`.
- Skill path: `$CODEX_HOME/skills/dispatch-engine`.
- Provider/profile: Codex coordinator using `codex-exec`; worker launched
  through provider-native `spawn_agent`.
- Host: Codex Desktop heartbeat supervision.

## Problem

A final-smoke worker completed with concerns and produced useful validation
evidence, but the run remained `blocked` because the worker report included
capability/protocol violations for local service start and Playwright screenshot
commands. A pending decision to repair stale full-suite tests was later resolved
autonomously after four unanswered heartbeat checks, and the stale tests were
repaired manually with `npm test -- --run` passing afterward.

However, the original Dispatch Engine run still has no actionable recovery
path: coordinator and supervisor are completed, pending decisions are zero, and
`status --json` still reports the run as `blocked` with next action
`repair_protocol_violations`.

This makes the run state misleading/stale after the operator has repaired the
target-repo validation blocker outside the original worker.

## Expected Behavior

Dispatch Engine should make one of these paths explicit and durable:

- re-enter or continue a coordinator after a decision is resolved so a targeted
  repair worker can be launched;
- allow an operator/coordinator to acknowledge, supersede, or close
  protocol-violation alerts with rationale and validation evidence;
- or move the run to a terminal degraded/failed state when the only remaining
  blocker is an unrepairable protocol violation and no coordinator is alive.

`status --json` should not leave the operator in a blocked state with no
available command or next step beyond a generic `repair_protocol_violations`
hint.

## Evidence

Minimal status/alert snippets after the autonomous decision:

```text
run_id: 20260504T055050436139Z
run_status: blocked
pending_decisions: 0
autonomous_decisions.count: 1
supervisor_counts.by_status.completed: 1
agent_counts.by_status.completed: 2
next_actions: [{ type: "repair_protocol_violations", count: 3 }]
alerts: capability_overreach(service_start), capability_overreach(test_execution), unknown protocol_violation, run_blocked
```

The worker report status was `completed_with_concerns`; it documented that
full-suite validation failed only because stale tests outside scope still
expected the old password/phase-A flow. After manual repair in the target repo,
`npm test -- --run` passed all 47 tests.

The run was then cancelled with evidence preserved because no Dispatch Engine
command existed to resolve or acknowledge the remaining protocol-violation
alerts.

## Impact

Run supervision is degraded/blocked: the target product validation can be
completed, but the Dispatch Engine run cannot honestly converge to
completed/failed/cancelled through the exposed workflow. Heartbeat monitoring
keeps reporting the same stale block.

## Possible Fix Direction

This likely needs a runtime plus protocol addition:

- add an explicit protocol-violation acknowledgement/resolution record with
  actor, rationale, evidence, and whether validation supersedes the violation;
- expose it through a `de` command and `status --json`;
- clarify heartbeat/coordinator guidance for what to do when protocol
  violations remain after all product validation blockers are resolved;
- optionally support coordinator re-entry after `resolve-decision` when the
  original detached coordinator has already exited.

## Privacy Check

No secrets, credentials, raw offers, screenshots, or private target-repo source
content are included here. The target repository is described only as a private
dogfood repo, and evidence is limited to sanitized Dispatch Engine status
fields.

## Filing Status

Filed on 2026-05-04:

- https://github.com/wo1fsea/dispatch-engine/issues/19

Note: the first filing attempt failed because `/opt/homebrew/bin` was absent
from Codex's shell `PATH`, so `gh` was not found. Re-running with the absolute
path `/opt/homebrew/bin/gh` succeeded.
