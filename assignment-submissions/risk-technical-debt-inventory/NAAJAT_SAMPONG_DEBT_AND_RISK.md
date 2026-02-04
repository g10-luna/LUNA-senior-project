# Risk & Technical Debt Inventory
## LUNA Senior Project - Individual Submission

**Name:** Najaat Sampong  
**Date:** February 3, 2025  
**Module:** Senior Project II Reset: From Prototypes to Products

---

## Part 1: The Technical Debt Audit

This section identifies significant areas of technical debt in the LUNA codebase, classified by category with detailed descriptions and remediation plans. The audit was performed using Cursor to scan the repository and verify AI-generated code against production standards (VIBE Coding Principles: **Verify**).

**Analysis Method:** Used Cursor AI to analyze the codebase, identify patterns, and verify AI-generated code for structural issues, security vulnerabilities, and maintainability concerns.

### Technical Debt Item 18: Hardcoded Configuration Values

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
- Configuration values mixed with business logic
- No environment-specific configuration
- Difficult to change without code modifications

**Impact:**
- Inflexibility: Cannot adjust configuration without code changes
- Difficult environment-specific configuration: Same values for dev/staging/prod
- Maintenance burden: Configuration scattered across multiple files
- Testing challenges: Hard to test with different configurations
- Deployment issues: Cannot easily adjust for different environments

**Remediation Plan:**
1. **Extract to configuration file:**
   ```typescript
   // config/constants.ts
   export const CONFIG = {
     requestProcessing: {
       minDelay: 5000,
       maxDelay: 35000,
     },
     pickupHours: {
       weekdays: '8:00 AM - 6:00 PM',
       saturday: '9:00 AM - 4:00 PM',
     },
     robot: {
       locations: ['A1', 'B2', 'C3', 'D4'],
       statusCheckInterval: 5000,
       batteryCheckInterval: 10000,
     },
     maintenance: {
       healthMetrics: {
         battery: { min: 20, max: 100 },
         speed: { min: 0.5, max: 2.0 },
         // ... other metrics
       }
     }
   };
   ```

2. **Use environment variables** for environment-specific values:
   ```typescript
   // config/env.ts
   export const ENV = {
     isDevelopment: import.meta.env.DEV,
     isProduction: import.meta.env.PROD,
     apiUrl: import.meta.env.VITE_API_URL,
     timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
   };
   ```

3. **Create configuration validation** using Zod:
   ```typescript
   import { z } from 'zod';
   
   const ConfigSchema = z.object({
     requestProcessing: z.object({
       minDelay: z.number().min(0),
       maxDelay: z.number().min(0),
     }),
     // ... other config schemas
   });
   
   export const CONFIG = ConfigSchema.parse(rawConfig);
   ```

4. **Update all components** to use configuration instead of hardcoded values:
   ```typescript
   // Before
   const delay = Math.random() * 30000 + 5000;
   
   // After
   import { CONFIG } from '@/config/constants';
   const delay = Math.random() * (CONFIG.requestProcessing.maxDelay - CONFIG.requestProcessing.minDelay) + CONFIG.requestProcessing.minDelay;
   ```

5. **Document all configuration values** in `.env.example`:
   ```env
   # Request Processing
   VITE_REQUEST_TIMEOUT=30000
   VITE_MIN_PROCESSING_DELAY=5000
   VITE_MAX_PROCESSING_DELAY=35000
   
   # Pickup Hours
   VITE_PICKUP_WEEKDAYS=8:00 AM - 6:00 PM
   VITE_PICKUP_SATURDAY=9:00 AM - 4:00 PM
   ```

---

### Technical Debt Item 20: Missing Input Validation

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
- Forms accept any input without validation
- Search queries used directly in database queries
- API endpoints accept unvalidated request bodies

**Impact:**
- Security vulnerabilities: Potential XSS, injection attacks
- Data integrity issues: Invalid data stored in database
- Poor user experience: Cryptic errors from invalid inputs
- API abuse: No protection against malformed requests
- Maintenance burden: Difficult to debug issues from invalid inputs

**Remediation Plan:**
1. **Add form validation:**
   - Use Zod schemas for validation
   - Integrate with react-hook-form
   - Client-side and server-side validation
   ```typescript
   import { z } from 'zod';
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   
   const BookRequestSchema = z.object({
     studentName: z.string().min(1, 'Name is required').max(100),
     bookTitle: z.string().min(1, 'Book title is required'),
     isbn: z.string().regex(/^\d{13}$/, 'Invalid ISBN format'),
   });
   
   const form = useForm({
     resolver: zodResolver(BookRequestSchema),
   });
   ```

2. **Sanitize inputs:**
   - Sanitize search queries
   - Validate and sanitize API inputs
   - Use parameterized queries (Supabase handles this, but validate inputs)
   ```typescript
   // Sanitize search query
   const sanitizeSearchQuery = (query: string): string => {
     return query.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
   };
   
   // Validate API request body
   const validateRequest = (body: unknown) => {
     return BookRequestSchema.parse(body);
   };
   ```

3. **Add rate limiting:**
   - Implement rate limiting in edge functions
   - Add request throttling on client side
   ```typescript
   // middleware/rateLimiter.ts
   import rateLimit from 'express-rate-limit';
   
   export const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

4. **Create validation middleware** for API endpoints:
   ```typescript
   // middleware/validation.ts
   export const validateRequest = (schema: z.ZodSchema) => {
     return async (req: Request, res: Response, next: NextFunction) => {
       try {
         req.body = schema.parse(req.body);
         next();
       } catch (error) {
         res.status(400).json({ error: 'Validation failed', details: error });
       }
     };
   };
   ```

5. **Add client-side and server-side validation:**
   - Client-side: Immediate feedback for users
   - Server-side: Security and data integrity
   - Consistent validation rules across both

6. **Create validation utilities:**
   ```typescript
   // utils/validation.ts
   export const validateEmail = (email: string): boolean => {
     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   };
   
   export const validateISBN = (isbn: string): boolean => {
     return /^\d{13}$/.test(isbn);
   };
   ```

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

This Risk & Technical Debt Inventory identifies **2 medium-priority technical debt items** (Items 18 & 20) and **5 critical AI/system risks** in the LUNA codebase. The audit reveals that the AI-generated prototype, while functional, contains significant structural issues that must be addressed before scaling to production:

**Key Findings:**
- **Configuration Debt:** Hardcoded configuration values scattered throughout codebase, no environment-specific configuration
- **Security/Code Quality Debt:** Missing input validation, no form validation, no sanitization
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
5. Extract configuration and implement input validation as foundation

---

**Prepared by:** Najaat Sampong  
**Date:** February 3, 2025  
**Repository:** https://github.com/kelejohn/LUNA-senior-project
