# KYC v1 Frontend Patterns

**Status:** Locked. Reference document for all Session 5 prompts.
**Source:** Extracted from the existing `/settings/payments` (PaymentSetup.tsx) and `/settings/payments/bank-setup` (SubaccountWizard.tsx) — the patterns that already ship in Storehouse.
**Audience:** Future Claude Code sessions building the KYC v1 wizard, Card 1 tier_locked state, Card 2 status states, velocity visibility card, and edit-after-approval form.

**Read this at the start of every Session 5 prompt.**

---

## 1. The non-negotiable rules

These four rules override any temptation to do otherwise. Violating any of them means the new screens won't match what already ships.

### Rule 1: NO Tailwind. Inline styles only.

The codebase has no `tailwind.config.*`, no `postcss.config.*`, no `tailwindcss` dependency. The existing `src/styles/tailwind.css` is dead code that doesn't compile to anything.

Every Paystack screen styles itself with `style={{ ... }}` inline objects. Match this pattern exactly. Do NOT introduce Tailwind classes, do NOT add a Tailwind toolchain, do NOT use any other CSS-in-JS library.

The only existing Paystack-related component that breaks this rule (`PaystackHelp.tsx`) is silently broken at runtime. Don't copy its mistake.

### Rule 2: Inline-duplicate primitives. Don't refactor existing screens.

Each existing Paystack screen defines its primitives (`PrimaryButton`, `SecondaryButton`, `Shell`, `BackLink`, `Heading`, `HelpText`, `InlineCard`, `Toast`, etc.) inline in the same file. The new KYC wizard does the same — copy the definitions forward, don't extract to a shared module.

This is a deliberate tradeoff: we're at 2 instances of the wizard pattern, not 10. Refactoring to a shared module now risks pixel-perfect regression in working code. Defer the refactor to a future session (target: when there are 4+ wizard instances).

### Rule 3: Mirror SubaccountWizard.tsx for the KYC wizard.

The KYC wizard is structurally the second instance of an existing pattern. Use SubaccountWizard.tsx as the structural template:
- Same `<Shell>` outer container
- Same `<ProgressStrip>` at the top of multi-step content
- Same `<BackLink>` + `<Heading>` + `<HelpText>` opening pattern
- Same `<PrimaryButton>` / `<SecondaryButton>` for actions
- Same `<InlineCard>` for status/error/warn surfaces
- Same `<Toast>` for transient error states

Step content differs (KYC has identity fields, business details, photo upload, review). Wizard chrome is identical.

### Rule 4: Match the existing visual token table exactly.

The system below is observed convention, not declared tokens. No new colors, no new font sizes, no new spacing units. If a screen needs something not in the table, raise it before inventing.

---

## 2. Visual tokens (locked)

### Colors

| Hex | Role |
|---|---|
| `#00894F` | Primary brand green — buttons, progress fill, success ✓, "Edit" link, focused outline |
| `#065F46` | Dark green — success card titles ("Bank account verified") |
| `#A7F3D0` | Light green — success card border |
| `#ECFDF5` | Pale green — success InlineCard background |
| `#111827` | Near-black — primary text (headings, body values) |
| `#374151` | Dark grey — secondary text, BackLink color, body paragraphs |
| `#6B7280` | Medium grey — labels, help text, muted values, secondary lines |
| `#9CA3AF` | Light grey — small reference text on success screens |
| `#D1D5DB` | Border grey — secondary button borders, input borders |
| `#E5E7EB` | Pale grey — card borders, disabled button background, progress bar track |
| `#F3F4F6` | Lightest grey — disabled card background, info InlineCard background, skeleton placeholders, review row dividers |
| `#F6F6F7` | Off-white — page background |
| `#FFFFFF` | White — card backgrounds, input background, primary button text |
| `#DC2626` | Red — inline error counter text |
| `#991B1B` | Dark red — error InlineCard headings, Toast background |
| `#FEF2F2` | Pale red — error InlineCard background |
| `#FECACA` | Light red — error InlineCard border |
| `#92400E` | Dark amber — warn InlineCard heading |
| `#FDE68A` | Light amber — warn InlineCard border |
| `#FFFBEB` | Pale amber — warn InlineCard background |

