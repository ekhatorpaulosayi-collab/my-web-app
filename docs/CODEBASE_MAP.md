---
> **Status:** LIVING REFERENCE DOCUMENT
> **Required reading for:** any Claude Code session touching this
> codebase, especially before writing new specs or migrations.
> **First generated:** 2026-05-16, after Session 5.2 (commit 9fbdeb1).
> **Why it exists:** Tonight's KYC v1 build had 5+ instances of
> "spec assumed X, reality is Y" cycles. This audit produces a
> single source of truth so future prompts reference the map
> instead of re-discovering it. **§20 catalogs marketplace
> infrastructure that is being built in parallel with KYC v1 —
> currently hidden from public, soft target reveal 3-6 months out.
> Read §20 before deleting anything that looks orphaned in the
> payments / split / review domain.** The codebase map should be
> regenerated periodically (suggest: once per major feature
> shipped) so it stays accurate.
> **How to refresh:** Re-run the structural audit prompt from
> /mnt/user-data/outputs/codebase_audit_prompt.txt (or equivalent)
> and overwrite this file.
---

# Storehouse v2 — Structural Codebase Map

**Generated:** 2026-05-16 (audit date 2026-05-14)
**Branch:** `feat/kyc-wizard-v1` (2 commits ahead of origin)
**Latest commit:** `9fbdeb1 feat(kyc): step 5.2 - Card 2 status states (6 states, no counter, soft needs_review copy)`
**Purpose:** Single scannable structural reference so future prompts don't re-discover what already exists. Read-only audit — no edits, no commits, working tree clean.

---

## 1. Top-level structure

