# LEARNINGS

> Raw capture log. Not polished. Each session appends; the proper skills/docs get
> written from this material in a later session. Do not treat this as current-state
> truth — it is dated session material.

---

## 2026-08-02 — Edge-function `verify_jwt` drift (live webhook outage, near-miss)

**Worked example: deploy flags are part of the deploy, not an afterthought.**

While deploying the Blossom webhook-forward bridge, I redeployed `paystack-webhook-router`
(and `create-paystack-subaccount`) with plain `supabase functions deploy` — **no
`--no-verify-jwt`**. The CLI defaults `verify_jwt=true` and flips it on every deploy. For a
webhook function that is fatal: the Supabase **gateway rejects the request before the code
runs** (`UNAUTHORIZED_NO_AUTH_HEADER`), because Paystack sends no JWT. So every real Paystack
webhook would 401 at the gateway, the code never executes, and **money events silently never
process** — with *no error in the function logs*, because there is nothing to log.

- **How it was caught:** not by process — by an unrelated verification curl (the Blossom
  BLS_ proof) that came back as a gateway 401 instead of `bad_signature`. Pure luck of
  sequencing.
- **Exposure window:** 2026-08-02 22:43:34 → ~00:09 UTC (~1h26m).
- **Realized impact: ZERO.** No checkout traffic, no `charge.success`, no orders created or
  stranded in the window (last webhook event 2026-07-30; last order 2026-07-30). The gate was
  down but nothing knocked. Luck, not correctness.
- **Fix:** redeploy with `--no-verify-jwt`; confirmed `verify_jwt=false` by **reading the
  management API** (not the CLI output), and live-probed that a no-auth POST now returns the
  function's `bad_signature`.

**Lesson (now a CLAUDE.md deploy-gate checklist):** (1) webhook/public-facing edge functions
MUST deploy with `--no-verify-jwt`; (2) READ the flag back from the management API post-deploy
and report it, never assume the CLI applied it; (3) RECORD the before-state of every flag
before redeploying a money-path function so drift is detectable. Also gap in my own process:
I did not record the before-flag, so I could only *infer* (from the sibling webhook fn reading
`false`) that my deploy caused the flip — recording it would have made it provable.

---

## 2026-06-17 — Chat widget debug session (capture-only)

Deployment confirmed live this session (last prod deploy ~19m before this note;
commits c740363 + 93bfcae auto-deployed via Vercel git integration).

### 1. Bugs fixed tonight
- **(a) `.gte` render fix for timestamp-collision drop** — commit `c740363`.
  AI replies that landed at the same timestamp as the poll cursor were dropped on
  render. Fix: inclusive poll boundary + id-based dedup so later replies render.
- **(b) Subdomain `storeSlug` routing fix** — commit `93bfcae`.
  Subdomain storefronts sent `storeSlug=undefined`, so the request fell through to
  the **marketing** handler instead of the **storefront/product-assistant** handler.
  Fix routes subdomain storefronts to the product assistant.

### 2. Parked follow-ups (NOT done — for a fresh session)
- **Greeting fast-path returns without inserting** — the greeting fast-path replies
  without inserting the message row. Edge fix needed.
- **Edge not hardened against missing `storeSlug`** — the dispatch still doesn't
  fail safe when `storeSlug` is absent; it falls to marketing. Harden the edge.
- **`~/.supabase-paystack-dburl` stale since ~Jun-13** — confirmed this session:
  psql against the pooler returns `FATAL: password authentication failed for user
  "postgres"`. Refresh the stored connection string. (Founder-dashboard writes this
  session went through the Supabase MCP instead.)

### 3. Key lessons (raw — for a future bug-triage skill)
- **"Saved in DB ≠ rendered on screen."** Verify the *observable* (what the user
  sees), not just that the data persisted. The `.gte` bug had correct DB rows but a
  dropped render.
- **"Worked-before-broke-now → `git log`/`blame` FIRST."** Don't theorise; find the
  commit that changed behaviour before forming a hypothesis.
- **"Verify the premise with a query before theorizing."** Confirm the assumed state
  (e.g. is the row actually there? is storeSlug actually undefined?) with a real
  query before building a theory on top of it.
- **"Separate tangled bugs explicitly, park the others."** Two genuinely independent
  bugs were entangled tonight; name them as separate and park the ones you're not
  fixing rather than fixing-by-accident.