Don't introduce new colors. If a new state needs visual differentiation, reuse the existing palette (e.g. tier_locked uses the same grey-disabled palette as Coming Soon).

### Typography

| Size | Weight | Usage |
|---|---|---|
| 28 | 700 | Page h1 (PaymentSetup) |
| 24 | 700 | Step h1 (inside wizard) |
| 20 | 700 | Account-name callout (Step 3 resolved) |
| 18 | 600 | Card title (PaymentCard, BankStatusCard) |
| 16 | 600 | Button label, review-row value |
| 16 | 400 | Body / input text |
| 15 | 600 | SecondaryButton label |
| 15 | 400 | Subtitle, body paragraph |
| 14 | 400 | Helper text, digit counter, skeleton shimmer band |
| 13 | 400 | Review-row label |
| 12 | 400 | Success-screen reference text |

### Spacing

- **Card padding:** `20px` (cards), `16px` (InlineCard)
- **Button padding:** `12px 20px`
- **Input padding:** `12px 16px`
- **Page outer padding:** `1.5rem 1rem 3rem`
- **Row gaps:** `12px` (typical), `8px` (tight), `16px` (between cards)
- **Vertical spacer between cards on landing:** `<div style={{ height: 16 }} />`

### Borders and radii

- **Cards:** `1px solid #E5E7EB`, radius `12px`
- **InlineCards:** `1px solid` palette-driven, radius `12px`
- **Inputs and SecondaryButton:** `1.5px solid #D1D5DB`, radius `10px`
- **PrimaryButton:** no border, radius `10px`
- **Progress bar:** radius `3px`
- **Skeleton bars:** radius `4px`

### Tap targets

Every interactive element sets `minHeight: 48`. Without exception. This includes BackLink, PrimaryButton, SecondaryButton, inline submit buttons, "Edit" links, photo upload triggers.

### Container widths

- **PaymentSetup page:** `maxWidth: 640`
- **Wizard pages:** `maxWidth: 560`
- **Centered single-button blocks (success / coming-soon):** `maxWidth: 320`

### Transitions

Use sparingly. Existing code has only two: ProgressStrip `transition: 'width 0.25s ease-out'`, PaymentSettings chevron `transition: 'all 0.2s'`. Don't add new animations unless they serve a real purpose.

---

## 3. Copy voice (locked)

### Voice characteristics

Looking at existing copy samples, the voice is:

- **Direct** ("Edit", "Back", "Yes, continue", not "Click here to edit your details")
- **Brief** (titles fit on one line, body copy is 1-2 sentences)
- **Names Paystack openly** ("Pay with Card / Secured by Paystack", "Secure payment powered by Paystack", "Paystack Payment Integration")
- **Nigerian-flavored** (₦ symbol, references to Nigerian banks, "Connect" not "Authenticate")
- **Specific about timing** ("Bank account submitted — awaiting review. We'll let you know when it's verified.")
- **Calm in errors** ("We couldn't find this account at [bank]" — not catastrophic)

### Vocabulary swaps (apply to all new KYC copy)