| Path | Purpose |
|------|---------|
| `src/` | React/Vite frontend (mix of .jsx and .tsx) |
| `supabase/` | Edge functions + 68 SQL migrations |
| `docs/` | 18 markdown design / debug / spec docs (incl. KYC v1 spec, Paystack design) |
| `public/` | Static assets shipped by Vite |
| `scripts/` | Operational bash + node helpers |
| `tools/` | Misc utility scripts |
| `tests/`, `test-results/`, `playwright-report/` | Playwright suite + outputs |
| `e2e/` | End-to-end test specs |
| `monitoring/` | Monitoring config snippets |
| `*.md` (root) | ~35 long-form planning/strategy docs (AI chat, affiliate, marketplace etc.) — historical, not referenced by code |
| `.env*` | `.env.example`, `.env.local`, `.env.production.local`, `.env.vercel` (4 files) |
| `package.json`, `vite.config.*`, `tsconfig.*` | Build config |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` | Legacy Firebase config (firebase still imported in some files) |
| `vercel.json` | Vercel deploy config |

---

## 2. Pages (src/pages/)

Excluding `.backup` files.

| Filename | Route | Purpose | Active |
|----------|-------|---------|--------|
| `AIChatAnalyticsPage.tsx` | (none in AppRoutes) | AI chat usage analytics | N (no route) |
| `AffiliateAdmin.tsx` | `/admin/affiliates` | Manage affiliates + payouts | Y |
| `AffiliateDashboard.tsx` | `/affiliate/dashboard` | Affiliate earnings dashboard | Y |
| `AffiliateSignup.tsx` | `/affiliate/signup` | Join 30% commission program | Y |
| `AllVariantsTest.tsx` | `/all-variants` | Image-enhancement test page | Y (dev) |
| `AuthConfirm.jsx` | `/auth/confirm` | Email confirm callback | Y |
| `BusinessInsights.tsx` | `/dashboard/insights` | AI-powered business summaries | Y |
| `ChatHistory.tsx` | (none) | Chat history viewer | N |
| `ConversationsPage.tsx` | `/conversations` | Customer chats manager | Y |
| `CreateInvoice.tsx` | `/invoices/create` | New invoice form | Y |
| `CustomersPage.tsx` | `/customers` | Customer + purchase history | Y |
| `DebugCenter.tsx` | `/debug-center` | Chat system diagnostics | Y |
| `DevSaleModal.tsx` | `/dev/sale-modal` | Dev preview for Sale Modal V2 | Y (dev) |
| `DirectImageTest.tsx` | `/direct-test` | Image test page | Y (dev) |
| `ErrorMonitoringDashboard.tsx` | `/admin/monitoring` | Admin error log viewer | Y |
| `ExpensesPage.tsx` | (none) | Expenses CRUD | N (no route) |
| `ForgotPassword.jsx` | `/forgot-password` | Password recovery | Y |
| `HelpCenter.tsx` | `/help` | Browse documentation | Y |
| `ImageTest.tsx` | `/image-test` | Image enhancement test | Y (dev) |
| `InvoiceDetail.tsx` | `/invoices/:id` | Invoice detail view | Y |
| `Invoices.tsx` | `/invoices` | Invoice list | Y |
| `LandingPage.tsx` | `/` | Public marketing page | Y |
| `Login.jsx` | `/login` | Login | Y |
| `MoneyPage.jsx` | (none) | Money/cash view | N (no route) |
| `PaymentSetup.tsx` | `/settings/payments` | **Two-card hub: bank + KYC** — flag-gated | Y (KYC v1 focus) |
| `PublicInvoiceView.tsx` | `/invoice/:id` | Public invoice link | Y |
| `ReferralDashboard.tsx` | `/referrals` | Invite-friends rewards | Y |
| `ReviewManagement.tsx` | `/reviews` | Moderate reviews | Y |
| `SentryTest.jsx` | `/sentry-test` | Trigger Sentry test event | Y (dev) |
| `Settings.jsx` | `/settings` | Main settings landing | Y |
| `Signup.jsx` | `/signup` | New user signup | Y |
| `StaffManagement.tsx` | `/staff` | Owner-only staff CRUD | Y |
| `StorefrontPage.tsx` | `/store/:slug` | Public storefront | Y |
| `SubmitTestimonial.tsx` | `/submit-testimonial` | Public testimonial form | Y |
| `TestPayment.jsx` | (none) | Paystack test payment | N (no route) |
| `TestPaymentStatus.tsx` | (none) | Test payment status | N |
| `TestVariants.tsx` | `/test-variants` | VariantManager test | Y (dev) |
| `UpdatePassword.jsx` | `/update-password` | Password reset | Y |
| `WhatsAppAI.tsx` | `/whatsapp-ai` | WhatsApp AI settings | Y |

**Legacy redirects (all → `/settings`):** `/store-settings`, `/config`, `/preferences`, `/business-settings`, `/account`, `/profile`. `/landing` → `/`. `*` → `/`.

**Pages with NO route registration (orphaned):** `AIChatAnalyticsPage`, `ChatHistory`, `ExpensesPage`, `MoneyPage`, `TestPayment`, `TestPaymentStatus`.

---

## 3. Components (src/components/)

### Top-level (notable, alphabetical, excluding backup/_OLD)

| File | Purpose |
|------|---------|
| `AIChatWidget.tsx` (+ 4 variants `.enhanced.tsx`, `-enhanced-bubble.tsx`, `-fixed.tsx`, `-quota-fix.tsx`) | Floating chat widget. **Multiple competing variants — only `AIChatWidget.tsx` likely imported** |
| `AIUsageCounter.tsx` | AI quota counter pill |
| `AfterSaleSheet.tsx` | Post-sale receipt/share sheet |
| `BusinessSettings.tsx` | Main business settings panel |
| `BusinessSettingsSheet.tsx` | Mobile sheet variant |
| `Cart.tsx` / `Checkout.jsx` / `CheckoutDemo.jsx` | Storefront cart + checkout |
| `CSVImport.tsx`, `CalculatorModal.tsx` | Utility modals |
| `CommandMenu.tsx` | Cmd-K command palette |
| `Dashboard.tsx` (+ 3 backups) | Main dashboard |
| `DashboardCustomize.tsx` | Dashboard widget reordering |
| `ErrorBoundary.tsx`, `RootBoundary.tsx` | React error boundaries |
| `GettingStartedChecklist.tsx` | Onboarding checklist |
| `Header.tsx`, `IconButton.tsx` | Layout primitives |
| `KpiRow.tsx`, `MetricCard.tsx`, `SalesChart.tsx`, `SalesHistory.tsx`, `WidgetCard.tsx` | Dashboard widgets |
| `MoreMenu.tsx` | Overflow menu |
| `OfflineBanner.tsx` | Network status banner |
| **`OnlineStoreSetup.tsx`** | Integrated online-store onboarding |
| `OptimizedImage.tsx`, `SmartPicture.tsx` | Image wrappers w/ ImageKit |
| `OrderConfirmation.tsx` | Post-order confirmation page |
| `OwnerPINModal.tsx` | Owner PIN entry |
| `PaymentLinkCard.jsx`, `PaymentMethodsManager.tsx` | **Legacy** payment-method config (banks/POS/USSD) |
| **`PaymentSettings.tsx`** | **Legacy Paystack key + payment-link panel — predates subaccount wizard** |
| `PaymentSetupNudge.tsx` | Nudge banner for `/settings/payments` |
| **`PaystackHelp.tsx`** | **Legacy Paystack getting-started help** |
| `PaymentStatusIndicator.tsx` | Status pill (paystack onboarding state) |
| `PharmacySetupGuide.tsx` | Vertical-specific guide |
| `ProductImageGallery.tsx`, `MultiImageUpload.tsx` | Image components |
| `ProductShareMenu.tsx`, `ShareInstructionsModal.tsx`, `ShareStoreBanner.tsx`, `ShareStoreCard.jsx` | Sharing UI |
| `PromoCodesManager.tsx` | Promo codes |
| `ProtectedRoute.jsx` | Auth gate for routes |
| `ReceiptOptionsModal.tsx`, `ReceiptPreview.jsx` | Receipt UI |
| `RecordPaymentModal.tsx` | Mark invoice paid |
| `RecordSaleModal.tsx`, `RecordSaleModalV2.tsx` | Record-sale flows (two versions) |
| `ReferralInviteButton.tsx`, `ReferralRewardsWidget.tsx` | Referral UI |
| `ReviewForm.tsx`, `ReviewList.tsx`, `TestimonialForm.tsx` | Reviews |
| `SmartNotificationBar.tsx` | Top notification |
| `StaffPerformanceWidget.tsx`, `StaffPinLogin.tsx` | Staff |
| `StoreQuickSetup.tsx`, `StoreSetup.tsx`, `StoreSetupComplete.tsx`, `StoreSettings.tsx` | Onboarding flows |
| **`SubscriptionUpgrade.tsx`** | **`/upgrade` page — initiates subscription Paystack flow** |
| `SupportEscalation.tsx` | Escalation form |
| `TaxPanel.tsx`, `TaxRateSelector.tsx` | Tax UI |
| `Toast.jsx` | Toast notifications |
| `UpgradeModal.tsx` | Upgrade modal (CTA from tier limit) |
| `VariantManager.tsx`, `VariantSelector.tsx` | Product variants |
| `WhatsAppAISettings.tsx`, `WhatsAppAnalyticsDashboard.tsx`, `WhatsAppButton.jsx`, `WhatsAppContactModal.jsx`, `WhatsAppPricingTiers.tsx`, `WhatsAppQuickReplies.tsx`, `WhatsAppSupportButton.jsx` | WhatsApp integration |
| `FirebaseTest.jsx`, `DebugConsole.tsx`, `DocViewer.tsx`, `ContextualPromptToast.tsx` | Misc |
| `ChannelAnalytics.tsx`, `MarketplaceSettings.tsx`, `ChatTakeoverPanel.tsx`, `ChatResponse.tsx`, `CreateDebtModal.tsx`, `CurrentDate.tsx`, `CustomerDebtDrawer.tsx`, `ExpenseModal.tsx`, `FeatureCard.tsx`, `BusinessTipsWidget.tsx`, `BusinessTypeSelector.tsx`, `ConversationAnalytics.tsx`, `SettingsLauncher.tsx` | Misc |

### Subdirectories

| Dir | Contents |
|-----|----------|
| **`components/payments/`** | **`SubaccountWizard.tsx` — vendor bank subaccount wizard (Card 1 of /settings/payments). Flag-gated `VITE_ENABLE_PAYSTACK_SUBACCOUNTS`** |
| **`components/settings/`** | `WhatsAppFallbackSettings.tsx` + `sections/PaymentsSection.tsx`, `sections/WhatsAppReportsSection.tsx` |
| `components/common/` | `StatusPill.tsx` |
| `components/layout/` | `StickyActions.tsx` + .css |
| `components/ui/` | `Chip.jsx`, `CollapseCard.tsx` + .css |
| `components/dashboard/` | 20+ conversation variants (`StorehouseConversations`, `WorldClassConversations`, `PremiumConversations`, `EnhancedConversations`, `CleanConversations`, `Simplified*`, `UltraSimple*`, etc.) + `AgentChatInterface`, `OwnerNotificationManager`, `QuotaAlert`, `WaitingCustomerBanner`, `StoreWhatsAppSettings`, `ConversionAnalytics`, `ConversationsDebug`. **Multiple competing conversation implementations** |
| `components/sales/` | `CartDrawer.tsx`, `ItemCombobox.tsx` |
| `components/chat/` | `AgentTakeoverButton.tsx`, `WhatsAppFallbackTimer.tsx`, `WhatsAppLinkGenerator.tsx` |
| `components/debug/` | `AgentTakeoverDebugger.tsx`, `MasterDebugger.tsx`, `QuickDebugger.tsx`, `WhatsAppFallbackHealthCheck.tsx` |
| `components/contributions/` | Group savings / `ajo` feature: `ContributionGroupDetail`, `ContributionGroupList`, `ContributionPublicView`, `CreateGroupForm`, `EnhancedMembersList`, `GroupSettings`, `MemberStatusBadge`, `PaymentStatusDashboard`, `ProgressRing` |
| `components/OnlineStore/` | `TabNav.tsx` + .css |
| `components/WhatsAppAI/` | `WhatsAppAISetup.jsx` + `INTEGRATION_INSTRUCTIONS.md` |
| `components/__tests__/` | `CurrentDate.test.tsx` |

**Priority dirs flagged (KYC / payment / subscription / paystack):**
- `components/payments/SubaccountWizard.tsx`
- `components/settings/sections/PaymentsSection.tsx`
- `components/PaystackHelp.tsx`, `components/PaymentSettings.tsx`, `components/PaymentMethodsManager.tsx`, `components/PaymentLinkCard.jsx` (all LEGACY — predate Card 1/2)
- `components/PaymentSetupNudge.tsx`, `components/PaymentStatusIndicator.tsx`
- `components/SubscriptionUpgrade.tsx`, `components/UpgradeModal.tsx`

---

## 4. Services (src/services/)

| File | Exports | Purpose | Backing table / API |
|------|---------|---------|---------------------|
| `affiliateService.ts` | generateAffiliateCode, createAffiliate, getAffiliateByUserId/Code, updateAffiliateBankDetails, trackAffiliateClick, recordAffiliateSignup/Sale | Affiliate program lifecycle | `affiliates`, `affiliate_clicks`, `affiliate_sales`, `affiliate_payouts` |
| `aiUsageService.ts` | getAIUsage, incrementAIUsage, getUpgradeBenefits, calculateUpgradeROI | AI chat quota tracking | `ai_chat_usage` |
| `chatTrackingService.ts` | trackStorefrontChat | Storefront chat event tracking | `chat_analytics` |
| `contributionService.ts` | createGroup, getGroups, getGroup, updateGroup, deleteGroup, addMember, removeMember, reorderMembers, +more | Ajo/contribution groups CRUD | `contribution_groups`, `contribution_members`, `contribution_payments`, `contribution_payouts` |
| `dataMigration.js` | migrateUserData, shouldMigrate, clearMigrationStatus | Firebase → Supabase migration | both |
| `firebaseProducts.js` | getProducts, subscribeToProducts, addProduct, updateProduct, deleteProduct, productExists, clearProductsCache | Legacy Firebase products | Firestore |
| `invoiceService.ts` | createInvoice, getInvoice(s), updateInvoice, deleteInvoice, cancelInvoice, recordPayment, getInvoicePayments | Invoice lifecycle | `invoices`, `invoice_items`, `invoice_payments` |
| `marketplace.ts` | isMarketplaceEnabled, arePublicStoresEnabled, arePremiumTiersEnabled, generateStoreSlug, updateStoreSettings, getPublicStore, setProductsPublicVisible, setAllProductsVisible | Marketplace feature flags + public store ops | `stores`, `products` |
| `ownerNotificationService.ts` | ownerNotificationService, checkForWaitingCustomers, playNotificationChime, requestNotificationPermission | Owner browser notifications | client-only |
| `paymentAlertService.ts` | PaymentAlertService class | Payment alert orchestration | client-only |
| `pushNotificationService.ts` | isPushSupported, getPushPermissionState, requestPushPermission, initPushNotifications, subscribeToPush, unsubscribeFromPush, isSubscribedToPush, sendTestNotification | Web Push VAPID lifecycle | `users.push_subscription` |
| `referralService.ts` | MILESTONE_REWARDS, generateReferralCode, getOrCreateReferralCode, validateReferralCode, claimReferralCode, trackReferralConversion, getUserMilestone, getActiveRewards | Referral program | `referrals`, `referral_milestones`, `referral_rewards` |
| `reviewService.ts` | submitReview, getProductReviews, getProductReviewStats, voteOnReview, getStoreReviews, approveReview, rejectReview, respondToReview | Product reviews + moderation | `product_reviews`, `review_votes`, `product_review_stats` |
| `salesWithStaffService.ts` | fetchTodaySalesWithStaff, getTodayStaffPerformance | Joined sales+staff reads | `sales`, `staff_members` |
| `staffService.ts` | hashPin, verifyPin, createStaffMember, fetchStaffMembers, authenticateStaffWithPin, updateStaffMember, resetStaffPin, toggleStaffActive | Staff lifecycle + PIN auth | `staff_members`, `staff_activity_logs` |
| **`subscriptionService.ts`** | getAvailableTiers, **getUserTier**, canAddProduct, canAddProductImage, canAddUser, canUseAIChat, incrementAIChatUsage, hasFeature, getTierPricing, formatNaira, calculateAnnualSavings | **Tier limits + quota** | `subscription_tiers`, `user_subscriptions`; uses RPC `get_user_tier` |
| `supabaseProducts.js` | getProducts, subscribeToProducts, addProduct, updateProduct, deleteProduct, productExists, clearProductsCache, getLowStockProducts | Supabase products | `products` |
| `supabaseSales.ts` | createSale, getSalesByEmail, getSales, getSalesByDateRange, getTodaySales, updateSale, deleteSale, migrateSalesToSupabase | Sales | `sales` |
| `whatsappIntegration.ts` | WhatsAppIntegrationService class, createWhatsAppService factory | WhatsApp send/receive | Green API + `whatsapp_*` tables |

---

## 5. Hooks (src/hooks/)

| Hook | Purpose |
|------|---------|
| `useAppContext.ts` | Aggregates auth/business profile/preferences into one context |
| `useAutoSave.ts` | Debounced auto-save |
| `useBarcode.ts` | Barcode scanner input listener |
| `useContextualPrompts.ts` | Surface contextual onboarding nudges |
| `useDirty.ts` | Dirty form tracking |
| `useFocusTrap.ts` | Modal focus trap |
| `useHotkeys.ts` | Keyboard shortcut handlers |
| `useImageUpload.ts` | ImageKit/Supabase image upload |
| `useOfflineStatus.ts` | Online/offline + `usePendingOperations` |
| `useReliableMessaging.ts` | Retry/queue message send |
| `useSmartImage.ts` | Smart image variant picker |
| `useStrings.js` | `useStrings()` → returns `src/locales/strings.json` |

**Hooks defined inside contexts/lib (not in `src/hooks/`):**
- `useAuth` (contexts/AuthContext.jsx)
- `useBusinessProfile` (contexts/BusinessProfile.jsx)
- `usePreferences` (contexts/PreferencesContext.tsx)
- `useStaff` (contexts/StaffContext.tsx)
- `useCart` (contexts/CartContext.tsx)
- `useUser`, `useStore`, `useStoreActions`, `usePublicStore`, `useProducts`, `useProductActions`, `useSales`, `useSaleActions`, `useDashboardSummary`, `useLowStockProducts`, `useCacheClear` (lib/supabase-hooks.js)

---

## 6. Contexts (src/contexts/)

| Context | State | Consumers |
|---------|-------|-----------|
| `AuthContext.jsx` | `currentUser`, `loading`, signIn/signOut wrappers | `AppRoutes`, `ProtectedRoute`, all pages via `useAuth` |
| `BusinessProfile.jsx` | Business profile (name, slug, type, etc.) | `App.jsx`, settings pages, dashboard widgets via `useBusinessProfile` |
| `CartContext.tsx` | Storefront cart items, totals | `StorefrontPage`, `Cart`, `Checkout`, `CartDrawer` via `useCart` |
| `PreferencesContext.tsx` | UI prefs (theme, density, tutorial dismissed) | `App.jsx`, settings via `usePreferences` |
| `StaffContext.tsx` | Currently authed staff member (PIN session) | `RecordSaleModal*`, owner-gated UI via `useStaff` |

---

## 7. Routes (src/AppRoutes.jsx)

All non-public routes wrapped in `<ProtectedRoute>`. All lazy-loaded except `Login`, `Signup`, `ForgotPassword`, `AuthConfirm`, `UpdatePassword`, `ProtectedRoute`. Suspense fallback is the shared `LoadingScreen`.

### Auth
| Path | Component | Wrapping |
|------|-----------|----------|
| `/login` | Login | redirect to `/dashboard` if logged in |
| `/signup` | Signup | redirect to `/dashboard` if logged in |
| `/forgot-password` | ForgotPassword | redirect if logged in |
| `/auth/confirm` | AuthConfirm | none |
| `/update-password` | UpdatePassword | none |

### Dashboard / Core
| Path | Component | Wrapping |
|------|-----------|----------|
| `/dashboard` | App (root app) | Protected |
| `/dashboard/insights` | BusinessInsights | Protected + nested Suspense |
| `/customers` | CustomersPage | Protected |
| `/conversations` | ConversationsPage | Protected |
| `/staff` | StaffManagement | Protected |
| `/referrals` | ReferralDashboard | Protected |
| `/invoices` | Invoices | Protected |
| `/invoices/create` | CreateInvoice | Protected |
| `/invoices/:id` | InvoiceDetail | Protected |
| `/reviews` | ReviewManagement | Protected |
| `/whatsapp-ai` | WhatsAppAI | Protected |
| `/help` | HelpCenter | Protected |

### Settings + Payments
| Path | Component | Wrapping |
|------|-----------|----------|
| `/settings` | Settings | Protected |
| **`/settings/payments`** | **PaymentSetup** | Protected (KYC v1 hub — Card 1 bank, Card 2 KYC) |
| **`/settings/payments/bank-setup`** | **SubaccountWizard** | Protected (flag-gated `VITE_ENABLE_PAYSTACK_SUBACCOUNTS`) |

### Subscription / Upgrade
| Path | Component | Wrapping |
|------|-----------|----------|
| **`/upgrade`** | **SubscriptionUpgrade** | Protected |

### Affiliates
| Path | Component | Wrapping |
|------|-----------|----------|
| `/affiliate/signup` | AffiliateSignup | Protected |
| `/affiliate/dashboard` | AffiliateDashboard | Protected |
| `/admin/affiliates` | AffiliateAdmin | Protected |

### Onboarding (mixed protected/public)
| Path | Component | Wrapping |
|------|-----------|----------|
| `/store-setup` | StoreSetup | public |
| `/quick-setup` | StoreQuickSetup | public |
| `/setup-complete` | StoreSetupComplete | Protected |
| `/online-store` | OnlineStoreSetup | Protected |

### Debug / Admin / Dev
| Path | Component | Wrapping |
|------|-----------|----------|
| `/debug/agent-takeover` | AgentTakeoverDebugger | Protected |
| `/debug-center` | DebugCenter | Protected |
| `/admin/monitoring` | ErrorMonitoringDashboard | Protected |
| `/sentry-test` | SentryTest | Protected |
| `/image-test`, `/direct-test`, `/all-variants`, `/test-variants` | image/variant test pages | Protected |
| `/dev/sale-modal` | DevSaleModal | public |

### Public
| Path | Component | Wrapping |
|------|-----------|----------|
| `/` | LandingPage | public |
| `/submit-testimonial` | SubmitTestimonial | public |
| `/store/:slug` | StorefrontPage | public |
| `/invoice/:id` | PublicInvoiceView | public |
| `/a/:shareCode` | ContributionPublicView | public |

### Legacy redirects → `/settings`
`/store-settings`, `/config`, `/preferences`, `/business-settings`, `/account`, `/profile`. Plus `/landing` → `/` and `*` → `/`.

---

## 8. Supabase edge functions (supabase/functions/)

Local directory has 24 functions; deployed list shows 18 ACTIVE. The 6 local-only directories are likely WIP or one-off utilities.

| Function | Purpose | Deployed | Last deploy | Frontend caller |
|----------|---------|----------|-------------|-----------------|
| `ai-chat` | AI Chat (intelligent onboarding/help, v2.0.0 guardrails) | ACTIVE v154 | 2026-05-02 | (called from AIChatWidget — not via functions.invoke) |
| `apply-migration` | (helper) | not deployed | — | none |
| `approve-transaction-for-fulfillment` | Reviewer endpoint for high-value txn requiring review | ACTIVE v53 | 2026-05-13 | none in frontend |
| `check-tier-limits` | (no top comment found) | not deployed | — | none |
| **`create-paystack-subaccount`** | **Session 3: validates request + ownership + KYC + cooling period; calls Paystack to create subaccount** | ACTIVE v61 | 2026-05-16 | **SubaccountWizard.tsx** |
| `generate-business-summary` | Rebuilt 2026-05-03 — daily AI business summaries | ACTIVE v73 | 2026-05-03 | (BusinessInsights via scheduled trigger) |
| `generate-embedding` | OpenAI embedding for hybrid search | ACTIVE v65 | 2025-12-03 | **utils/docSearch.ts** |
| `initiate-marketplace-payment` | Session 1 STUB — multi-vendor marketplace cart | ACTIVE v53 | 2026-05-13 | none yet (stub) |
| **`initiate-storefront-payment`** | **Session 3: computes capped split, calls Paystack** | ACTIVE v60 | 2026-05-16 | (storefront checkout) |
| `manage-subscription` | Subscription lifecycle | ACTIVE v64 | 2026-03-14 | (SubscriptionUpgrade indirectly) |
| `paystack-subaccount-webhook` | Verifies HMAC; routes Paystack subaccount events | ACTIVE v53 | 2026-05-13 | (webhook, not frontend-called) |
| `paystack-webhook` | Main Paystack webhook handler | ACTIVE v67 | 2026-03-12 | (webhook) |
| `reject-transaction-and-freeze` | Reviewer endpoint — reject + freeze vendor | ACTIVE v53 | 2026-05-13 | none in frontend |
| **`resolve-bank-account`** | **Session 3: calls Paystack GET /bank/resolve (validates bank_code `/^\d{3,6}$/`)** | ACTIVE v58 | 2026-05-14 | **SubaccountWizard.tsx** |
| `run-migration` | (helper) | not deployed | — | none |
| `send-agent-message` | Send agent message in conversation | ACTIVE v64 | 2026-05-01 | (chat takeover) |
| `send-daily-reports` | Cron: daily WhatsApp reports (6 PM WAT) | ACTIVE v71 | 2026-05-02 | (cron only) |
| `send-push-notification` | Web Push send | ACTIVE v61 | 2026-05-01 | (server-side) |
| `update-free-tier` | (one-off backfill) | not deployed | — | none |
| `upgrade-existing-users` | (one-off backfill) | not deployed | — | none |
| `verify-subscription` | Verify Paystack subscription txn | ACTIVE v71 | 2026-03-17 | **SubscriptionUpgrade.tsx** |
| `verify-transaction` | Verify Paystack one-off txn | ACTIVE v64 | 2026-03-17 | (verify after redirect) |
| `whatsapp-webhook` | WhatsApp message receive | ACTIVE v65 | 2025-12-02 | (webhook) |

**Only 3 frontend `functions.invoke` callers found:** `create-paystack-subaccount`, `resolve-bank-account`, `send-email` (the `send-email` reference is in docSearch.ts but no edge function by that name is deployed — broken).

---

## 9. Database — RPCs (application-defined, excluding pgvector/citext/trgm/built-ins)

### KYC domain
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `submit_kyc_v1` | p_store_id, p_bvn, p_nin, p_phone, p_business_category, p_selfie_url, p_cac_rc_number, p_business_address, p_confirmation_accepted | Y |
| `approve_kyc_review` | p_kyc_id, p_reviewer_notes | Y |
| `reject_kyc_review` | p_kyc_id, p_rejection_category, p_reviewer_notes, p_freeze | Y |
| `encrypt_vendor_kyc_field` | plaintext | Y |
| `decrypt_vendor_kyc_field` | encrypted_data | Y |

### Paystack / vendor / velocity
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `complete_subaccount_onboarding` | p_store_id, p_settlement_bank, p_account_number, p_account_name, p_mock_code | Y |
| `grant_velocity_override` | p_store_id, p_daily_cap_kobo, p_monthly_cap_kobo, p_single_txn_cap_kobo, p_expires_at, p_reason | Y |
| `approve_review` | p_split_id, p_reviewer_id, p_notes | Y |
| `reject_review_and_freeze` | p_split_id, p_reviewer_id, p_reason | Y |
| `record_successful_payment` | p_reference, p_event_type, p_payload | Y |

### Subscription / tier
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `get_user_tier` | p_user_id | Y |
| `create_default_subscription` | — | Y |
| `can_add_product` | p_user_id | Y |
| `can_add_product_image` | p_user_id, p_product_id | Y |

### AI chat / chat
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `check_ai_chat_quota` | p_user_id | Y |
| `check_chat_quota` | p_user_id, p_context_type | Y |
| `fetch_conversation_messages_unrestricted` | p_session_id | Y |
| `refresh_conversation_messages` | p_conversation_id | Y |
| `search_documentation_vector` | query_embedding, match_threshold, match_count | N |
| `initiate_agent_takeover` | p_conversation_id, p_agent_id, p_agent_name | Y |
| `end_agent_takeover` | p_conversation_id, p_agent_id (uuid or text — 2 overloads) | Y |
| `send_agent_message` | p_conversation_id, p_message, p_agent_id | Y |
| `cleanup_old_rate_limits` | — | Y |
| `check_rate_limit` | p_identifier, p_max_per_hour | N |

### Inventory / sales
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `decrement_variant_quantity` | p_variant_id, p_quantity | Y |
| `get_variant_price` | p_variant_id | Y |
| `get_low_stock_products` | p_user_id | Y |
| `get_sales_summary` | p_user_id, p_start_date, p_end_date | Y |
| `confirm_pending_sales` | — | Y |
| `refresh_daily_sales_summary` | — | N |
| `validate_sale_product` | (trigger) | N |
| `update_product_boost_scores` | — | N |
| `search_marketplace_products` | search_query, filter_category, filter_location, min_price, max_price, result_limit | N |
| `upsert_customer` | p_user_id, p_customer_name, p_customer_phone, p_customer_email, p_order_amount, p_order_date | Y |
| `generate_store_slug` | business_name | N |

### Invoices
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `generate_invoice_number` | p_user_id | Y |
| `update_invoice_status` | p_invoice_id | Y |
| `mark_overdue_invoices` | — | Y |
| `trigger_update_invoice_status` | (trigger) | N |

### Referrals / affiliates
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `update_referral_milestones` | p_user_uid | Y |
| `increment_affiliate_clicks` | p_affiliate_id | Y |
| `increment_affiliate_signup` | p_affiliate_id | Y |
| `increment_affiliate_conversion` | p_affiliate_id, p_commission_kobo | Y |
| `deduct_affiliate_earnings` | p_affiliate_id, p_amount_kobo | Y |
| `get_affiliates_ready_for_payout` | — | Y |

### Misc / contributions / reviews / whatsapp
| Name | Args | SECURITY DEFINER |
|------|------|------------------|
| `check_inactive_members` | — | N |
| `update_member_payment_status` | (trigger) | N |
| `refresh_product_review_stats` | — | Y |
| `update_review_stats` | (trigger) | N |
| `update_review_helpfulness` | (trigger) | N |
| `get_product_image_count` | p_product_id | N |
| `get_user_context` | p_user_id | Y |
| `get_user_payment_history` | p_user_id | Y |
| `track_whatsapp_message` | p_store_id, p_customer_phone, p_message_text, p_ai_response, p_handled_by | Y |
| `log_whatsapp_debug` | p_store_id, p_event_type, p_details | N |
| `update_conversation_analytics` | (trigger) | N |
| `update_payment_transaction_updated_at` | (trigger) | N |
| `update_updated_at_column` | (trigger) | N |
| `fn_set_updated_at` | (trigger) | N |

---

## 10. Database — tables (77 public tables)

### Subscription / tier
| Table | Rows | Purpose |
|-------|------|---------|
| `subscription_tiers` | 4 | Tier definitions (free/starter/pro/business) |
| `subscriptions` | 1 | Legacy single subscription row |
| `user_subscriptions` | 25 | Active per-user subscription + Paystack ref |
| `user_onboarding_preferences` | 5 | Onboarding state |

### KYC / Paystack
| Table | Rows | Purpose |
|-------|------|---------|
| `vendor_kyc` | 0 | **KYC v1: BVN/NIN/selfie/address/business category (encrypted)** |
| `vendor_velocity_limits` | 1 | Per-vendor daily/monthly/single-txn caps |
| `vendor_velocity_overrides` | 0 | Reviewer-granted overrides |
| `paystack_subaccounts` | 1 | One subaccount per vendor (Card 1 state) |
| `paystack_split_transactions` | 8 | Marketplace split transactions |
| `paystack_logs` | 29 | F1/F2/F3 observability |
| `paystack_webhook_events` | 0 | Raw webhook payload archive |
| `platform_fee_config` | 3 | Platform cut config |
| `payment_transactions` | 0 | Generic payment transactions |
| `bank_accounts` | 2 | Legacy bank account records |

### AI chat
| Table | Rows | Purpose |
|-------|------|---------|
| `ai_chat_conversations` | 145 | Chat sessions |
| `ai_chat_messages` | 1433 | Per-message log |
| `ai_chat_usage` | 4 | Per-user monthly usage |
| `ai_chat_rate_limits` | 40 | Throttling |
| `chat_abuse_log` | 11 | Abuse incidents |
| `chat_analytics` | 40 | Analytics events |
| `chat_notifications` | 0 | Notification queue |
| `chat_rate_limits` | 23 | Generic chat rate limits |
| `conversation_analytics` | 45 | Per-conversation aggregates |
| `conversation_topics` | 0 | Topic classification |
| `agent_takeover_sessions` | 12 | Owner takeover sessions |
| `documentation` | 80 | RAG documentation chunks |
| `moderation_queue` | 0 | Manual moderation queue |

### Store / inventory / marketplace
| Table | Rows | Purpose |
|-------|------|---------|
| `stores` | 16 | Store profiles |
| `products` | 31 | Products |
| `product_variants` | 0 | Variant SKUs (unused) |
| `product_variants_view` | 31 | Variants view |
| `product_images` | 9 | Image gallery |
| `product_reviews` | 0 | Reviews |
| `product_review_stats` | 0 | Aggregated stats |
| `public_product_reviews` | 0 | Public-only view |
| `review_votes` | 0 | Helpful votes |
| `promo_codes` | 2 | Discount codes |
| `promo_code_usage` | 0 | Redemption log |
| `marketplace_analytics` | 0 | Marketplace events |

### Sales / orders / invoices
| Table | Rows | Purpose |
|-------|------|---------|
| `sales` | 53 | In-person sales |
| `orders` | 8 | Storefront orders |
| `order_items` | 8 | Order line items |
| `invoices` | 2 | B2B invoices |
| `invoice_items` | 2 | Line items |
| `invoice_payments` | 1 | Payments against invoice |
| `invoice_reminders` | 0 | Reminder schedule |
| `invoice_summary` | 2 | Summary view |
| `customers` | 0 | Customer records (currently empty — probably new) |
| `expenses` | 0 | Expense tracker |

### Contributions (ajo)
| Table | Rows | Purpose |
|-------|------|---------|
| `contribution_groups` | 10 | Savings groups |
| `contribution_members` | 28 | Group members |
| `contribution_payments` | 25 | Contributions in |
| `contribution_payouts` | 0 | Rotation payouts |
| `member_payment_status` | 28 | Per-member status (view/table) |

### WhatsApp
| Table | Rows | Purpose |
|-------|------|---------|
| `whatsapp_chats` | 0 | Chat threads |
| `whatsapp_messages` | 0 | Per-message log |
| `whatsapp_customers` | 0 | Customer profiles |
| `whatsapp_settings` | 0 | Per-store settings |
| `whatsapp_config` | 0 | Global config |
| `whatsapp_templates` | 0 | Message templates |
| `whatsapp_analytics` | 0 | Aggregates |
| `whatsapp_debug_log` | 0 | Debug log |
| `store_conversations` | 126 | Cross-channel conversations |
| `green_api_pool` | 0 | Green API instance pool |

### Auth-adjacent
| Table | Rows | Purpose |
|-------|------|---------|
| `users` | 24 | App-side user mirror (auth.users separate) |
| `staff_members` | 2 | Per-store staff (PIN-based) |
| `staff_activity_logs` | 14 | Staff actions |
| `login_attempts` | 424 | Failed login throttling |

### Referrals / affiliates
| Table | Rows | Purpose |
|-------|------|---------|
| `referrals` | 3 | Referrer/referee links |
| `referral_milestones` | 0 | Tier milestones |
| `referral_rewards` | 0 | Earned rewards |
| `affiliates` | 0 | Affiliate accounts |
| `affiliate_clicks` | 0 | Click tracking |
| `affiliate_sales` | 0 | Attributed sales |
| `affiliate_payouts` | 0 | Payout queue |

### Misc
| Table | Rows | Purpose |
|-------|------|---------|
| `error_logs` | 1315 | Sentry-mirrored error log |

---

## 11. Database — migrations

**Total:** 68 SQL migration files in `supabase/migrations/`.

**Last 10:**
```
20260516_fix_get_user_tier_rpc.sql
20260516_grant_velocity_override_rpc.sql
20260516_reject_kyc_review_rpc.sql
add-sales-channel.sql
create_ai_chat_tracking_tables.sql
create_ai_response_cache.sql
create_conversion_analytics.sql
fix-auto-subscription.sql
schema-2026-04-28.sql
update_subscription_tiers.sql
```
*(Note: `ls | tail -10` is alphabetical, not chronological — actual newest-by-date are the 20260516_* ones)*

**This session's 2026-05 migrations (KYC v1 + Paystack):**
| Migration | Purpose |
|-----------|---------|
| `20260514_paystack_logs.sql` | F1/F2/F3 observability table |
| `20260515_kyc_photos_storage.sql` | Supabase Storage bucket + RLS for KYC photos |
| `20260515_paul_super_admin_subscription.sql` | Seed super-admin subscription |
| `20260515_submit_kyc_v1_rpc.sql` | `submit_kyc_v1` RPC |
| `20260515_vendor_kyc_encryption_helpers.sql` | Encrypt/decrypt helpers |
| `20260515_vendor_kyc_extensions.sql` | 6 new columns on vendor_kyc |
| `20260515_vendor_velocity_overrides.sql` | Velocity overrides table |
| `20260516_approve_kyc_review_rpc.sql` | `approve_kyc_review` RPC |
| `20260516_fix_get_user_tier_rpc.sql` | Fix tier resolution (past_due + 7-day grace) |
| `20260516_grant_velocity_override_rpc.sql` | `grant_velocity_override` RPC |
| `20260516_reject_kyc_review_rpc.sql` | `reject_kyc_review` RPC (soft + hard) |

---

## 12. Third-party integrations

| Service | Use | Call sites |
|---------|-----|------------|
| **Paystack** | Subaccount creation, bank resolve, txn init/verify, webhooks, subscriptions | `components/payments/SubaccountWizard.tsx`, `components/SubscriptionUpgrade.tsx`, edge functions: `create-paystack-subaccount`, `resolve-bank-account`, `initiate-storefront-payment`, `initiate-marketplace-payment`, `paystack-webhook`, `paystack-subaccount-webhook`, `verify-subscription`, `verify-transaction`. **Knowledge base:** `src/data/paystack-knowledge.json`, `src/data/paystackDocumentation.ts` |
| **OpenAI** | Embeddings (`generate-embedding`) + AI chat | edge function `generate-embedding`, `utils/docSearch.ts` (calls via supabase.functions.invoke) |
| **Sentry** | Error monitoring | `src/lib/sentry.ts`, `src/pages/SentryTest.jsx` |
| **Firebase** | Legacy auth + products (being migrated) | `src/lib/firebase.js`, `src/services/firebaseProducts.js`, `src/services/dataMigration.js`, `src/lib/authService.js`, `src/components/FirebaseTest.jsx`, `firebase.json`, `firestore.rules`, `storage.rules` |
| **ImageKit** | Image CDN/transforms | `src/hooks/useImageUpload.ts`, `src/hooks/useSmartImage.ts`, `src/components/OptimizedImage.tsx`, `src/lib/imagekit.ts`. **`src/utils/imagekit.ts.DEPRECATED` exists** |
| **Twilio** | Inspected only — `src/components/WhatsAppAISettings.tsx` calls `https://api.twilio.com/2010-04-01/Accounts/...` (1 site, settings validation) | `WhatsAppAISettings.tsx:143` |
| **WhatsApp (Green API)** | Customer chat | `src/services/whatsappIntegration.ts`, edge function `whatsapp-webhook`, `green_api_pool` table |
| **Web Push (VAPID)** | Push notifications | `src/services/pushNotificationService.ts`, edge function `send-push-notification`, doc: `docs/VAPID_SETUP.md` |
| **Supabase** | Auth + DB + Storage + Edge Functions + Realtime | everywhere; `src/lib/supabase.js` |

