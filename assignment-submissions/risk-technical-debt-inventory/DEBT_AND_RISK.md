# Risk & Technical Debt Inventory
## LUNA Senior Project

**Team:** LUNA Senior Project Team  
**Scrum Master:** Isaac Adjei  
**Date:** February 3, 2025  
**Module:** Senior Project II Reset: From Prototypes to Products

---

## Part 1: The Technical Debt Audit

This section identifies significant areas of technical debt in the LUNA codebase, classified by category with detailed descriptions and remediation plans.

### Technical Debt Item 1: Missing Backend Architecture

**Item Name:** Missing Backend Architecture  
**Category:** Architectural Debt  
**Severity:** CRITICAL

**Description:**
The LUNA system lacks proper backend architecture, making it not scalable and difficult to maintain. The current implementation has:
- No proper API layer (single edge function, all business logic in frontend)
- No middleware pipeline (no request validation, authentication, error handling, logging, rate limiting)
- No background job processing (no job queue system, scheduled tasks, or async task processing)
- No service layer architecture (direct Supabase calls from components, business logic mixed with UI code)

The prototype was built with a frontend-heavy architecture where React components directly query the Supabase database, with only one edge function (`request-robot-navigation`) handling server-side operations. This monolithic approach lacks clear API boundaries and modularization.

**Evidence:**
- `luna-book-bot/src/pages/Index.tsx:137-159` - Direct Supabase queries in component
- `Senior-Project-LUNA/src/components/LibraryCatalog.tsx:59-135` - Direct CRUD operations
- `luna-book-bot/supabase/functions/request-robot-navigation/index.ts` - Only edge function

**Remediation Plan:**
1. Create proper backend API structure with versioning (`/api/v1/books`, `/api/v1/requests`)
2. Implement middleware pipeline (authentication, validation, error handling, logging, rate limiting)
3. Add background job processing (BullMQ with Redis for async tasks)
4. Implement service layer with repository pattern for data access
5. Extract business logic from React components into service layer

---

### Technical Debt Item 2: No Test Infrastructure

**Item Name:** No Test Infrastructure  
**Category:** Test Debt  
**Severity:** CRITICAL

**Description:**
The codebase completely lacks test infrastructure, with no unit tests, integration tests, or test coverage tools. There is no "trust but verify" protocol for AI-generated components. The prototype was built without any testing framework, making it impossible to verify AI-generated code correctness or catch regressions.

**Evidence:**
- No test files (`*.test.*`, `*.spec.*`) found in codebase
- No test scripts in `package.json`
- No testing dependencies (Vitest, Jest, React Testing Library)
- No test coverage tools
- No CI/CD pipeline for automated testing

**Remediation Plan:**
1. Add Vitest + React Testing Library for testing framework
2. Start with critical paths: unit tests for hooks/utilities, integration tests for authentication flow, integration tests for book request flow
3. Set coverage targets: Minimum 70% for critical paths
4. Add CI/CD: Run tests on every PR
5. Establish "trust but verify" protocols: All AI-generated components must have tests before acceptance

---

### Technical Debt Item 3: Duplicate Projects Without Shared Core

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

**Remediation Plan:**
1. Set up monorepo structure using Turborepo, Nx, or pnpm workspaces
2. Create shared packages: `shared-ui`, `shared-types`, `shared-utils`, `shared-supabase`
3. Migrate duplicate code to shared packages
4. Update both apps to import from shared packages
5. Document architecture explaining project structure and boundaries

---

### Technical Debt Item 4: Generic/Thin Documentation

**Item Name:** Generic/Thin Documentation  
**Category:** Documentation Debt  
**Severity:** HIGH

**Description:**
The AI-generated codebase has generic, boilerplate documentation that lacks traceability back to original Agile requirements. Both README files are Lovable boilerplate templates with no project-specific documentation. There is no architecture documentation, no setup instructions beyond `npm i`, and no feature documentation. The code itself lacks meaningful comments or documentation, making it difficult for humans to read or maintain.

**Evidence:**
- Both READMEs are Lovable boilerplate templates
- No project-specific documentation
- No architecture documentation
- No setup instructions beyond `npm i`
- No feature documentation
- No traceability to Agile requirements

**Remediation Plan:**
1. Update READMEs with project purpose, architecture overview, setup instructions
2. Create comprehensive documentation structure (`docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/REQUIREMENTS.md`)
3. Add code documentation (JSDoc comments for public APIs, component documentation)
4. Establish traceability: Link code to original Agile requirements
5. Document AI-generated components: Mark which components were AI-generated and their purpose

---

### Technical Debt Item 5: Inconsistent Error Handling

**Item Name:** Inconsistent Error Handling  
**Category:** Architectural Debt  
**Severity:** HIGH

**Description:**
The codebase has inconsistent error handling patterns, with mixed approaches (some try-catch, some error checking only), 13 console.log/error statements in production code, and no React Error Boundaries. The AI generator created inconsistent patterns across different components, making it difficult to maintain and debug. There is no centralized error handling or error recovery mechanisms.

**Evidence:**
- Mixed patterns: some try-catch, some error checking only
- 13 console.log/error statements in production code
- No React Error Boundaries
- Missing error recovery mechanisms
- Generic error messages

