# Risk & Technical Debt Inventory
## LUNA Senior Project - Individual Submission

**Name:** Sarah Cole  
**Date:** February 3, 2025  
**Module:** Senior Project II Reset: From Prototypes to Products

---

## Part 1: The Technical Debt Audit

This section identifies significant areas of technical debt in the LUNA codebase, classified by category with detailed descriptions and remediation plans. The audit was performed using Cursor to scan the repository and verify AI-generated code against production standards (VIBE Coding Principles: **Verify**).

**Analysis Method:** Used Cursor AI to analyze the codebase, identify patterns, and verify AI-generated code for structural issues, security vulnerabilities, and maintainability concerns.

### Technical Debt Item 7: Duplicate Projects Without Shared Core

**Item Name:** Duplicate Projects Without Shared Core  
**Category:** Architectural Debt  
**Severity:** CRITICAL

**Description:**
The LUNA system consists of two parallel applications (`luna-book-bot` and `Senior-Project-LUNA`) with approximately 40% code duplication. This creates a monolithic structure where shared code is duplicated rather than modularized. The AI generator created two separate projects with identical dependencies, structure, and UI components (49 files each in `src/components/ui/`), with no shared package or documented boundary.

**Evidence:**
- Two parallel apps with ~40% code duplication
- Identical dependencies and structure
- Duplicate UI components (49 files each in `src/components/ui/`)
- Duplicate Supabase clients, hooks, utilities
- No shared package or documented boundary
- Both projects have identical `package.json` dependencies
- Both projects have identical component structures

**Remediation Plan:**
1. **Option A: Monorepo Structure** (Recommended)
   - Set up monorepo using Turborepo, Nx, or pnpm workspaces
   - Create shared packages:
     ```
     packages/
       shared-ui/          # Common UI components
       shared-types/       # Type definitions
       shared-utils/       # Utilities and hooks
       shared-supabase/    # Supabase client and types
       shared-config/      # Shared configuration
     apps/
       student-app/        # luna-book-bot
       librarian-dashboard/ # Senior-Project-LUNA
     ```
   - Shared build pipeline
   - Single source of truth

2. **Option B: Shared Package** (Simpler)
   - Create `packages/shared` with common code
   - Both apps import from shared package
   - Use npm/yarn workspaces

3. **Document Architecture:**
   - Create `docs/ARCHITECTURE.md` explaining project structure
   - Document why two apps exist (if intentional)
   - Define boundaries and shared code policies

4. **Migration Strategy:**
   - Identify duplicate code patterns
   - Extract to shared packages incrementally
   - Update both apps to import from shared packages
   - Remove duplicate code after migration

---

### Technical Debt Item 14: Missing Monitoring & Observability

**Item Name:** Missing Monitoring & Observability  
**Category:** Architectural Debt  
**Severity:** HIGH

**Description:**
The LUNA system completely lacks monitoring and observability tools, making it impossible to gain insights into system health, performance, or errors in production. There is no error tracking, no structured logging, no metrics collection, no distributed tracing, and no alerting system.

**Missing:**
- No Application Performance Monitoring (APM)
- No error tracking (Sentry, Rollbar)
- No structured logging
- No metrics collection
- No distributed tracing
- No alerting system
- No health check endpoints
- No uptime monitoring

**Evidence:**
- No error tracking service integrated
- 13 console.log/error statements in production code (no proper logging)
- No metrics or performance monitoring
- No health check endpoints
- No alerting for critical errors
- No visibility into system performance

**Remediation Plan:**
1. **Add error tracking:**
   - Integrate Sentry or similar error tracking service
   - Track errors with context (user ID, request ID, stack traces)
   - Set up alerts for critical errors
   - Configure error grouping and deduplication

2. **Implement structured logging:**
   ```typescript
   // Use Winston, Pino, or similar
   logger.info('Book request created', {
     requestId: request.id,
     userId: user.id,
     bookId: book.id,
     timestamp: new Date().toISOString()
   });
   ```
   - Replace all console.log/error statements
   - Environment-based logging (dev vs production)
   - Structured logging with context
   - Log levels (debug, info, warn, error)

3. **Add metrics collection:**
   - Use Prometheus for metrics
   - Track request rates, error rates, latency
   - Track database query performance
   - Track user activity metrics
   - Create dashboards (Grafana)
   - Set up alerting thresholds

4. **Implement health checks:**
   ```typescript
   // /api/health endpoint
   GET /api/health
   {
     "status": "healthy",
     "database": "connected",
     "cache": "connected",
     "timestamp": "2025-01-27T..."
   }
   ```
   - Database connectivity check
   - Cache connectivity check
   - External service health checks
   - Uptime monitoring integration

5. **Add distributed tracing:**
   - Implement OpenTelemetry or similar
   - Trace requests across services
   - Identify performance bottlenecks
   - Track request flow through system

6. **Set up alerting:**
   - Alert on critical errors
   - Alert on performance degradation
   - Alert on service downtime
   - Alert on unusual patterns

---

## Part 2: AI & System Risk Assessment

