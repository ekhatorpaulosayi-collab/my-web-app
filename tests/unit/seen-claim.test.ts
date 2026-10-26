import assert from 'node:assert/strict';
import test from 'node:test';
import { AtomicChatQuota, decideChatReserve } from '../../supabase/functions/_shared/chatQuota.ts';
import { HASH_BUCKET_MS, messageFallbackId } from '../../supabase/functions/_shared/messageFallbackId.ts';
import {
  CLEANUP_EVERY,
  CLEANUP_INTERVAL_MS,
  HEARTBEAT_MS,
  MemorySeenStore,
  PENDING_TTL_MS,
  claimDelivery,
  claimWithPrevious,
  startClaimHeartbeat,
} from '../../supabase/functions/_shared/seenClaim.ts';

test('three concurrent claims produce one reply', async () => {
  const store = new MemorySeenStore();
  const results = await Promise.all([
    claimDelivery(store, 'SM123'),
    claimDelivery(store, 'SM123'),
    claimDelivery(store, 'SM123'),
  ]);
  assert.deepEqual(results.filter((result) => result === 'claimed'), ['claimed']);
  assert.equal(results.filter((result) => result === 'pending').length, 2);
  assert.equal(results.filter((result) => result === 'replay').length, 0);
  assert.equal(store.rows.size, 1);
});

test('a failed send releases the claim so a retry can reply', async () => {
  const store = new MemorySeenStore();
  assert.equal(await claimDelivery(store, 'SM123'), 'claimed');
  await store.releasePending('SM123');
  assert.equal(await claimDelivery(store, 'SM123'), 'claimed');
  await store.markSent('SM123');
  assert.equal(await claimDelivery(store, 'SM123'), 'replay');
});

test('a pending claim expires so a stuck delivery can be retried', async () => {
  const store = new MemorySeenStore();
  const start = 1_700_000_000_000;
  assert.equal(await claimDelivery(store, 'SM123', start), 'claimed');
  assert.equal(await claimDelivery(store, 'SM123', start + PENDING_TTL_MS - 1), 'pending');
  assert.equal(await claimDelivery(store, 'SM123', start + PENDING_TTL_MS), 'claimed');
});

test('a heartbeat keeps a pending claim from expiring during the AI step', async () => {
  const store = new MemorySeenStore();
  const start = 1_700_000_000_000;
  assert.equal(await claimDelivery(store, 'SM123', start), 'claimed');
  let now = start;
  const stop = startClaimHeartbeat(async () => {
    now += HEARTBEAT_MS;
    await store.touchPending('SM123', now);
  }, 15);
  await new Promise((resolve) => setTimeout(resolve, 80));
  stop();
  assert.equal(await claimDelivery(store, 'SM123', start + PENDING_TTL_MS), 'pending');
  assert.ok(HEARTBEAT_MS < PENDING_TTL_MS);
});

test('a no-id retry in the next bucket still matches the previous one', async () => {
  const store = new MemorySeenStore();
  const now = Date.parse('2026-10-25T12:00:00Z');
  const parts = ['twilio', '234801', '234802', 'hello'];
  const previous = await messageFallbackId(parts, now);
  const current = await messageFallbackId(parts, now + HASH_BUCKET_MS);
  assert.notEqual(previous, current);
  assert.equal(await claimWithPrevious(store, previous, '', now + 1), 'claimed');
  assert.equal(await claimWithPrevious(store, current, previous, now + HASH_BUCKET_MS), 'pending');
  await store.markSent(previous);
  assert.equal(await claimWithPrevious(store, current, previous, now + HASH_BUCKET_MS), 'replay');
});

test('an existing customer under the catalogue limit is allowed', () => {
  const open = decideChatReserve({
    hasSubscription: true,
    grandfathered: false,
    used: 0,
    limit: 30,
    periodStartedThisMonth: true,
  });
  assert.equal(open.reserved, true);
  assert.equal(open.used, 1);
  const full = decideChatReserve({
    hasSubscription: true,
    grandfathered: false,
    used: 30,
    limit: 30,
    periodStartedThisMonth: true,
  });
  assert.equal(full.reserved, false);
  assert.equal(full.used, 30);
  const grandfathered = decideChatReserve({
    hasSubscription: true,
    grandfathered: true,
    used: 30,
    limit: 30,
    periodStartedThisMonth: true,
  });
  assert.equal(grandfathered.reserved, true);
  const missing = decideChatReserve({
    hasSubscription: false,
    grandfathered: false,
    used: 30,
    limit: 30,
    periodStartedThisMonth: true,
  });
  assert.equal(missing.reserved, true);
  assert.equal(missing.used, 30);
  const newMonth = decideChatReserve({
    hasSubscription: true,
    grandfathered: false,
    used: 30,
    limit: 30,
    periodStartedThisMonth: false,
  });
  assert.equal(newMonth.reserved, true);
  assert.equal(newMonth.used, 1);
});

test('two reserves of the last chat unit let one through', async () => {
  const quota = new AtomicChatQuota(1, 0);
  const results = await Promise.all([quota.reserve(), quota.reserve()]);
  assert.deepEqual(results.filter(Boolean), [true]);
  assert.equal(quota.used, 1);
  await quota.release();
  assert.equal(quota.used, 0);
  assert.equal(await quota.reserve(), true);
});

test('a message with no provider id shares a hash for two minutes', async () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const parts = ['twilio', '234801', '234802', 'hello'];
  const first = await messageFallbackId(parts, now);
  const inside = await messageFallbackId(parts, now + HASH_BUCKET_MS - 1);
  const nextBucket = await messageFallbackId(parts, now + HASH_BUCKET_MS);
  assert.equal(first, inside);
  assert.notEqual(first, nextBucket);
  assert.equal(CLEANUP_EVERY, 50);
  assert.equal(CLEANUP_INTERVAL_MS, 60 * 60 * 1000);
  assert.equal(PENDING_TTL_MS, HASH_BUCKET_MS);
});
