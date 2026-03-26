# KEX GROUP — Agent Teams

## Team Map

| Agent | Owns | Wave | Model |
|-------|------|------|-------|
| **Leader** | packages/database, packages/shared-types, merge | orchestrator | Opus |
| auth-specialist | apps/auth-service/ | 1 | Sonnet |
| worker-specialist | apps/aggregator-worker/ | 1 | Sonnet |
| finance-specialist | apps/finance-service/ | 2 | Sonnet |
| gateway-specialist | apps/api-gateway/ | 2 | Sonnet |
| mobile-specialist | apps/mobile-dashboard/ | 3 | Sonnet |

## Wave Execution Order

```
Wave 0: research-agent → research/*.md
  ↓ (leader confirms research files exist)
Wave 1: auth-specialist + worker-specialist (parallel)
  ↓ (leader extracts JWT contracts from auth → injects into Wave 2)
Wave 2: finance-specialist + gateway-specialist (parallel)
  ↓ (leader extracts API contracts from gateway → injects into Wave 3)
Wave 3: mobile-specialist
```

## Merge Order (leader only, after each wave)

1. packages/database (schema.prisma) → main
2. packages/shared-types → main
3. apps/auth-service → main
4. apps/aggregator-worker → main
5. apps/finance-service → main
6. apps/api-gateway → main
7. apps/mobile-dashboard → main (last)

## Contract Injection SOP

After Wave N completes:
1. Leader reads DONE.md / output of completed agents
2. Extracts exact interfaces, endpoint signatures, payload formats
3. Injects contracts into Wave N+1 spawn prompts
4. Example: auth JWT payload `{ userId, role, orgId }` → gateway spawn prompt

## Session Resumption SOP

**Teammates do NOT survive terminal crashes.** `/resume` only restores leader.

Prevention:
- Spawn prompt includes: "Commit after completing each deliverable"
- Don't run tasks longer than 1-2 hours without checkpoints

Recovery:
1. Leader respawns teammates
2. Worktrees with code are preserved
3. New teammate sees previous commits in worktree

## Error Recovery

| Situation | Action |
|-----------|--------|
| Agent stuck/looping | `/clear` → reformulate task more specifically |
| 3x failures | Escalate to leader |
| Agent generated garbage | `git checkout -- .` + `git clean -fd` in worktree |
| Rate limit hit | Pause mobile-agent first, keep auth/worker running |

## Rate Limit Priorities

1. auth-specialist (blocks everyone) — KEEP
2. worker-specialist (critical path) — KEEP
3. finance-specialist (core logic) — KEEP
4. gateway-specialist — pause if needed
5. mobile-specialist — pause first

## Quality Gates

- TaskCompleted hook auto-runs `npm test`
- Pre-commit hook blocks cross-boundary edits
- Each agent runs tests before marking task done
