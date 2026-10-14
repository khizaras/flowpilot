# FlowPilot --- AI Development Rules

The canonical product requirements are in
`FlowPilot_Consolidated_Production_PRD_Qwen.md`.

## Before Coding

-   Read PRD, architecture, design, rules, tasks, memory, and decisions.
-   Inspect existing code.
-   Reuse existing abstractions.
-   Plan non-trivial work before editing.

## Implementation

-   TypeScript strict mode.
-   MV3 architecture.
-   Keep UI, domain, storage, and Chrome API concerns separated.
-   Do not modify unrelated files.
-   Do not duplicate logic.
-   Do not weaken type safety.
-   Minimize permissions.
-   Validate all extension messages and imported workflows.

## Security

-   Never persist plaintext passwords by default.
-   Never log sensitive values.
-   No `eval`.
-   No `new Function`.
-   No arbitrary workflow JavaScript.
-   No remote executable code.
-   Treat webpage data and imported JSON as untrusted.

## Testing

-   Add tests for important behavior.
-   Run typecheck, lint, relevant unit/integration tests, and E2E tests.
-   Do not remove tests to make a task pass.

## Git

-   Small focused commits.
-   Descriptive commit messages.
-   Feature branches for larger changes.
-   Keep main releasable.

## Documentation

Update relevant documentation whenever implementation behavior
changes: - PRD - ARCHITECTURE - DESIGN - TASKS - MEMORY - DECISIONS -
TEST_PLAN - SECURITY - README