**Not found:** Stripe, SendGrid, Resend, Anthropic, Groq, Gemini, Google APIs (other than firebase auth).

---

## 13. Bank list + Paystack-specific assets

**Bank list file:** `/home/ekhator1/smartstock-v2/src/utils/nigerianBanks.ts`

**Layout:**
- Lines 20-53: `REAL_NIGERIAN_BANKS: BankWithCode[]` — **27 entries** (real banks + Nigerian fintechs Opay/Kuda/Moniepoint/PalmPay)
- Lines 55-57: `testBanks` — **1 dev-only entry** (`Paystack Test Bank (dev only)`, code `001`), tree-shaken from prod by `import.meta.env.DEV`
- Lines 59-62: `NIGERIAN_BANKS_WITH_CODES` — combined export (28 in dev, 27 in prod)
- Lines 72-75: `NIGERIAN_BANKS: string[]` — legacy name-only list (sorted, adds `'Other'`)

**Entry format:** `{ name: string, code: string }` (interface `BankWithCode`)
- Codes are mostly 3-digit traditional, fintechs use 5-6 digit (Kuda `50211`, Moniepoint `50515`, Opay `999992`, PalmPay `999991`). Edge function `resolve-bank-account` validates `/^\d{3,6}$/`.

**Bank counts:**
- **27 real banks** in production
- **28 total** (27 real + 1 test) in dev builds
- **NOT 27** if you include the dev test bank — be careful