This section identifies critical risks associated with AI-augmented development and agentic workflows in the LUNA system. These risks go beyond standard software risks and specifically address vulnerabilities introduced by AI-augmented development workflows.

### Risk 1: AI Hallucination in Edge Function Security Implementation

**Category:** Reliability/Hallucination  
**Severity:** CRITICAL

**Description:**
The edge function `request-robot-navigation` contains a critical security vulnerability where JWT tokens are decoded without cryptographic verification. This appears to be an AI hallucination—the AI generator likely created a `decodeJwtPayload` function that only base64 decodes the token without verifying the signature, assuming it was sufficient. This creates a severe security vulnerability where attackers could forge JWT tokens.

**Location:** `luna-book-bot/supabase/functions/request-robot-navigation/index.ts:9-19`

**Evidence:**
```typescript
function decodeJwtPayload(token: string): { sub: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])); // Only decodes, doesn't verify
    return payload;
  } catch {
    return null;
  }
}
```

**Impact:**
- Attackers can forge JWT tokens with any `sub` claim
- Unauthorized task/request creation
- Potential privilege escalation
- Complete authentication bypass

**Mitigation:**
1. Replace with proper JWT verification using Supabase's `verifyJWT` or `getUser()` method
2. Add code review process for all AI-generated security code
3. Implement "trust but verify" protocol: All security-related AI code must be manually verified
4. Add security testing to catch such vulnerabilities

---

### Risk 2: Prompt Injection Vulnerability in User Inputs

**Category:** Security & Ethics  
**Severity:** HIGH

**Description:**
The system accepts user inputs (search queries, student names, book requests) without sanitization and passes them directly to database queries and API calls. While Supabase uses parameterized queries (mitigating SQL injection), the lack of input validation creates risks for prompt injection if the system is extended to use LLM-based features, and creates XSS vulnerabilities in the frontend.

**Evidence:**
- Search queries used directly in database queries without sanitization
- User-provided strings (student names) stored and displayed without sanitization
- No input validation or sanitization layer
- Forms accept any input without validation

**Impact:**
- Potential XSS attacks through unvalidated inputs
- Risk of prompt injection if LLM features are added
- Data integrity issues from invalid inputs
- Poor user experience from cryptic errors

**Mitigation:**
1. Implement comprehensive input validation using Zod schemas
2. Sanitize all user inputs before processing
3. Add HTML escaping for displayed user content
4. Implement rate limiting to prevent abuse
5. Establish security review process for all user-facing inputs

---

### Risk 3: Dependency on Lovable.dev and External AI APIs

**Category:** Dependency Risk  
**Severity:** HIGH

**Description:**
The codebase has dependencies on Lovable.dev-specific tools and external AI APIs that may change or become unavailable. The `lovable-tagger` package is used in the build process, and the development workflow depends on Lovable.dev's code generation patterns. Additionally, edge functions use remote imports from CDNs (`deno.land`, `esm.sh`) that could fail or change.

**Evidence:**
- `lovable-tagger` dependency in `package.json` (dev dependency)
- Edge function remote imports: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- Development workflow tied to Lovable.dev patterns
- No fallback mechanisms for external dependencies

**Impact:**
- Build failures if `lovable-tagger` is removed or changes API
- Edge function failures if CDN is unavailable
- Development workflow disruption if Lovable.dev changes
- Deployment failures due to external dependency issues

**Mitigation:**
1. Make `lovable-tagger` optional or remove if not essential
2. Pin edge function dependencies using `deno.json` with locked versions
3. Vendor critical dependencies locally
4. Create fallback mechanisms for external dependencies
5. Document all external dependencies and their alternatives
6. Establish dependency review process: Regularly audit and update dependencies

---

### Risk 4: AI-Generated Code Without Human Verification

**Category:** Reliability/Hallucination  
**Severity:** MEDIUM

**Description:**
The codebase contains AI-generated code that was likely accepted without proper human verification, leading to issues like non-transactional database operations, hardcoded values, and inconsistent patterns. The lack of a "trust but verify" protocol means AI hallucinations and incorrect patterns were integrated into the codebase.

**Evidence:**
- Non-transactional multi-write operations in edge function (orphaned records risk)
- Hardcoded configuration values throughout codebase
- Inconsistent error handling patterns
- Missing input validation
- No test coverage to verify AI-generated code

**Impact:**
- Bugs and security vulnerabilities from unverified AI code
- Technical debt accumulation
- Difficult maintenance
- Potential production failures

**Mitigation:**
1. Establish "trust but verify" protocol: All AI-generated code must be reviewed and tested
2. Implement code review process for AI-generated components
3. Add automated testing to catch AI hallucinations
4. Create guidelines for AI code acceptance criteria
5. Document which code was AI-generated for traceability

---

### Risk 5: Data Leakage Through Error Messages

**Category:** Security & Ethics  
**Severity:** MEDIUM

**Description:**
The system's error handling may leak sensitive information through error messages. Console statements in production code, generic error handling, and lack of error sanitization could expose database structure, API keys, or user data to attackers or in error logs.

**Evidence:**
- 13 console.log/error statements in production code
- Generic error handling that may expose stack traces
- No error sanitization
- Error messages may contain sensitive information

