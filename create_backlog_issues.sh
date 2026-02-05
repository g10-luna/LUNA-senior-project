#!/bin/bash

# Script to create GitHub issues for technical debt backlog items
# Run from repository root

cd "$(dirname "$0")"

echo "Creating critical priority issues..."

# Issue 2: Non-Transactional Multi-Write Operations
gh issue create --title "[CRITICAL] Non-Transactional Multi-Write Operations - Orphaned Records Risk" \
  --body "## Description

Non-transactional database writes in edge function can create orphaned records and data inconsistency.

**Location:** \`luna-book-bot/supabase/functions/request-robot-navigation/index.ts:79-122\`

### Issue:
Two separate database inserts (\`robot_tasks\` and \`book_requests\`) without transaction. If the second insert fails, the first record becomes orphaned.

## Impact

- Data inconsistency
- Orphaned records in database
- System state corruption
- No cleanup mechanism

## Remediation Plan

1. Create Supabase RPC function for atomic operations using PostgreSQL transactions
2. Implement cleanup job to remove orphaned records
3. Add database constraints (foreign keys with CASCADE)
4. Use \`BEGIN/COMMIT/ROLLBACK\` for transaction management

## Acceptance Criteria

- [ ] RPC function created for atomic request creation
- [ ] All multi-write operations use transactions
- [ ] Cleanup job implemented for orphaned records
- [ ] Database constraints added
- [ ] Tests verify transaction rollback on failure

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#2-non-transactional-multi-write-operations)" \
  --label "critical,architecture"

# Issue 3: Missing Environment Variable Protection
gh issue create --title "[CRITICAL] Missing Environment Variable Protection" \
  --body "## Description

Environment variables are not properly protected and validated, risking secrets leakage and runtime failures.

### Issues:
1. \`.gitignore\` does NOT exclude \`.env\` files - secrets could be committed
2. No environment variable validation - app fails silently if vars missing

**Locations:**
- \`luna-book-bot/.gitignore\`
- \`Senior-Project-LUNA/.gitignore\`
- \`luna-book-bot/src/integrations/supabase/client.ts\`
- \`Senior-Project-LUNA/src/integrations/supabase/client.ts\`
- \`luna-book-bot/supabase/functions/request-robot-navigation/index.ts\`

## Impact

- Secrets leakage risk (accidental commit of .env files)
- Runtime failures with cryptic errors
- Service role key could be undefined
- Poor developer experience

## Remediation Plan

1. Update \`.gitignore\` to exclude all \`.env\` variants
2. Add runtime validation for required environment variables
3. Create \`.env.example\` files documenting required variables
4. Use environment variable validation library (e.g., \`zod\`)

## Acceptance Criteria

- [ ] \`.gitignore\` excludes \`.env\*, \`.env.local\`, \`.env.production\`, etc.
- [ ] Runtime validation throws clear errors for missing env vars
- [ ] \`.env.example\` files created for both projects
- [ ] Environment validation library integrated
- [ ] All required variables documented

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#3-missing-environment-variable-protection)" \
  --label "critical,security"

# Issue 4: No Test Infrastructure
gh issue create --title "[CRITICAL] No Test Infrastructure - 0% Test Coverage" \
  --body "## Description

Complete absence of test infrastructure prevents confidence in changes and creates regression risk.

**Evidence:**
- No test files (\`*.test.*\`, \`*.spec.*\`)
- No test scripts in \`package.json\`
- No testing dependencies
- No test coverage tools
- No CI/CD pipeline for automated testing

## Impact

- No confidence in code changes
- High regression risk
- Difficult refactoring
- No automated quality checks

## Remediation Plan

1. Add Vitest + React Testing Library to both projects
2. Create test scripts in \`package.json\`
3. Start with critical paths:
   - Unit tests for hooks/utilities
   - Integration tests for authentication flow
   - Integration tests for book request flow
   - Edge function tests (Deno test framework)
4. Set up CI/CD to run tests on every PR
5. Set coverage target: Minimum 70% for critical paths

## Acceptance Criteria

- [ ] Vitest and React Testing Library installed
- [ ] Test scripts added to \`package.json\`
- [ ] Unit tests for hooks/utilities created
- [ ] Integration tests for auth flow created
- [ ] Integration tests for book request flow created
- [ ] Edge function tests created
- [ ] CI/CD pipeline runs tests automatically
- [ ] Test coverage reporting set up

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#4-no-test-infrastructure)" \
  --label "critical,testing,needs-breakdown"

# Issue 5: Missing Backend Architecture
gh issue create --title "[CRITICAL] Missing Backend Architecture - No API Layer, Middleware, Background Jobs" \
  --body "## Description

System lacks proper backend architecture, making it not scalable and difficult to maintain.

### Missing Components:
1. **No Proper API Layer** - Single edge function, all business logic in frontend
2. **No Middleware Pipeline** - No validation, auth, error handling middleware
3. **No Background Job Processing** - No job queue, scheduled tasks, async processing
4. **No Service Layer Architecture** - Direct database calls from components

## Impact

- Not scalable
- Difficult to maintain
- No separation of concerns
- Cannot handle growth
- Single point of failure

## Remediation Plan

1. Create proper backend API structure with service layer
2. Implement middleware pipeline (auth, validation, error handling, logging)
3. Add background job processing (BullMQ with Redis)
4. Create repository pattern for data access
5. Implement API versioning (\`/api/v1/*\`)

## Acceptance Criteria

- [ ] API layer structure created
- [ ] Service layer implemented
- [ ] Middleware pipeline implemented
- [ ] Background job queue set up
- [ ] Repository pattern implemented
- [ ] API versioning structure in place
- [ ] Documentation updated

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#5-missing-backend-architecture)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#target-architecture)" \
  --label "critical,architecture,needs-breakdown"

# Issue 6: Scalability Limitations
gh issue create --title "[CRITICAL] Scalability Limitations - No Caching, Load Balancing, Horizontal Scaling" \
  --body "## Description

System cannot scale due to missing infrastructure components.

### Missing:
1. **No Caching Layer** - No Redis, frequent database queries
2. **No Load Balancing** - Single edge function, no horizontal scaling
3. **Database Performance Issues** - Limited indexing, no read replicas
4. **No Horizontal Scaling Architecture** - Monolithic design

## Impact

- Cannot handle growth
- Performance degradation under load
- Database becomes bottleneck
- Single point of failure

## Remediation Plan

1. Implement Redis caching layer
2. Add database optimizations (composite indexes, full-text search)
3. Set up read replicas for scaling reads
4. Implement API Gateway with load balancing
5. Add monitoring and observability (APM, metrics, logging)

## Acceptance Criteria

- [ ] Redis cache implemented
- [ ] Database indexes optimized
- [ ] Read replicas configured
- [ ] API Gateway set up
- [ ] Load balancing implemented
- [ ] Monitoring and observability added
- [ ] Performance benchmarks established

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#6-scalability-limitations)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#target-architecture)" \
  --label "critical,infrastructure,needs-breakdown"

# Issue 7: Duplicate Projects Without Shared Core
gh issue create --title "[CRITICAL] Duplicate Projects - 40% Code Duplication, No Shared Package" \
  --body "## Description

Two parallel applications with ~40% code duplication and no shared codebase.

**Projects:**
- \`luna-book-bot\` (Student App)
- \`Senior-Project-LUNA\` (Librarian Dashboard)

### Duplications:
- Identical UI components (49 files each)
- Duplicate Supabase clients
- Duplicate hooks and utilities
- Duplicate configuration files
- No shared package or documented boundary

## Impact

- Maintenance burden (fix bugs twice)
- Inconsistency between apps
- Bugs multiply across projects
- Difficult to maintain

## Remediation Plan

1. Set up monorepo structure (Turborepo, Nx, or pnpm workspaces)
2. Create shared packages:
   - \`packages/shared-ui\` - Common UI components
   - \`packages/shared-types\` - Type definitions
   - \`packages/shared-utils\` - Utilities and hooks
   - \`packages/shared-supabase\` - Supabase client and types
3. Migrate duplicate code to shared packages
4. Update both apps to use shared code
5. Document architecture boundaries

## Acceptance Criteria

- [ ] Monorepo structure set up
- [ ] Shared UI components package created
- [ ] Shared types package created
- [ ] Shared utilities package created
- [ ] Both apps use shared packages
- [ ] Code duplication reduced to <10%
- [ ] Architecture documented

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#7-duplicate-projects-without-shared-core)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)" \
  --label "critical,architecture,needs-breakdown"

# Issue 8: Remote Dependency Risks
gh issue create --title "[CRITICAL] Remote Dependency Risks - CDN Imports, External Package Dependencies" \
  --body "## Description

Dependencies on remote CDN imports and external packages create deployment and build risks.

### Issues:
1. **Edge Function Remote Imports** - Uses CDN imports from \`deno.land\` and \`esm.sh\`
2. **Lovable Tagger Dependency** - Dev workflow depends on external package

**Locations:**
- \`luna-book-bot/supabase/functions/request-robot-navigation/index.ts\`
- \`luna-book-bot/vite.config.ts\`
- \`Senior-Project-LUNA/vite.config.ts\`

## Impact

- CDN outages break deployment
- Version deprecations break builds
- External package changes break workflow
- No fallback mechanism

## Remediation Plan

1. Pin edge function dependencies using \`deno.json\` with locked versions
2. Vendor dependencies locally if needed
3. Make lovable-tagger optional (wrap in try-catch or feature flag)
4. Add fallback mechanisms
5. Document as optional dev tool or remove if not essential

## Acceptance Criteria

- [ ] Edge function dependencies pinned
- [ ] \`deno.json\` with locked versions created
- [ ] Lovable-tagger made optional or removed
- [ ] Fallback mechanisms added
- [ ] Dependencies documented

## References

- Technical Debt Assessment: [docs/TECHNICAL_DEBT_ASSESSMENT.md](docs/TECHNICAL_DEBT_ASSESSMENT.md#8-remote-dependency-risks)" \
  --label "critical,infrastructure"

echo "Critical issues created. Creating high priority issues..."

# Continue with high priority issues...
echo "Done creating critical issues. High priority issues can be created next."