**Hardcoded.** Not fetched at runtime. No "refresh from Paystack" sync. Comment says "Codes verified against Paystack's /bank registry."

**Test combo (Paystack dev only):**
- `bank_code = '001'` + `account_number = '0000000000'` → bypasses 3-resolves-per-day Paystack quota on real banks. Documented in `nigerianBanks.ts:51-54`.

**Helpers exported:**
- `validateAccountNumber(s)` — 10-digit check
- `formatAccountNumber(s)` — digits only, 10-char cap
- `maskAccountNumber(s)` — masks all but last 4
- `getBankNameByCode(code)` — reverse lookup, returns `"Unknown bank"` on miss

**Other Paystack assets:**
- `src/data/paystack-knowledge.json` — RAG knowledge base
- `src/data/paystackDocumentation.ts` — typed docs
- `src/components/PaystackHelp.tsx` — **legacy** help page (predates Card 1/2)
- `src/utils/paystackSettings.ts` — settings utilities

---

## 14. Strings / i18n

**Strings file:** `src/locales/strings.json`

**Hook:** `src/hooks/useStrings.js`
```js
import strings from '../locales/strings.json';
export function useStrings() {
  return strings;
}
```

**Top-level keys (7):** `app`, `common`, `credits`, `dashboard`, `paystackSetup`, `plans`, `toasts`

