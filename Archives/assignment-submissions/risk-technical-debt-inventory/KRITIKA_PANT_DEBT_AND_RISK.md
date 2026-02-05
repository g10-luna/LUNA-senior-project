# Risk & Technical Debt Inventory
## LUNA Senior Project - Individual Submission

**Name:** Kritika Pant  
**Date:** February 3, 2025  
**Module:** Senior Project II Reset: From Prototypes to Products

---

## Part 1: The Technical Debt Audit

This section identifies significant areas of technical debt in the LUNA codebase, classified by category with detailed descriptions and remediation plans. The audit was performed using Cursor to scan the repository and verify AI-generated code against production standards (VIBE Coding Principles: **Verify**).

**Analysis Method:** Used Cursor AI to analyze the codebase, identify patterns, and verify AI-generated code for structural issues, security vulnerabilities, and maintainability concerns.

### Technical Debt Item 11: Inconsistent Domain Types

**Item Name:** Inconsistent Domain Types  
**Category:** Architectural Debt  
**Severity:** HIGH

**Description:**
The LUNA system suffers from inconsistent domain type definitions across the codebase. The same types are defined in multiple locations, leading to type drift, inconsistencies, and maintenance challenges. The `Book` interface is defined in 4+ different places, and types are not using Supabase-generated types as the source of truth.

**Evidence:**
- `Book` interface defined in 4+ places:
  - `luna-book-bot/src/components/BookSearchResults.tsx:9-18`
  - `Senior-Project-LUNA/src/components/LibraryCatalog.tsx:28-37`
  - `Senior-Project-LUNA/src/components/BookRequestForm.tsx:10-17`
  - `luna-book-bot/src/pages/Index.tsx:19-26` (BookRequest)
- Types drift over time, causing inconsistencies
- Not using Supabase-generated types as source of truth
- Duplicate type definitions across both projects
- No centralized type definitions

**Impact:**
- Type safety issues: Inconsistent types lead to runtime errors
- Maintenance burden: Changes must be made in multiple places
- Bugs: Type drift causes mismatches between frontend and database
- Difficult refactoring: No single source of truth for types

**Remediation Plan:**
1. **Consolidate into shared types:**
   ```
   src/types/
     index.ts           # Re-export all types
     book.types.ts      # Book-related types
     request.types.ts    # Request-related types
     database.types.ts  # Supabase-generated types
   ```

2. **Use Supabase types as source of truth:**
   ```typescript
   import type { Database } from '@/integrations/supabase/types';
   type Book = Database['public']['Tables']['books']['Row'];
   ```

3. **Create type utilities:**
   ```typescript
   // types/book.types.ts
   export type Book = Database['public']['Tables']['books']['Row'];
   export type BookInsert = Database['public']['Tables']['books']['Insert'];
   export type BookUpdate = Database['public']['Tables']['books']['Update'];
   ```

4. **Migration strategy:**
   - Identify all duplicate type definitions
   - Create centralized type definitions
   - Update all imports to use centralized types
   - Remove duplicate type definitions
   - Add TypeScript path aliases for easier imports

5. **Establish type governance:**
   - Document type definitions in shared location
   - Use Supabase-generated types as base
   - Create derived types only when necessary
   - Regular audits to prevent type drift

---

### Technical Debt Item 13: Inconsistent Error Handling

**Item Name:** Inconsistent Error Handling  
**Category:** Architectural Debt  
**Severity:** HIGH

**Description:**
The LUNA system has inconsistent error handling patterns across the codebase, making it difficult to debug issues and provide a good user experience when errors occur. The system uses mixed patterns (some try-catch, some error checking only), has console statements in production code, lacks React Error Boundaries, and has no centralized error handling.

**Evidence:**
- Mixed patterns: some try-catch, some error checking only
- 13 console.log/error statements in production code
- No React Error Boundaries
- Missing error recovery mechanisms
- Generic error messages
- No centralized error handling service
- Inconsistent error response formats

**Impact:**
- Poor user experience: Users see cryptic or unhelpful error messages
- Difficult debugging: No structured error logging or tracking
- No error recovery: Errors cause complete failures instead of graceful degradation
- Maintenance burden: Inconsistent patterns make it hard to fix errors
- Security risk: Error messages may leak sensitive information

**Remediation Plan:**
1. **Implement Error Boundaries:**
   ```typescript
   // components/ErrorBoundary.tsx
   class ErrorBoundary extends React.Component {
     state = { hasError: false, error: null };
     
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
     
     componentDidCatch(error, errorInfo) {
       logger.error('React Error Boundary caught error', { error, errorInfo });
     }
     
     render() {
       if (this.state.hasError) {
         return <ErrorFallback error={this.state.error} />;
       }
       return this.props.children;
     }
   }
   ```

2. **Replace console statements:**
   - Implement proper logging service (Sentry, LogRocket, or custom)
   - Environment-based logging (dev vs production)
   - Structured logging with context
   - Remove all console.log/error statements from production code

3. **Standardize error handling:**
   - Create error handling utilities
   - Consistent error message format
   - User-friendly error messages
   - Error codes for tracking
   - Error type hierarchy (NetworkError, ValidationError, etc.)

4. **Add error recovery:**
   - Implement retry logic for transient errors
   - Fallback mechanisms for failed operations
   - Error state management
   - Graceful degradation

5. **Integrate error tracking:**
   - Set up Sentry or similar error tracking service
   - Track errors with context (user ID, request ID, stack traces)
   - Set up alerts for critical errors
   - Create error dashboards

6. **Create error handling guidelines:**
   - Document error handling patterns
   - Establish error message standards
   - Create error handling examples
   - Code review checklist for error handling

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

#### Issue #79: Duplicate Projects Without Shared Core (Item 3)
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

This Risk & Technical Debt Inventory identifies **2 high-priority technical debt items** (Items 11 & 13) and **5 critical AI/system risks** in the LUNA codebase. The audit reveals that the AI-generated prototype, while functional, contains significant structural issues that must be addressed before scaling to production:

**Key Findings:**
- **Architectural Debt:** Inconsistent domain types across codebase, no single source of truth
- **Code Quality Debt:** Inconsistent error handling patterns, no centralized error management
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
5. Consolidate types and standardize error handling as foundation

---

**Prepared by:** Kritika Pant  
**Date:** February 3, 2025  
**Repository:** https://github.com/kelejohn/LUNA-senior-project