### 4. For docs/CHAT_WIDGET_SYSTEM.md (future update — NOT done this session)
- **Render contract:** poll-only, never optimistic. Messages appear via the poll, not
  via optimistic local append.
- **Dispatch contract:** needs `contextType` + `storeSlug`, or it falls to the
  marketing handler.
- **Slug resolution:** subdomain vs path slug resolution differ — subdomain path was
  the one sending `storeSlug=undefined`.
- **Two known-separate bugs:** the `.gte` render-drop (c740363) and the subdomain
  routing fall-through (93bfcae) are independent — document as separate.

### Side-note (already tracked elsewhere — not new)
- The ImageKit `srcset` "unknown descriptor" / dropped-candidate console errors seen
  at session start are the **operator-precedence bug in `imagekit.ts`** already logged
  under Storehouse workstream "Performance for slow networks (PERF-01/02)" — fix is
  "parenthesise the imagekit srcset guard". Not part of tonight's chat work.

---

## 2026-06-17 — Chat-widget troubleshooting RUNBOOK (capture-only)

> Source material for a future bug-triage skill + `docs/CHAT_WIDGET_SYSTEM.md` update.
> Captured verbatim-faithful from the session. NOT executed this session (widget not
> reported broken). Build the skill in a fresh session.

**FIRST PRINCIPLE:** "saved in the DB" ≠ "rendered on screen." Different tests. Verify
the OBSERVABLE thing (does a reply appear in the widget, multi-turn), never just a DB
row count. Tonight's marathon happened because a DB check (replies saved 6/6) was
mistaken for "fixed" when the real failure was render/routing.

### Diagnostic order (in sequence — do NOT theorise from code first)

1. **CHECK THE LIVE RESPONSE.** On the affected URL: DevTools → Network → the `ai-chat`
   request → Response JSON. Two fields decide everything:
   - `source`: `"ai"` = storefront product assistant (correct). A marketing/pricing
     pitch with no `source` and `conversationId: null` → request hit the **MARKETING**
     handler, not the storefront one. Root cause: `storeSlug` missing (see #4).
   - `conversationId`: `null` on a storefront request → poll never starts → no replies
     render. Symptom of wrong-handler routing.

2. **CHECK THE CONSOLE.** Look for `[RAW-POLL-DATA]` lines firing every ~3s.
   - ABSENT → polling loop isn't running → replies never fetched even if saved.
   - Present but no reply renders → render/dedup issue.

3. **CONFIRM SAVE vs RENDER with SQL** (psql via `~/.supabase-paystack-dburl`, or
   Supabase MCP):
   ```sql
   select role, content, created_at from ai_chat_messages
   where conversation_id = '<id>' order by created_at;
   ```
   - Assistant rows EXIST but don't render → **READ/render bug** (poll, cursor, dedup).
   - Assistant rows MISSING → **WRITE bug** (edge function not inserting).

4. **URL / ROUTING.** Subdomain (`osayi.storehouse.ng`) and path (`/store/osayi`)
   resolve the store slug **differently**. The widget needs `contextType` + `storeSlug`
   truthy or the edge dispatch (`ai-chat/index.ts` ~869) falls through to the marketing
   handler. Subdomain-case fix lives at `StorefrontPage.tsx` (pass
   `store?.storeSlug ?? slug`).

5. **"WORKED BEFORE, BROKE NOW" → git FIRST, before reading current code:**
   ```
   git log --oneline -- src/components/AIChatWidget.tsx supabase/functions/ai-chat/
   git log -p -L '/<anchor>/,+10:<file>'   # history of a specific block
   ```
   A half-shipped prior fix is a common cause (tonight: a 2-part fix where only part 1
   landed).

### Known separate bugs (as of 17 Jun 2026)
- **Greeting fast-path:** bare "Hello"/"hi" hits a fast-path that returns WITHOUT saving
  the reply (`ai-chat/index.ts` ~2731). No render fix can rescue an unsaved reply.
  **Test with a PRODUCT question, not a greeting.**
- **Edge not hardened against missing `storeSlug`** (falls to marketing). Fix is
  client-side.

### Render contract (do not violate)
Replies render ONLY from DB polling, never optimistic. Cursor is server-time
`created_at` with an inclusive `.gte` boundary + id-based dedup.

### Rollback
Frontend change → Vercel "Promote last good deploy" (~10s), or
`git revert <commit> && git push`.