**Languages supported:** 1 (English only — no language switcher, no per-locale files).

**Usage pattern:**
```js
const strings = useStrings();
const t = strings.paystackSetup;   // alias by section
// then: t.cardTitle, t.bankResolveCta, etc.
```
Confirmed in `src/pages/PaymentSetup.tsx:55` and `:462` (two `t` aliases in same file for different sections).

---

## 15. Styling approach (confirmed)

| Check | Status |
|-------|--------|
| `tailwind.config.*` file at root | **Absent** |
| `postcss.config.*` file at root | **Absent** |
| `tailwind`/`postcss` in `package.json` | **Absent** (zero matches) |
| `src/styles/tailwind.css` exists | **Yes — 58 bytes**, contains only `@tailwind base/components/utilities` |
| `src/styles/tailwind.css` imported in `src/main.jsx:5` | **Yes — dead import** (no compiler runs over it; no tailwind utility class works) |
| Inline styles dominant on KYC payment work | Confirmed — `PaymentSetup.tsx` and `SubaccountWizard.tsx` use object-literal `style={{}}` heavily |
| Legacy CSS in `src/styles/` | 20 .css files (cart, dashboard, dashboard-minimal, floating-effects, forced-improvements, getting-started, header-icons, iconbuttons, modern-buttons, order-confirmation, quick-polish, receipt, sales, store-settings, storefront, tailwind, tokens-v2, tokens, whatsapp-support, zfix) — none newer than 2026-03. **`BusinessSettings.css.old` is a renamed-out legacy file** |

