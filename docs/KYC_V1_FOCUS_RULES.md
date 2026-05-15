# KYC v1 Focus Rules

**Purpose:** Prevent scope creep during Sessions 4-6. The spec tells you *what* to build. This document tells you *what NOT to build* and *when to stop*.

**Read this at the start of every session before opening Claude Code.**

---

## The single goal

**Ship KYC v1 in 2-3 sessions so a paying-tier merchant can complete onboarding end-to-end without manual intervention from Paul.**

That's it. Every decision during the build should serve this goal.

If a question is "does this serve merchant #2 being able to onboard?" and the answer is no — defer it.

---

## What "done" looks like

KYC v1 is complete when ALL of these are true:

1. A paying-tier merchant (Starter or Pro) can navigate to `/settings/payments`, click Card 2, walk through 5 steps, upload a photo, and submit
2. Paul receives an email notification when a submission lands
3. Paul can run `./scripts/kyc/list-pending.sh` and see the queue
4. Paul can run `./scripts/kyc/review.sh <id>` and see all submission details + signed photo URL
5. Paul can run `./scripts/kyc/approve.sh <id>` or `./scripts/kyc/reject.sh <id> <category>` and the merchant sees the right state on Card 2
6. After approval + manual Paystack dashboard verification, the merchant can take real payments via F3
7. Free-tier merchants see Card 1 and Card 2 in `tier_locked` state with upgrade CTA
8. Paul has tested every state transition manually at least once

**Not in "done":**
- Beautiful animations
- Edge case polish beyond what section 10 of the spec covers
- Performance optimization
- The reviewer web page
- Smile Identity integration
- Any other deferred feature

---

## Hard stop list

**When any of these questions come up during the build, the answer is automatically NO. Don't build it. File a TODO instead.**

- "Should I also add Smile Identity automated verification?" → NO. (Deferred to v2.)
- "Should I build the merchant-facing velocity increase request form?" → NO. (Deferred to Phase 2.)
- "Should the reviewer have a web page?" → NO. (Bash scripts for Phase 1.)
- "Should I automate the Paystack verify-subaccount API call?" → NO. (Manual dashboard click for Phase 1.)
- "Should I add SMS phone verification?" → NO. (Deferred to v1.5.)
- "Should I add Claude-assisted photo analysis?" → NO. (Deferred to v1.5.)
- "Should I add additional reviewer roles or audit trails?" → NO. (Phase 2.)
- "Should I add cross-merchant BVN/NIN duplicate detection?" → NO. (Phase 2.)
- "Should I redesign the wizard look/feel?" → NO. (Match existing bank-setup wizard styling.)
- "Should I refactor unrelated code I noticed?" → NO. (File TODO, leave it.)
- "Should I add liveness detection?" → NO. (v2.)
- "Should I let the reviewer have a mobile-friendly view?" → NO. (Phase 2.)
- "Should I write a TOS or privacy policy update?" → NO. (Lawyer consult task, not engineering task.)

**The pattern:** if your brain says "while we're here, we should also...", the answer is almost always no. File the TODO. Move on.

---

## Decision checkpoints

After each section of the spec's section 12 implementation order, **stop and ask:**

1. Did I build exactly what the spec said?
2. Did I add anything not in the spec?
3. If yes — was it strictly necessary to make this section work, or was it scope creep?
4. If scope creep — can I remove it now, or file it as a TODO and remove it later?

These questions are how you stay honest with yourself mid-build. They take 60 seconds and save hours.

---

## When tempted to expand scope

| Temptation | Right answer |
|---|---|
| "I noticed an unrelated bug" | File TODO comment. Move on. |
| "I should refactor X to be cleaner" | Only if it's blocking the current task. Otherwise TODO. |
| "Just one more field would be nice" | Re-read section 2.7 of the spec. The fields are locked. |
| "Let me also automate this manual step" | Phase 2. File TODO. |
| "The reviewer experience could be better" | Phase 2. File TODO. |
| "This would look nicer with a different layout" | Match existing wizard. Don't redesign. |
| "Let me add some defensive checks" | Only if they prevent a crash. Otherwise TODO. |
| "Let me make this more flexible for the future" | YAGNI. Build for known requirements only. |
| "I should write tests for this" | Only the manual tests in section 10. Automated test infrastructure is its own session. |

**The mental rule:** write the TODO down, take a breath, return to the spec.

---

## When you genuinely don't know what to do

The spec has an Open Questions section (14). If a question comes up during the build that genuinely blocks progress, look there first. If it's an open question, the spec author (you, past-Paul) deliberately deferred it.

