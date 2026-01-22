<!--
=============================================================================
SYNC IMPACT REPORT
=============================================================================
Version change: N/A → 1.0.0 (Initial adoption)
Modified principles: N/A (Initial creation)
Added sections:
  - Core Principles (4 principles)
  - Quality Gates
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md: ✅ Compatible (Success Criteria aligns with principles)
  - .specify/templates/tasks-template.md: ✅ Compatible (Test-first pattern supported)
  - .specify/templates/checklist-template.md: ✅ Compatible (Generic structure)
  - .specify/templates/agent-file-template.md: ✅ Compatible (Generic structure)
Follow-up TODOs: None
=============================================================================
-->

# Mofalaya Constitution

## Core Principles

### I. Code Quality

All code MUST meet the following quality standards:

- **Readability**: Code MUST be self-documenting with clear naming conventions. Comments are reserved for explaining "why", not "what".
- **Modularity**: Functions and modules MUST have single responsibilities. Maximum function length: 50 lines. Maximum file length: 400 lines.
- **Type Safety**: All public interfaces MUST have explicit type definitions. No `any` types in TypeScript; no untyped public APIs.
- **Error Handling**: All errors MUST be explicitly handled. No silent failures. Errors MUST propagate with meaningful context.
- **No Dead Code**: Unused code MUST be removed immediately. No commented-out code in production branches.
- **Linting Compliance**: All code MUST pass configured linters with zero warnings before merge.

**Rationale**: Consistent code quality reduces maintenance burden, improves onboarding speed, and prevents technical debt accumulation.

### II. Testing Standards

All features MUST include appropriate test coverage:

- **Unit Tests**: All business logic MUST have unit test coverage with minimum 80% line coverage for new code.
- **Integration Tests**: All API endpoints and service boundaries MUST have integration tests verifying contract compliance.
- **Test Independence**: Each test MUST be independently runnable and produce consistent results. No test order dependencies.
- **Test Naming**: Test names MUST describe the scenario being tested using the pattern: `[unit]_[scenario]_[expectedResult]`.
- **Test Data**: Tests MUST use fixtures or factories. No hardcoded production data in tests.
- **CI Gate**: All tests MUST pass before code can be merged. Flaky tests MUST be fixed or quarantined immediately.

**Rationale**: Comprehensive testing ensures reliability, enables confident refactoring, and serves as living documentation of expected behavior.

### III. User Experience Consistency

All user-facing features MUST maintain consistent experience:

- **Design System Compliance**: All UI components MUST follow the established design system. No ad-hoc styling.
- **Responsive Design**: All interfaces MUST function correctly across defined breakpoints (mobile, tablet, desktop).
- **Accessibility**: All interactive elements MUST be keyboard navigable. WCAG 2.1 AA compliance is required.
- **Error States**: All user-facing errors MUST provide actionable feedback. No technical jargon in user messages.
- **Loading States**: All async operations MUST display appropriate loading indicators within 100ms of initiation.
- **Localization Ready**: All user-facing strings MUST be externalized for localization support.

**Rationale**: Consistent UX builds user trust, reduces support burden, and ensures the platform is accessible to all users.

### IV. Performance Requirements

All features MUST meet performance standards:

- **Response Time**: API endpoints MUST respond within 200ms at p95 under normal load.
- **Initial Load**: First meaningful paint MUST occur within 2 seconds on 3G connections.
- **Bundle Size**: JavaScript bundle size MUST not exceed 250KB gzipped for initial load.
- **Memory**: Client-side memory usage MUST not exceed 100MB during typical usage patterns.
- **Database Queries**: No N+1 queries. All database operations MUST be optimized with appropriate indexing.
- **Caching Strategy**: Cacheable resources MUST have explicit caching policies defined.

**Rationale**: Performance directly impacts user retention and platform scalability. Slow experiences degrade user satisfaction and increase infrastructure costs.

## Quality Gates

All code changes MUST pass these gates before merge:

| Gate | Requirement | Automated |
|------|-------------|-----------|
| Lint | Zero warnings | Yes |
| Type Check | Zero errors | Yes |
| Unit Tests | 100% pass, 80%+ coverage for new code | Yes |
| Integration Tests | 100% pass | Yes |
| Bundle Size | Under limits | Yes |
| Performance | Meets response time targets | Manual for new endpoints |
| Accessibility | WCAG 2.1 AA | Manual for new UI |
| Code Review | Minimum 1 approval | Yes |

## Development Workflow

All development MUST follow this workflow:

1. **Specification**: Feature requirements MUST be documented in spec.md before implementation begins.
2. **Planning**: Implementation approach MUST be documented in plan.md with constitution compliance verified.
3. **Test-First**: Tests SHOULD be written before implementation where practical. At minimum, test cases MUST be defined before coding.
4. **Incremental Commits**: Changes MUST be committed in logical, atomic units with descriptive messages.
5. **Review**: All code MUST be reviewed by at least one team member before merge.
6. **Validation**: All quality gates MUST pass before merge to main branch.

## Governance

This constitution establishes the non-negotiable standards for the Mofalaya project. All development activities MUST comply with these principles.

**Amendment Process**:
1. Proposed amendments MUST be documented with rationale and impact analysis.
2. Amendments MUST be reviewed and approved by project maintainers.
3. Breaking changes (MAJOR version) require migration plan documentation.
4. All dependent templates MUST be updated to reflect constitutional changes.

**Compliance**:
- All pull requests MUST verify compliance with applicable principles.
- Constitution violations MUST be documented in Complexity Tracking if justified.
- Repeated violations without justification block merge approval.

**Versioning**: This constitution follows semantic versioning:
- MAJOR: Backward-incompatible principle changes or removals
- MINOR: New principles or materially expanded guidance
- PATCH: Clarifications, wording improvements, non-semantic changes

**Version**: 1.0.0 | **Ratified**: 2026-01-19 | **Last Amended**: 2026-01-19