**New styling files since UX audit?** No. Latest mtime in `src/styles/` is `dashboard-minimal.css` from 2026-03-26.

---

## 16. Docs (docs/)

| File | Description |
|------|-------------|
| `AI_COST_OPTIMIZATION.md` | AI chat cost guide for 100k DAU |
| `CHARGEBACK-AND-SETTLEMENT-NOTES.md` | Chargeback + settlement delay strategy (12 May 2026) |
| `CHAT_FEATURES_IMPLEMENTATION_GUIDE.md` | Chat features implementation guide |
| `CHAT_WIDGET_SYSTEM.md` | "CRITICAL SINGLE SOURCE OF TRUTH" for chat widget ops |
| `CONVERSATION_DEBUGGING_GUIDE.md` | Conversation chat widget debugging |
| **`KYC_V1_FOCUS_RULES.md`** | **What NOT to build in KYC v1 — scope discipline for Sessions 4-6** |
| **`KYC_V1_FRONTEND_PATTERNS.md`** | **LOCKED reference for all Session 5 frontend prompts** |
| **`KYC_V1_SPEC.md`** | **Approved KYC v1 spec (v2 — schema-reconciled)** |
| `MARKETPLACE-INVENTORY-2026-05-08.md` | Pre-Paystack-design marketplace artifact inventory |
| `NOTIFICATION_DEBUG_LOGS.md` | Owner notification debug logging |
| **`PAYSTACK-DEBUG.md`** | **Paystack subaccounts ops: feature flags, deploy/rollback, error codes** |
| **`PAYSTACK-SUBACCOUNTS-DESIGN.md`** | **Session 1 design doc — original architecture** |
| `SESSION-2-MIGRATION-CHECKLIST.md` | Session 2 mock-data cleanup (12 May 2026) |
| **`SESSION_4_LESSONS_CAPTURED.md`** | **Session 4 build lessons (15-16 May 2026) — patterns/gotchas** |
| `VAPID_SETUP.md` | Web Push VAPID key setup |
| `WEB_PUSH_IMPLEMENTATION.md` | Web push implementation summary |
| `WHATSAPP_AI_DEBUG_GUIDE.md` | WhatsApp AI debug/troubleshoot |
| `fix-realtime-websocket.md` | Realtime CHANNEL_ERROR fix |
| `sql-tests/` | (directory — SQL test files) |

**Important KYC/Paystack docs (must-read before touching KYC):** `KYC_V1_SPEC.md`, `KYC_V1_FOCUS_RULES.md`, `KYC_V1_FRONTEND_PATTERNS.md`, `SESSION_4_LESSONS_CAPTURED.md`, `PAYSTACK-SUBACCOUNTS-DESIGN.md`, `PAYSTACK-DEBUG.md`, `CHARGEBACK-AND-SETTLEMENT-NOTES.md`.

---

## 17. Branches + recent commits

**Branches:**
```
* feat/kyc-wizard-v1       (current; 2 ahead of origin)
  feat/paystack-subaccounts
  feature/tax-calculator-phase1
  main
  ui/stage-e-sales-history
  remotes/origin/feat/kyc-wizard-v1
  remotes/origin/feat/paystack-subaccounts
  remotes/origin/main
  remotes/origin/ui/stage-e-sales-history
```

**Possibly abandoned:** `feature/tax-calculator-phase1` (no remote tracking shown), `ui/stage-e-sales-history` (last touched before KYC work began).