Three valid responses:
1. **Pick the simpler answer and file a TODO** for revisiting (preferred)
2. **Stop the session and discuss in chat** (only if it's truly blocking)
3. **Skip the affected section and move on** to another part of the spec

What's NOT a valid response: spending 30 minutes spec'ing the answer mid-build. That's a separate session.

---

## Session structure

**Start of every session:**
1. Read this document (5 min)
2. Read the spec section you're working on (5 min)
3. Open Claude Code with: "Read CLAUDE.md and docs/KYC_V1_SPEC.md. Today we're building section X of the spec. Don't add anything not in the spec without checking with me first."
4. Begin

**Middle of session:**
- Stop every ~45 min and ask the decision checkpoint questions
- If you've added anything not in the spec, evaluate honestly

**End of every session:**
- Write one line in a session log: "Today I worked on section X. It moves us [closer/not closer] to merchant #2 onboarding because [reason]."
- If "not closer" — that's a signal. Look at what you actually built vs what the spec asked for.

---

## Anti-patterns to watch for

These are the patterns where you (specifically you, Paul, per your handoff doc) tend to lose focus:

### Anti-pattern 1: "While I'm in this file, let me also..."

You're editing F3 to add the tier guard. You notice the variable naming is a bit inconsistent. You start cleaning it up. 90 minutes later, you've refactored F3 and lost track of why you were there.

**Counter:** Add a comment `// TODO: variable naming cleanup` and leave it.

### Anti-pattern 2: "We should also support X edge case"

You're implementing the rejection flow. You realize a merchant might have changed phone numbers between submission and rejection. You start thinking about how to handle that. 

**Counter:** Re-read section 6.4. The spec already decided edit rules. Don't relitigate.

### Anti-pattern 3: "Let me make sure this is future-proof"

You're writing the reviewer bash scripts. You start thinking "what if we have 100 reviewers eventually" and design a flexible config system.

**Counter:** Section 11 of the spec lists what's deferred. Future-proofing is Phase 2's job, not v1's.

### Anti-pattern 4: "This is taking too long, let me automate"

You're manually testing state transitions. You think "I should write a test suite for this." 

**Counter:** Section 10's manual tests are sufficient for v1. Automated test infrastructure is its own session, not a bonus.

### Anti-pattern 5: The Bumpa rabbit hole

You're thinking about marketing copy. You start comparing to Bumpa. You start researching pricing strategies. You start writing landing page content.

**Counter:** Marketing is a different task than KYC engineering. Stop. Save thoughts in a notes file. Return to the spec.

### Anti-pattern 6: The "smart product idea" detour

You're walking through the wizard. You think "wouldn't it be smart if merchants could save progress and continue later?"

**Counter:** Yes, it would be. File TODO. Don't build it now.

---

## Critical reminder

**You explicitly said in your handoff doc:**

> *"I tend to expand infrastructure scope instead of pitching real merchants."*

You said this about yourself. You know this is your pattern.

Tonight during spec writing, this pattern emerged at least four times — velocity request flow, hybrid Model C, Bumpa comparison, and the request UI debate. Each time you pulled back, which is good. But it shows the pull is real.

**The spec exists because we decided what to build last night while clear-headed. Trust past-you. Build the spec. Don't relitigate.**

If you find yourself relitigating, that IS the pattern. Recognize it, write the TODO, return to the spec.

---

## Emergency reset

If you ever feel lost during a session and don't know what to do next:

1. Stop typing
2. Open `docs/KYC_V1_SPEC.md`
3. Find section 12 (Implementation Order)
4. Identify which step you were on
5. Ask: "what's the NEXT smallest thing the spec says to do?"
6. Do that thing
7. Don't think further ahead

This is the unsticking move. It works.

---

## What success at the end of v1 looks like

- 12-15 commits on `feat/kyc-wizard-v1` branch
- All in service of section 12's implementation order
- Manual test report showing all states work
- Updated CLAUDE.md
- `docs/REVIEWER_CHECKLIST.md` written
- A merge-ready PR

**What success does NOT look like:**

- "We also built X and Y while we were there"
- "We refactored Z to be cleaner"
- "We started Smile Identity"
- "We added some bonus features"

If your PR includes anything from the second list — the focus rules failed. Don't merge until that work is stripped or moved to a separate PR.

---

## Final test

Before merging the KYC v1 PR, ask yourself:

> "Would I be embarrassed to show this PR to a senior engineer who told me to ship the minimum viable KYC?"

If yes — it's probably over-built. Strip the extras.
If no — ship it.

---

**The spec is the contract. This document is the discipline. Together they get KYC v1 shipped.**