| Don't say | Say instead |
|---|---|
| Subscribe / Subscription tier | Choose a plan / Your plan |
| Subaccount | (don't expose — internal plumbing) |
| KYC verification / Identity verification process | Verify your identity |
| Document / Documentation | ID, photo, details |
| Submit your application | Send for review |
| Pending review | We're checking your details |
| Rejected | We need more information / We couldn't approve |
| Frozen | Your account needs review |
| Authentication / Authorize | Sign in / Allow |
| Configure | Set up |
| Endpoint, API, function, service | (don't mention — internal terms) |
| Processing... | Working... |
| Initiate | Start |
| Insufficient funds | Not enough money in your bank |

### Naira amount formatting

Always `₦` symbol with comma separators: `₦5,000`, `₦10,000`. In tight contexts use `₦5K` / `₦10K`. Never `NGN 5000`, never `N5000`.

### Microcopy patterns to inherit from SubaccountWizard

- "← Back" (with arrow, in BackLink button)
- "Continue" / "{Action} →" for primary forward CTAs (arrow at the end signals progression)
- "✓ {Result}" for success states (checkmark prefix)
- "✕ {Problem}" or "⚠ {Problem}" for errors and warnings
- "Step {n} of {total}" for progress label
- "{count} digits" / "Need {n} more" for inline input counters

### What NOT to write

- "Awesome!" / "Great job!" (patronizing)
- "Your data is safe with us" (vague trust signal — be specific instead)
- "Click here" / "Tap below" (the button location is obvious)
- "Loading..." with no context (skeleton or specific message instead)
- American idioms (touch base, raincheck, ballpark, etc.)

---

## 4. Interaction patterns (locked)

### Multi-step wizard

Follow SubaccountWizard's pattern exactly:
- ProgressStrip at top, hidden on terminal screens (success, coming-soon)
- BackLink at top of each step
- Form content in the middle
- PrimaryButton at the bottom (full width)
- Step state is component state, not URL state (refresh restarts at step 1 — this is the existing behavior and not in scope to fix)

### Form validation

Inline, real-time where helpful:
- Digit counter for fixed-length numeric inputs (BVN, NIN, account number)
- "Need {n} more digits" pattern when below required length
- "Too long — only {n} digits" pattern when above required length
- Color shift to `#DC2626` when invalid, `#6B7280` when below threshold but not yet "wrong"

### Error display hierarchy

Three levels for different severities:
1. **Inline counter text** — gentle nudges below input (digit count)
2. **InlineCard** — page-level state messages (resolve states, error explanations with retry button)
3. **Toast** — fixed top-center, dismissible, for transient submit failures

Use the lowest level that conveys the message. Don't escalate.

### Confirmation before destructive actions

The existing code is minimal here. For KYC, add explicit confirmation for:
- Submitting KYC for review (review screen IS the confirmation — full Step 5)
- No other destructive actions in v1 wizard

### Loading states

Match existing patterns:
- Button-level: disable + change label (e.g. `⏳ Submitting...`)
- Inline operations: `<InlineCard kind="info">⏳ {message}</InlineCard>`
- Page-level: skeleton card with two grey bars (BankStatusSkeleton pattern)

### Success states

Match Step5 of SubaccountWizard:
- Centered green `✓` (56px, color `#00894F`)
- 28px h1 below the checkmark
- 16px body paragraph
- 15px grey secondary line ("what happens next")
- PrimaryButton centered in 320px-wide block

---

## 5. Specific screens — locked copy

These screens have their copy decided. Use exactly this text (subject to translation key extraction).

**Three UX decisions applied to Card 2 (locked during Session 5.2):**

1. **No "X attempts remaining" counter.** Paystack, Stripe, Flutterwave, Wise, and Kuda all omit attempt counters from their KYC flows. Surfacing a depleting count to merchants creates anxiety and signals adversarial framing ("you're running out") instead of partnership ("we'll get this sorted"). The backend block at `submission_count >= 5` still fires; the merchant simply never sees the math.
2. **'frozen' status AND "out of attempts" share one screen.** Both end states ultimately resolve via support contact, so they get the same `needs_review` card with actionable next steps. The DB distinction (`status='frozen'` vs `status='rejected' AND submission_count>=5`) is preserved internally but invisible to the merchant.
3. **Softer, more agentic copy throughout.** "We can't approve this account" → "Your account needs review." "Please contact support to find out why" → "Send these to support@storehouse.ng: [bulleted list]." The merchant gets a clear next step, not a dead end.

### Card 1 — tier_locked (new 5th state for PaymentSetup.tsx)

Inside the existing 4-state conditional, add a fifth branch when the user is on free tier:

```
Icon: 💳
Title: Online payments
Subtitle: Available on Starter and Pro plans. Upgrade to start receiving payments through Paystack.
CTA: Choose a plan
Visual: PaymentCard pattern, disabled=false, onClick navigates to billing route
```

Use the existing `PaymentCard` component. The disabled-grey palette doesn't fit here — this is an active CTA, not a coming-soon placeholder.

**Destination route:** `/upgrade` — the canonical, registered route that lazy-loads `SubscriptionUpgrade`. Backend spec §6.2 mentioned `/settings/billing`, but the Session 5.0 audit confirmed that route does not exist in the codebase; `/upgrade` is what `MoreMenu` and `BusinessInsights` already use. Use `navigate('/upgrade')`.

**Tier detection:** Use `subscriptionService.getUserTier()`. The RPC it wraps was rewritten in the subscription hardening session (commit `90150f4`) to mirror `submit_kyc_v1`'s canonical paid-tier check — cancelled, expired, and business-tier users all correctly resolve to `'free'`. Option (a) is now the right call; the earlier "direct-query mirror" recommendation in the Session 5.0 audit was the fallback for when the RPC was broken and is no longer needed. The three-way sync contract (tier-resolver.ts ↔ submit_kyc_v1 ↔ get_user_tier) is documented in `docs/SESSION_4_LESSONS_CAPTURED.md` — any change to one of those gates must change all three.

### Card 2 — tier_locked

```
Icon: 🪪
Title: Verify your identity
Subtitle: Required before receiving online payments. Available on Starter and Pro plans.
CTA: Choose a plan
Visual: PaymentCard pattern, same as Card 1 tier_locked
```

Same destination route as Card 1 tier_locked.

### Card 2 — not_started (on paid tier)

```
Icon: 🪪
Title: Verify your identity
Subtitle: Required by Nigerian banking rules before receiving online payments. Takes about 5 minutes.
CTA: Start verification
Visual: PaymentCard pattern, enabled
Destination: /settings/payments/identity-verification (per backend spec §6.2)
```

### Card 2 — pending (status='submitted')

Match the existing BankStatusCard "pending" state:

```
Icon: 🪪
Title: Identity submitted — we're checking
PrimaryLine: We'll let you know within 24-48 hours.
SecondaryLine: (optional) Submitted {relative time, e.g. "2 hours ago"}
Tone: pending
```

### Card 2 — rejected (resubmittable)

Shown when `vendor_kyc.status === 'rejected' AND submission_count < 5`.

```
Icon: 🪪
Title: We need more information
PrimaryLine: Read directly from vendor_kyc.reviewer_notes_merchant
CTA: Update details
Destination: /settings/payments/identity-verification (resubmission reuses the same wizard route)
Visual: BankStatusCard with warn tone palette (bg #FFFBEB, border #FDE68A, title #92400E),
        plus a full-width green "Update details →" button below the card.
```

**Important — reading the merchant message:**
The merchant-facing rejection message is already mapped by the `reject_kyc_review` RPC and stored in `vendor_kyc.reviewer_notes_merchant`. The frontend reads this column directly. Do NOT re-derive the message from `rejection_category` on the frontend — that would risk drift if the mapping changes in the RPC. The category-to-message mapping is the RPC's job, not the frontend's.

**No attempts counter.** Per the three UX decisions at the top of this section, merchants do NOT see "X attempts remaining" or similar. The backend gate at `submission_count >= 5` still fires server-side; on the 5th rejected submission the card silently transitions to `needs_review` (below).

### Card 2 — needs_review (frozen OR out of attempts)

Shown when EITHER:
- `vendor_kyc.status === 'frozen'`, OR
- `vendor_kyc.status === 'rejected' AND submission_count >= 5`

Same screen for both. The DB distinction is preserved internally; the merchant just sees one consolidated "let's get this sorted by hand" message.

```
Icon: 🪪
Title: Your account needs review
PrimaryLine: We need to take another look at your business details.
Body (bulleted list inside the card):
  Lead: "Send these to support@storehouse.ng:"
  Bullets:
    • Photo of your CAC certificate (if registered)
    • Recent bank statement
    • Brief description of what your business does
SecondaryLine: We'll get back to you within 2 business days.
No CTA — the email IS the action.
Visual: Custom card layout (grey background, same #F3F4F6 as the pending palette), 🪪 icon
        on the left, bullets via a native <ul>. NOT a BankStatusCard — needs the bulleted
        body structure.
```

Softer than the original "We can't approve this account" framing. Gives the merchant concrete next steps instead of a dead end.

### Card 2 — approved

```
Icon: 🪪
Title: Identity verified ✓
PrimaryLine: You can receive online payments through your Storehouse.
SecondaryLine: (optional) Edit details
Tone: success (use success palette, same as BankStatusCard verified)
```

### Wizard step 1 — Why we need this

```
Heading: Verify your identity
HelpText: Nigerian banking rules require this before you can receive online payments. We'll check your details in 24-48 hours.
Body: (centered, with trust copy)
  Your information is encrypted on our system.
  Only the review team can see your BVN and NIN.
PrimaryButton: Start
```

### Wizard step 2 — Personal identity

```
Heading: Your details
HelpText: We need these to verify you. We don't use them to access your money.
Inputs:
  - BVN (11 digits) — masked, numeric input
  - NIN (11 digits) — masked, numeric input  
  - Phone number — input with +234 prefix shown as locked text
Inline digit counters for each
PrimaryButton: Continue →
```

### Wizard step 3 — Business details

```
Heading: About your business
Inputs:
  - Business type (dropdown: Retail, Food, Provision store, Services, Online seller, Other)
  - CAC RC number (optional)
  - Business address (optional)
PrimaryButton: Continue →
```

### Wizard step 4 — ID photo

```
Heading: Take a photo of yourself holding your ID
HelpText: Make sure your face AND your ID are both visible clearly.
Body: 
  - Camera capture button (uses <input type="file" accept="image/*" capture="user">)
  - Preview area (shows captured photo)
  - "Retake" SecondaryButton (always visible after first capture)
PrimaryButton: Continue → (disabled until photo present)
```

### Wizard step 5 — Review and submit

Match SubaccountWizard's Step 4 review pattern:

```
Heading: Check your details
ReviewRow x N for each field entered (with Edit links per row)
Photo thumbnail (with Retake link)
Confirmation checkbox: "I confirm I am the owner of this business and the information is accurate."
SecondaryButton: Back
PrimaryButton: Send for review (disabled until checkbox ticked, then enabled)
```

### Wizard step 6 — Submitted (success)

Match Step5 of SubaccountWizard:

```
Icon: ✓ (large, green)
Heading: Identity submitted
Body: We'll review your details within 24-48 hours.
Secondary: You don't need to wait on this screen — we'll let you know when it's done.
PrimaryButton: Back to settings
```

### Wizard route

The wizard lives at `/settings/payments/identity-verification` per backend spec §6.2.

Free-tier users hitting this URL directly should be redirected to the billing/upgrade route (same destination as the tier_locked card CTAs — see §10 step 5.0 for verification).

---

## 6. What's genuinely new and needs invention

These elements don't exist in the codebase yet:

### Photo upload UI

No existing screen does file uploads with preview + retake. The pattern to invent:
- Camera capture input (`<input type="file" accept="image/*" capture="user">`)
- Hidden file input, triggered by a styled tap target
- Preview area shows captured image (object-fit: contain, max-height 320px)
- "Retake" SecondaryButton overlays bottom-right of preview when present
- Upload to Supabase Storage `kyc-photos/{user_id}/{vendor_kyc_id}/selfie.jpg` happens on Continue, not on capture (so retakes don't litter storage)
- Loading state during upload: PrimaryButton disabled with `⏳ Uploading...`
- Upload error: Toast with "Couldn't upload photo. Tap to try again."

### Confirmation checkbox before submit

No existing screen has a pre-submit checkbox. Pattern to invent:
- Native `<input type="checkbox">`, scale 1.25, color `#00894F` via accent-color
- Label to right of checkbox, font-size 15, color `#374151`
- Spacing: 12px gap between checkbox and label
- PrimaryButton stays disabled (`#E5E7EB` background) until checked

### Edit-after-approval form

A subset of fields editable post-approval (phone, business type, CAC, address). BVN/NIN/photo trigger re-review.

Pattern: same form layout as wizard step 2/3 but no progress strip, single page, with explicit warning copy at top for fields that trigger re-review:

```
HelpText: Changes to your BVN, NIN, or photo will need a new review (24-48 hours).
```

---

## 7. Multilingual handling

For Session 5: **English only.** All copy in English (Nigerian-flavored per the voice guide above).

The existing codebase uses a `useStrings()` hook with `t.X.Y` key pattern. Continue this pattern for KYC — new strings get keys like `t.kyc.wizard.step1.heading`, even if only English is populated for v1.

Pidgin/Yoruba/Igbo/Hausa translations are deferred to v1.5. The architecture supports this — adding translations later is "fill in the table," not "refactor every component."

---

## 8. What we explicitly DON'T do in Session 5

These are tempting but wrong:

- **No new Tailwind classes anywhere.** Rule 1.
- **No refactoring existing screens.** Rule 2.
- **No new colors, sizes, or spacing units.** Rule 4.
- **No animations beyond ProgressStrip's existing transition.**
- **No modal dialogs for confirmations.** Existing pattern is inline review screens.
- **No "Pro tip" callouts or tutorial overlays.**
- **No automatic state persistence to Supabase.** Existing wizard restarts on refresh. This is fine for v1 — adding persistence is a v1.5 feature.
- **No `PaystackHelp.tsx`-style floating help bubbles.**
- **No skeleton loaders for fast operations** (>500ms only).
- **No emoji decoration beyond what existing screens use** (`✓`, `⏳`, `💳`, `🪪`, `✕`, `⚠`).
- **No "Forgot password?" / "Contact us" footer links** unless explicitly needed for the screen's purpose.
- **No re-derivation of merchant-facing rejection messages on the frontend.** Read `vendor_kyc.reviewer_notes_merchant` directly — the RPC owns the category-to-message mapping.

---

## 9. The final filter

Before any Session 5 screen ships, ask three questions:

1. **Does it match the existing Paystack screens visually?** (Same colors, same sizes, same primitives.)
2. **Does it match the existing copy voice?** (Direct, brief, names Paystack, ₦ symbol.)
3. **Does a busy Nigerian SMB owner know what comes next?** (Clear CTA, clear time expectations, clear errors.)

If any answer is "not sure," revise.

---

## 10. Implementation order (Session 5 sub-steps)

In recommended order:

| Sub-step | What | Files touched | Estimate |
|---|---|---|---|
| **5.0** | **Pre-flight: audit existing billing/upgrade route in codebase** | read-only | 5-10 min |
| 5.1 | Card 1 `tier_locked` state | `src/pages/PaymentSetup.tsx` | 30 min |
| 5.2 | Card 2 status states (7 states) | `src/pages/PaymentSetup.tsx` | 60-90 min |
| 5.3 | Wizard scaffold (Shell, ProgressStrip, BackLink chain, step navigation) | `src/components/payments/KycWizard.tsx` (new file) | 45-60 min |
| 5.4 | Wizard step 1 (why) + step 2 (identity) | same | 60-90 min |
| 5.5 | Wizard step 3 (business) + step 4 (photo) | same | 90-120 min |
| 5.6 | Wizard step 5 (review) + step 6 (success) + RPC integration | same | 60-90 min |
| 5.7 | Velocity visibility card | `src/pages/PaymentSetup.tsx` or new file | 30-45 min |
| 5.8 | Edit-after-approval limited form | new file or extension | 45-60 min |

### Step 5.0 — Pre-flight audit (mandatory before 5.1)

Before writing any new frontend code, Claude Code verifies:

1. **The billing/upgrade route in the codebase.** Backend spec §6.2 references `/settings/billing` as the redirect target for free-tier users hitting the wizard URL. This route's existence has not been confirmed.

   Run:
   ```bash
   grep -rn "settings/billing\|settings/subscription\|settings/plan\|upgrade" src/pages src/App.tsx 2>/dev/null
   ```
   
   Identify the actual route in the codebase. If `/settings/billing` exists, use it. If a different route exists (e.g. `/settings/subscription`), use that and amend this doc + backend spec §6.2 to match. If no upgrade route exists yet, raise it before proceeding — we may need a placeholder.

2. **How `vendor_kyc` and `stores.kyc_status` are queried from the frontend today.** Check whether there's an existing hook (e.g. `useStore()`, `useKycStatus()`) or whether the new code adds the query.

3. **How `user_subscriptions` is queried to determine current tier from the frontend.** Identify the existing pattern so the new tier_locked detection uses the same approach.

Report findings before starting 5.1. Adjust this doc + backend spec wording as needed in the same commit as 5.1's code change.

**Total: 6-8 hours of focused work, realistically across 2-3 sessions.**

---

**End of patterns document. Reference this in every Session 5 prompt before writing any frontend code.**