**Last 30 commits (current branch):**
```
9fbdeb1 feat(kyc): step 5.2 - Card 2 status states (6 states, no counter, soft needs_review copy)
9da2849 feat(kyc): step 5.1 - Card 1 tier_locked state (use fixed get_user_tier RPC)
90150f4 feat(subscription): fix get_user_tier RPC to mirror submit_kyc_v1 (item 3 of 3, item 2 deferred)
a671e9b feat(subscription): align resolveActiveTier with submit_kyc_v1 (past_due + 7-day grace)
1715d4e docs(kyc): frontend patterns extracted from existing PaymentSetup + SubaccountWizard
71a48f2 docs(kyc): defer step 7 (email notification) to Phase 1.5
8504086 feat(kyc): step 6 - reviewer Phase 1 bash scripts (list/review/approve/reject/freeze)
1c6f9ce feat(kyc): step 5 - F3 velocity override lookup (defer single-txn enforcement to v1.5, override bites regardless of tier default)
14b0ad5 feat(kyc): step 4 - F2/F3 tier guards (spec fix: jsonResponse + real var names + reorder F2 helper above idempotency)
08da8b5 feat(kyc): step 3d - grant_velocity_override RPC
7b4e9d4 feat(kyc): step 3c - reject_kyc_review RPC (soft + hard rejection)
89845d9 feat(kyc): step 3b - approve_kyc_review RPC
633d28c docs(kyc): capture lessons from Session 4 spec-vs-reality defects
485e3cc feat(kyc): step 3a - submit_kyc_v1 RPC (spec fix: cast auth.uid() to text for stores.user_id)
818bd7d feat(kyc): step 2 - Supabase Storage bucket + RLS for KYC photos
84e9839 feat(kyc): step 1d - Paul super-admin subscription (spec fix: DELETE+INSERT, no ON CONFLICT)
cb3631c feat(kyc): step 1c - vendor_velocity_overrides table (spec fix: drop unworkable partial index)
272ed6e feat(kyc): step 1b - encryption helpers (encrypt + fix decrypt schema qualification)
589c6b6 feat(kyc): step 1a - vendor_kyc table extensions (6 new columns)
23cc953 docs(kyc): reconcile spec v2 with existing vendor_kyc schema
4029a75 docs(kyc): KYC v1 spec + focus rules for scope discipline
c8bbcb5 feat(payments): show subaccount status on /settings/payments Card 1
a9247b8 chore(payments): add dev-only test bank for local wizard testing
0543d23 feat(payments): F2 idempotency + shared tier helper + F1 rate limit calibration
85270de chore(payments): file TODO(prevent-orphan-subaccount) on F2
f7970fb feat(payments): wire F2 + F3 to paystack_logs observability
e43d03c feat(payments): add paystack_logs observability table + wire into F1
0b5fd08 Session 3 F3: wire initiate-storefront-payment with real Paystack API
8eee94a Session 3 F2: wire create-paystack-subaccount with real Paystack API
cd6dff1 Session 3 F1: wire resolve-bank-account with real Paystack API
```

---

## 18. Things that look unfinished or abandoned

- **TODOs/FIXMEs/XXX in src/:** **37 total** (mostly placeholders like `0XXXXXXXXX`, real TODOs are a small subset)
- **Sample real TODOs:**
  - `hooks/useContextualPrompts.ts:74` — "Track WhatsApp message count if needed"
  - `pages/DebugCenter.tsx` (see grep) — debug-only
  - `services/affiliateService.ts:352` — "Send email notification"
  - `pages/PaymentSetup.tsx:32` — `TODO(reviewer-reject): State D — paystack_subaccounts has no [rejected state]`
  - `components/WhatsAppAnalyticsDashboard.tsx:91` — "Fetch actual product names"
  - `components/DocViewer.tsx:30` — "Send feedback to analytics"
  - `components/BusinessSettings.tsx.backup:231` — "Wire to actual reset function" (in backup — ignore)
- **Backup / legacy files in src/:** **22 found**, including:
  - 3 `App.jsx.backup*`
  - 4 `Dashboard.tsx.backup*`
  - 4 `BusinessSettings.tsx.backup*` / `.old`
  - 4 `StoreSettings.tsx.backup*`
  - 3 `OnlineStoreSetup.tsx.backup*` / `StoreQuickSetup.tsx.backup*`
  - `MoreMenu.tsx.backup-before-modal-fix`, `MoreMenu.tsx.pre-modal-fix`
  - `AIChatWidget.tsx.backup-push-relay`
  - `BusinessInsights.tsx.backup-security-fix`
  - `LandingPage.tsx.backup`
  - `documentation.ts.backup`, `documentation_new.ts`, `documentation-backup-before-refactor.ts`
  - `BusinessSettings.css.old`, `BusinessSettings_OLD.tsx`
- **Orphaned pages** (defined but no route): `AIChatAnalyticsPage`, `ChatHistory`, `ExpensesPage`, `MoneyPage`, `TestPayment`, `TestPaymentStatus`
- **Orphaned competing AIChatWidget variants:** `.enhanced.tsx`, `-enhanced-bubble.tsx`, `-fixed.tsx`, `-quota-fix.tsx` — only one is the canonical
- **Conversation component proliferation:** `components/dashboard/` has ~10 competing implementations (`StorehouseConversations`, `WorldClassConversations`, `PremiumConversations`, `EnhancedConversations`, `CleanConversations`, `ConversationsSimplified`, `ConversationsSimplifiedFixed`, `ConversationsUltraSimple`, `ConversationsViewer`, `ConversationsViewerSafe`, `ConversationsViewerSimple`, `ConversationsPageFixed`)
- **Edge functions defined locally but not deployed:** `apply-migration`, `check-tier-limits`, `run-migration`, `update-free-tier`, `upgrade-existing-users` (5)
- **Broken function invoke:** `docSearch.ts` references `'send-email'` which has no deployed function
- **`src/utils/imagekit.ts.DEPRECATED`** — explicitly flagged but not deleted
- **`src/styles/tailwind.css`** — imported in main.jsx, contains tailwind directives, but no tailwind compiler in build (dead 58 bytes)

---

## 19. Honest summary

- **What this codebase IS:** A React/Vite single-page app for Nigerian small-business inventory + storefront + WhatsApp ops, with Supabase Postgres + Edge Functions backing it. ~40 pages, ~120 components, 77 DB tables, 18 deployed edge functions. Currently 4-5 sessions deep into a KYC v1 + Paystack subaccount build on `feat/kyc-wizard-v1`.

- **What feels solid:** The Paystack subaccount/KYC slice on this branch is well-organized — 11 dated migrations, paired RPCs (submit/approve/reject), edge functions wired to `paystack_logs` observability, a locked frontend-patterns doc, and explicit "what NOT to build" focus rules. Subscription tier resolution was just fixed to mirror `submit_kyc_v1` behavior (past_due + 7-day grace). The contributions/ajo, invoices, and sales domains all have clean service + table separation.