**Remediation Plan:**
1. Implement Error Boundaries to catch React component errors
2. Replace console statements with proper logging service (Sentry, LogRocket, or custom)
3. Standardize error handling: Create error handling utilities, consistent error message format, user-friendly error messages
4. Add error recovery: Implement retry logic, fallback mechanisms, error state management
5. Integrate error tracking: Set up Sentry or similar error tracking service

---

### Technical Debt Item 6: Hardcoded Configuration Values

**Item Name:** Hardcoded Configuration Values  
**Category:** Architectural Debt  
**Severity:** MEDIUM

**Description:**
The codebase contains numerous hardcoded configuration values scattered throughout components, making it inflexible and difficult to adjust for different environments. The AI generator embedded configuration directly in business logic rather than extracting it to a configuration layer.

**Evidence:**
- `Index.tsx:117, 123` - Hardcoded timeouts (5-35s, 10-30s)
- `Dashboard.tsx:47-53` - Hardcoded locations array
- `Dashboard.tsx:59, 87, 92` - Hardcoded interval timings
- `Index.tsx:563-564` - Hardcoded pickup hours
- `Maintenance.tsx:10-82` - Hardcoded health metrics

**Remediation Plan:**
1. Extract to configuration file (`config/constants.ts`)
2. Use environment variables for environment-specific values
3. Create configuration validation using Zod
4. Update all components to use configuration instead of hardcoded values
5. Document all configuration values in `.env.example`

---

### Technical Debt Item 7: Missing Input Validation

**Item Name:** Missing Input Validation  
**Category:** Architectural Debt  
**Severity:** MEDIUM

**Description:**
The system lacks comprehensive input validation, with no form validation, no search query sanitization, and no API request body validation. The AI generator created forms and API endpoints without proper validation, creating potential security vulnerabilities and data integrity issues.

**Evidence:**
- No validation for user inputs in forms
- No sanitization of search queries
- Missing validation for API request bodies
- No rate limiting

**Remediation Plan:**
1. Add form validation using Zod schemas with react-hook-form
2. Sanitize inputs: Sanitize search queries, validate and sanitize API inputs
3. Add rate limiting: Implement rate limiting in edge functions, add request throttling on client side
4. Create validation middleware for API endpoints
5. Add client-side and server-side validation

---

## Part 2: AI & System Risk Assessment

This section identifies critical risks associated with AI-augmented development and agentic workflows in the LUNA system.

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
- **Labels:** `critical`, `architecture`, `needs-breakdown`
- **Acceptance Criteria:** (AI-assisted refinement)
  - [ ] API structure created with versioning (`/api/v1/*`)
  - [ ] Middleware pipeline implemented (auth, validation, error handling, logging, rate limiting)
  - [ ] Service layer created with repository pattern
  - [ ] Background job processing set up (BullMQ + Redis)
  - [ ] All direct Supabase calls migrated to service layer
  - [ ] Documentation updated with new architecture

#### Issue #76: No Test Infrastructure (Item 2)
- **Status:** Created and assigned for review
- **Labels:** `critical`, `testing`, `needs-breakdown`
- **Acceptance Criteria:** (AI-assisted refinement)
  - [ ] Vitest + React Testing Library installed and configured
  - [ ] Test scripts added to `package.json`
  - [ ] Unit tests created for hooks and utilities (minimum 70% coverage)
  - [ ] Integration tests created for authentication flow
  - [ ] Integration tests created for book request flow
  - [ ] CI/CD pipeline configured to run tests on PRs
  - [ ] Test coverage reporting set up

#### Issue #79: Duplicate Projects Without Shared Core (Item 3)
- **Status:** Created and assigned for review
- **Labels:** `critical`, `architecture`, `needs-breakdown`
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
- All issues tagged with appropriate labels (`critical`, `architecture`, `testing`, etc.)
- Issues include detailed descriptions, acceptance criteria, and remediation plans

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

This Risk & Technical Debt Inventory identifies **7 significant technical debt items** and **5 critical AI/system risks** in the LUNA codebase. The audit reveals that the AI-generated prototype, while functional, contains significant structural issues that must be addressed before scaling to production:

**Key Findings:**
- **Architectural Debt:** Missing backend architecture, code duplication, inconsistent patterns
- **Test Debt:** Complete absence of test infrastructure
- **Documentation Debt:** Generic boilerplate documentation without traceability
- **AI Risks:** Security vulnerabilities from AI hallucinations, dependency risks, lack of verification protocols

**Action Items:**
- Top 3 technical debt items converted to GitHub Issues (#76, #77, #79)
- All items tagged and integrated into project backlog
- Acceptance criteria refined using AI-assisted refinement
- Items assigned for architectural review and breakdown

**Next Steps:**
1. Break down large items into actionable sub-issues
2. Prioritize items for sprint planning
3. Establish "trust but verify" protocols for AI-generated code
4. Begin remediation of critical security vulnerabilities
5. Set up test infrastructure as foundation for verification

---

**Prepared by:** Isaac Adjei (Scrum Master)  
**Date:** February 3, 2025  
**Repository:** https://github.com/kelejohn/LUNA-senior-project