**Impact:**
- Information disclosure through error messages
- Database structure exposure
- Potential API key leakage in logs
- User data exposure in error responses

**Mitigation:**
1. Replace console statements with proper logging service
2. Sanitize all error messages before displaying to users
3. Implement error message filtering to remove sensitive information
4. Use structured logging with context, not raw error objects
5. Establish error handling guidelines to prevent information leakage

---

## Part 3: Backlog Integration

This section documents the operationalization of identified technical debt items into the team's GitHub Project Board.

### Backlog Items Created

The top technical debt items have been converted into GitHub Issues and integrated into the project backlog:

#### Issue #77: Missing Backend Architecture (Item 1)
- **Status:** Created and assigned for review
- **Labels:** `technical-debt`, `refactor`, `critical`, `architecture`, `needs-breakdown`
- **GitHub Issue:** https://github.com/kelejohn/LUNA-senior-project/issues/77
- **Acceptance Criteria:** (AI-assisted refinement)
  - [ ] API structure created with versioning (`/api/v1/*`)
  - [ ] Middleware pipeline implemented (auth, validation, error handling, logging, rate limiting)
  - [ ] Service layer created with repository pattern
  - [ ] Background job processing set up (BullMQ + Redis)
  - [ ] All direct Supabase calls migrated to service layer
  - [ ] Documentation updated with new architecture

#### Issue #76: No Test Infrastructure (Item 2)
- **Status:** Created and assigned for review
- **Labels:** `technical-debt`, `refactor`, `critical`, `testing`, `needs-breakdown`
- **GitHub Issue:** https://github.com/kelejohn/LUNA-senior-project/issues/76
- **Acceptance Criteria:** (AI-assisted refinement)
  - [ ] Vitest + React Testing Library installed and configured
  - [ ] Test scripts added to `package.json`
  - [ ] Unit tests created for hooks and utilities (minimum 70% coverage)
  - [ ] Integration tests created for authentication flow
  - [ ] Integration tests created for book request flow
  - [ ] CI/CD pipeline configured to run tests on PRs
  - [ ] Test coverage reporting set up

#### Issue #79: Duplicate Projects Without Shared Core (Item 7)
- **Status:** Created and assigned for review
- **Labels:** `technical-debt`, `refactor`, `critical`, `architecture`, `needs-breakdown`
- **GitHub Issue:** https://github.com/kelejohn/LUNA-senior-project/issues/79
- **Acceptance Criteria:** (AI-assisted refinement)
  - [ ] Monorepo structure set up (Turborepo/Nx/pnpm workspaces)
  - [ ] Shared packages created (`shared-ui`, `shared-utils`, `shared-supabase`, `shared-types`)
  - [ ] Duplicate code migrated to shared packages
  - [ ] Both apps updated to use shared packages
  - [ ] Duplicate code removed from both projects
  - [ ] Architecture documentation updated

### Backlog Integration Evidence

**GitHub Issues Created:**
- Total issues created from technical debt: 22 issues (#72-#93)
- Top 3 technical debt items converted to issues: #76, #77, #79
- All issues tagged with required labels: `technical-debt` and `refactor` (as per assignment requirements)
- Additional labels applied: `critical`, `architecture`, `testing`, `needs-breakdown`
- Issues include detailed descriptions, acceptance criteria, and remediation plans
- All issues are accessible in the GitHub Project Board

**AI-Aware Refinement:**
- Acceptance criteria for each issue were refined using LLM assistance
- Criteria are specific, measurable, and actionable
- Each criterion includes clear definition of done
- Criteria follow "trust but verify" principles

**Backlog Status:**
- Issues reviewed and categorized by priority
- Readiness assessment completed
- Items requiring breakdown identified and marked
- Architecture/system design items assigned for review

**GitHub Project Board:**
- Issues integrated into project board
- Labels system implemented for categorization
- Status tracking enabled
- Ready for sprint planning

---

## Summary

This Risk & Technical Debt Inventory identifies **2 critical technical debt items** (Items 7 & 14) and **5 critical AI/system risks** in the LUNA codebase. The audit reveals that the AI-generated prototype, while functional, contains significant structural issues that must be addressed before scaling to production:

**Key Findings:**
- **Architectural Debt:** Duplicate projects with 40% code duplication, no shared core
- **Infrastructure Debt:** Complete absence of monitoring and observability tools
- **AI Risks:** Security vulnerabilities from AI hallucinations, dependency risks, lack of verification protocols

**Action Items:**
- Top technical debt items converted to GitHub Issues (#76, #77, #79)
- All items tagged and integrated into project backlog
- Acceptance criteria refined using AI-assisted refinement
- Items assigned for architectural review and breakdown

**Next Steps:**
1. Break down large items into actionable sub-issues
2. Prioritize items for sprint planning
3. Establish "trust but verify" protocols for AI-generated code
4. Begin remediation of critical security vulnerabilities
5. Set up monitoring infrastructure as foundation for observability

---

**Prepared by:** Sarah Cole  
**Date:** February 3, 2025  
**Repository:** https://github.com/kelejohn/LUNA-senior-project