- **What feels incomplete or risky:**
  - **No CSS framework**: `tailwind.css` is imported but no compiler exists — every utility class silently fails. New work inline-styles everything (PaymentSetup, SubaccountWizard).
  - **22 backup files in src/** — a `git clean -n` would help but they may be intentional safety nets; should at least be `.gitignored` under a `legacy/` move.
  - **`components/dashboard/`** has ~10 competing conversation viewer variants. Real one unclear without reading App imports.
  - **5 AIChatWidget variants** — only one is canonical.
  - **6 orphaned pages** importable but unrouted.
  - **Legacy Paystack stack still in tree** (`PaystackHelp.tsx`, `PaymentSettings.tsx`, `PaymentLinkCard.jsx`, `PaymentMethodsManager.tsx`) coexists with the new Card 1/Card 2 system at `/settings/payments`.
  - `customers` table has 0 rows but the page exists — either the page is brand-new or `customers` isn't backing it.
  - `docSearch.ts` calls a non-existent `send-email` edge function.

- **What surprised me during the audit:**
  - **Bank list contains 28 entries in dev, 27 in production** — the +1 is `Paystack Test Bank (dev only)` tree-shaken by Vite. Any prompt assuming "27 banks" is right *for prod only*.
  - **`getUserTier`** is a SECURITY DEFINER RPC, not a direct table read. It was just fixed (`20260516_fix_get_user_tier_rpc.sql`) to align with `submit_kyc_v1`'s tier resolution (`past_due` + 7-day grace).
  - The KYC RPCs already include hard+soft rejection (`p_freeze boolean` arg on `reject_kyc_review`) and the velocity override system is fully built out.
  - There's a separate `feat/paystack-subaccounts` branch — KYC was clearly built on top of it.
  - The `submit_kyc_v1` RPC was implemented with a deliberate `cast auth.uid() to text for stores.user_id` — a spec-fix commit message warns about this. Easy to break.

- **Things relevant to this session's "discover-and-amend" cycles:**
  1. **Bank count = 27 in prod, 28 in dev.** If you tested locally and saw 28 → that includes the dev test bank `001`. Production users will see 27.
  2. **Legacy Paystack UI exists side-by-side with new Card 1/Card 2 system** — `PaystackHelp.tsx`, `PaymentSettings.tsx`, `PaymentLinkCard.jsx`, `PaymentMethodsManager.tsx`. Don't add a "Paystack help" feature without first checking if `PaystackHelp.tsx` covers it.
  3. **`/upgrade` already exists** at `components/SubscriptionUpgrade.tsx` with a Paystack flow + verify-subscription edge function. Don't reinvent it for tier-locked nudges.
  4. **`get_user_tier` is an RPC, not a column.** Any frontend that reads `user_subscriptions.tier` directly will lag behind `get_user_tier`'s 7-day-grace logic (just fixed in `20260516_fix_get_user_tier_rpc.sql`).
  5. **State D ("rejected") is explicitly TODO'd in PaymentSetup.tsx:32** — `paystack_subaccounts` has no rejected state yet. If a Card 2 status needs rejected, account for missing State D.
  6. **`useStrings()` returns ALL keys at once.** Pattern is to alias `const t = strings.paystackSetup` per section. Adding new copy means editing `src/locales/strings.json` directly.
  7. **`docs/KYC_V1_FRONTEND_PATTERNS.md` is "LOCKED"** — Session 5 prompts must consult it. The doc was extracted FROM the existing PaymentSetup + SubaccountWizard, so those two files are the de-facto reference implementation.
  8. **`docs/SESSION_4_LESSONS_CAPTURED.md`** documents prior spec-vs-reality defects from the prior session — read first to avoid repeating them.
  9. **No tailwind. Inline styles only.** New KYC UI must follow the inline-style pattern of PaymentSetup.tsx/SubaccountWizard.tsx, not introduce className-driven CSS.
  10. **There's a `feat/paystack-subaccounts` branch** that current KYC branch is built on top of — diff with `feat/paystack-subaccounts` (not `main`) when reviewing KYC-only changes.
  11. **`paystack_subaccounts` table has 1 row, `vendor_kyc` has 0 rows.** No real users have done KYC yet — all flows are pre-launch.
  12. **Marketplace artifacts are intentional WIP, not orphans.** See §20 for the full inventory. Marketplace is being built in parallel with KYC v1, currently hidden from the public, soft target for reveal 3-6 months out (gated on readiness, not deadline). Do NOT delete `marketplace.ts`, `MarketplaceSettings.tsx`, `initiate-marketplace-payment`, `paystack_split_transactions`, or the review RPCs without explicit discussion.

---

## 20. Marketplace infrastructure (intentional WIP — NOT dead code)

**Status:** Active parallel build. Infrastructure is being developed NOW alongside KYC v1. Currently HIDDEN from the public. Soft target for public reveal: 3-6 months out (Aug-Nov 2026). Reveal date is gated on readiness, NOT a fixed deadline. The aim is to have the infrastructure complete BEFORE public reveal, so launch is a marketing decision, not a build-from-scratch decision.

**DO NOT delete or refactor marketplace artifacts without explicit discussion.**

### Why this section exists

The original audit (sections 4, 8, 9, 10, 16) cataloged marketplace artifacts scattered across the report. A future reader might mistakenly treat them as orphan stubs and remove them. They are not orphans — they are foundation for the next major product surface, currently being built in parallel.

### What Storehouse Marketplace IS

A public-facing discovery surface where Nigerian buyers will browse products across many merchants on Storehouse. Unlike a merchant's private storefront (`/store/:slug` — direct WhatsApp link), the marketplace lets strangers find merchants they didn't already know about. Paystack handles checkout; splits route payment to the correct merchant via subaccounts.

### Why marketplace requires KYC v1

A merchant selling to their own existing customers via a WhatsApp link is one trust model — buyer already chose to engage. A merchant listed on a marketplace and sold to strangers is a different trust model — Storehouse is implicitly vouching for everyone listed. Without KYC, marketplace fraud becomes a Storehouse reputation problem.

KYC v1 is the upstream gate. Marketplace launches only after KYC v1 has been battle-tested with real merchants. The sequence:

1. **Now → ~3 weeks:** Finish KYC v1 frontend, ship merchant #1
2. **~3 weeks → ~3 months:** Real merchant pilot (3-10 merchants), surface edge cases, harden reviewer ops, fix bugs from real usage
3. **In parallel:** Marketplace frontend built behind a feature flag, internal testing only
4. **~3-6 months out:** Marketplace pre-reveal readiness — buyer-side TOS, dispute/refund policy, content moderation, Smile Identity at scale, marketing alignment
5. **Public reveal:** When infrastructure is ready, not on a fixed date

### Marketplace artifacts currently in the tree

| Artifact | Type | Status |
|---|---|---|
| `src/services/marketplace.ts` | Service module | Feature flags + helpers (`isMarketplaceEnabled`, `arePublicStoresEnabled`, `arePremiumTiersEnabled`, etc.) |
| `src/components/MarketplaceSettings.tsx` | Component | Per-merchant marketplace opt-in settings UI |
| `supabase/functions/initiate-marketplace-payment/` | Edge function | Stub. ACTIVE v53, deployed 2026-05-13. Multi-vendor cart entry point. No frontend caller yet |
| `paystack_split_transactions` | Table | 8 historical rows (test data proving split routing works) |
| `marketplace_analytics` | Table | 0 rows. Reserved for launch metrics |
| `search_marketplace_products` RPC | DB function | Discovery / search |
| `approve_review` RPC | DB function | Marketplace transaction-level review |
| `reject_review_and_freeze` RPC | DB function | Marketplace transaction rejection + vendor freeze |
| `record_successful_payment` RPC | DB function | Webhook handler — used by both storefront AND marketplace flows |
| `docs/MARKETPLACE-INVENTORY-2026-05-08.md` | Doc | Pre-build artifact inventory (2026-05-08, before Paystack subaccount work) |

### Marketplace-specific pre-reveal gates (NOT required for merchant #1)

These are gates for public marketplace reveal, NOT for KYC v1 / merchant #1. File these for "later" planning:

- Buyer-side TOS (different from merchant TOS)
- Dispute / refund policy (buyer protection, since they don't know the merchant directly)
- Content moderation policy (what merchants can/can't list publicly)
- Smile Identity at scale (per spec, replaces manual KYC after first 50 merchants)
- Marketplace-specific webhook robustness (volume + dispute trail)
- Marketing alignment (landing page, FAQ updates, launch comms)
- Reviewer web UI (bash scripts won't scale to marketplace transaction volume)

### Rules of engagement

1. **DO NOT delete any of the listed marketplace artifacts** without explicit discussion. They look like dead code; they are not.
2. **DO NOT rebuild or duplicate.** When adding marketplace features, build on what's already there.
3. **DO check this section before adding new payment-flow code.** Many infrastructure pieces (subaccounts, splits, review RPCs) are already shared between storefront and marketplace flows.
4. **DO update this section when marketplace progresses.** As marketplace approaches reveal, artifacts move from "intentional WIP" to "active production." Update status column accordingly.
5. **DO NOT add a fixed launch date here.** The reveal is gated on readiness, not calendar. Range is 3-6 months from this audit; adjust if KYC v1 or merchant pilot takes longer.

### Relationship to current KYC v1 work

KYC v1 (feat/kyc-wizard-v1) is foundational to both:
- Individual storefront merchants accepting payment via Paystack subaccounts (immediate use, ~3 weeks from this audit)
- Marketplace public reveal on top of the KYC'd merchant base (later, 3-6 months out)

Every wizard step, every reviewer flow, every velocity limit set in KYC v1 carries forward to marketplace. The work is NOT vertical-specific — it's foundation infrastructure.

When writing prompts about KYC v1 work, consider both surfaces:
- Will this work for an individual merchant on their private storefront? (immediate need)
- Will this work for a merchant being discovered by a stranger on the marketplace? (3-6 month need)

If a decision is right for one but wrong for the other, flag it.
