# Assignment: Risk & Technical Debt Inventory
## Module: 1 – Senior Project II Reset: From Prototypes to Products

**Due Date:** Tuesday, 01/27/2026  
**Submission Format:** GitHub Repository Markdown Document (`DEBT_AND_RISK.md` - Team submission by Scrum Masters) + PDF (individual submissions)

---

## Overview & Objective

In the first semester, your team successfully built a working prototype using Lovable.dev. As we transition into Senior Project II, your role shifts from "feature builder" to "system orchestrator".

To move from a prototype to a production-quality system, you must first understand the structural limitations of your current codebase. This assignment requires your team to perform a deep architectural audit of your existing project to identify Technical Debt (shortcuts taken by you or the AI generators) and Project Risks (vulnerabilities in your agentic workflow or security).

---

## From Prototypes to Production Systems

Welcome to Senior Capstone II. In the first semester, we successfully utilized tools like Lovable.dev to rapidly generate working prototypes. However, speed often comes at the cost of structural integrity. To transition from being "feature builders" to "system orchestrators," we must acknowledge that our current codebases likely contain significant shortcuts—what we call Technical Debt. This assignment is our "Project Reset," where we pause to audit the structural health of our application before attempting to scale it. Without this audit, building atop the current foundation may lead to unmaintainable "spaghetti code" that creates failures later in the semester.

AI generators optimize for immediate visual output, often neglecting long-term maintainability. Your audit should identify where the AI created monolithic structures, hardcoded logic, or lacked clear API boundaries. By documenting these issues now—such as lack of testing or messy documentation—we can convert them into actionable backlog items. This process is crucial for applying VIBE coding principles (Verify, Improve, Build, Execute), ensuring that we are not just accepting AI output blindly but actively verifying and refining it to meet production standards.

---

## Understanding Agentic Risk

Beyond standard code quality, we are now operating in an agentic workflow, which introduces unique project risks that must be documented. Unlike traditional software risks, we must assess where our AI agents (acting as Planners or Coders) might hallucinate code, introduce security vulnerabilities like prompt injection, or create dependencies on external APIs that could change. Identifying these risks early allows us to establish "trust boundaries," ensuring that humans remain in the loop to supervise the AI collaborators effectively. This inventory will serve as the roadmap for our architectural refactoring and security planning for the rest of the semester.

---

## Instructions

### Part 1: The Technical Debt Audit

Analyze your current Lovable.dev-generated codebase. You are encouraged to use Cursor or Google Antigravity to scan your repository and assist in this reasoning process.

Identify at least **5 significant areas of technical debt**. For each item, classify it under one of the following categories:

- **Architectural Debt:** Is the code a monolith? Does it lack clear API boundaries or modularization?
- **Test Debt:** Does the code lack unit or integration tests? Is there a lack of "trust but verify" protocols for AI-generated components?
- **Documentation Debt:** Is the AI-generated code difficult for a human to read or maintain? Is traceability back to the original Agile requirement missing?

**Deliverable Format for Part 1:**

```
Item Name: (e.g., "Hardcoded Authentication Logic")
Category: Architectural Debt
Description: The prototype uses a hardcoded user session for demo purposes.
Remediation Plan: Refactor into a modular auth service using Supabase/Firebase.
```

### Part 2: AI & System Risk Assessment

Because we are building agentic systems, your risk assessment must go beyond standard software delays. You must consider the specific risks associated with AI-augmented development.

Identify at least **3 critical risks** in the following areas:

- **Reliability/Hallucination:** Where might the AI agents (Planner/Coder) fail or hallucinate code that introduces bugs?
- **Security & Ethics:** Are there risks of prompt injection, data leakage, or bias in how your application processes user data?
- **Dependency Risk:** Reliance on specific Lovable.dev interfaces or external AI APIs that may change.

### Part 3: Backlog Integration

Once you have identified your debt and risks, you must operationalize them.

1. Navigate to your team's GitHub Project Board.
2. Convert your top 3 Technical Debt items into new Backlog Items (Issues).
3. Tag these issues with a label such as `technical-debt` or `refactor`.
4. Apply AI-Aware Refinement to these new items by using an LLM to help draft the acceptance criteria for fixing them.

---

## Grading Criteria

This assignment contributes to the **Architecture & Refactoring** portion of your final grade (20%).

- **Depth of Analysis (40%):** Does the team demonstrate a deep understanding of why the current code is not yet production-ready?
- **VIBE Coding Principles (30%):** Did the team use "Verification" to identify flaws in the AI-generated prototype?
- **Actionability (30%):** Are the remediation plans specific? Have the items been successfully added to the GitHub Project Board?

---

## VIBE Coding Principles

**Verify:** Actively verify AI-generated code for correctness, security, and maintainability  
**Improve:** Refine and improve AI output to meet production standards  
**Build:** Construct features on a solid, verified foundation  
**Execute:** Deploy and monitor with confidence in the codebase quality

---

## Submission Requirements

### Team Submission (Scrum Master)
- **File:** `DEBT_AND_RISK.md` in the repository root or `assignment-submissions/risk-technical-debt-inventory/`
- **Content:** Complete technical debt audit and risk assessment
- **Format:** Markdown document with all three parts completed

### Individual Submissions
- **Format:** PDF
- **Content:** Individual analysis and contribution to the team assessment
- **Due:** Same date as team submission

---

## Notes

- Use Cursor, Google Antigravity, or similar tools to assist in codebase analysis
- Focus on structural issues that will impact scalability and maintainability
- Consider both traditional technical debt and AI-specific risks
- Ensure all identified items are actionable and have clear remediation paths
- Integrate findings into the team's GitHub Project Board for tracking
