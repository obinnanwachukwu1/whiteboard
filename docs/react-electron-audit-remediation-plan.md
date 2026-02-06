# React/Electron Audit Remediation Plan

Date: 2026-02-06
Scope: Implement fixes for the latest full React/Electron audit findings (good/bad/ugly review).

## Phase 1 - Hidden Course ID Correctness (P1)

Goals:
- Eliminate `string` vs `number` mismatches for hidden course filtering/toggling.
- Ensure all hidden-course set operations normalize IDs consistently.

Tasks:
- Add shared helpers to normalize course IDs and hidden-course sets.
- Replace direct `hidden.has(c.id)` / raw add/delete operations in routes/components/hooks.
- Add targeted tests for normalization behavior.

Exit criteria:
- Hidden course state is consistent across sidebar, all-courses manager, dashboard, and page filters.
- Tests cover numeric/string ID interop.

## Phase 2 - Search Lifecycle + Dev Tooling Cleanup (P1/P2)

Goals:
- Gate global search/indexing background work behind actual search UI visibility.
- Remove `why-did-you-render` from app startup and dependencies.

Tasks:
- Thread modal visibility into `useGlobalSearch` enablement.
- Keep private mode checks intact while avoiding always-on polling/indexing.
- Remove `src/wdyr.ts`, startup import, and package dependency.

Exit criteria:
- Search background work only runs when intended.
- No runtime import path references `why-did-you-render`.

## Phase 3 - Context Rerender Containment (P2)

Goals:
- Reduce action-context churn from mutable state capture in AI panel submit actions.

Tasks:
- Refactor submit path to avoid capturing full mutable state in callbacks.
- Use refs/functional state updates where needed to preserve behavior.
- Keep public AI panel actions API unchanged.

Exit criteria:
- `AIPanelActionsContext` value is more stable under message/query updates.
- Existing AI panel behavior remains functionally identical.

## Phase 4 - UI Stability/Accessibility Polish (P2/P3)

Goals:
- Replace unstable real-list index keys.
- Improve modal keyboard accessibility with focus trap/restore.
- Reduce repeated heavy formatting work in hot render loops where practical.

Tasks:
- Convert index keys in non-skeleton lists to stable keys.
- Add focus trap + focus restoration to shared modal.
- Precompute repeated date labels in large mapped UI blocks where practical without broad refactors.

Exit criteria:
- No `key={i}` in real user-data lists touched by this audit.
- Shared modal traps focus and restores it on close.

## Validation (Per Phase)

- `pnpm exec tsc -p tsconfig.json --noEmit`
- `pnpm lint`
- `pnpm test` (or targeted tests for early phases, full run at the end)

## Commit Strategy

- One commit per phase after phase validation.
- Commit messages:
  - `phase 1: normalize hidden course id handling`
  - `phase 2: gate global search work and remove wdyr`
  - `phase 3: stabilize ai panel action callbacks`
  - `phase 4: improve list keys and modal accessibility`
