import assert from 'node:assert/strict';
import test from 'node:test';
import { HASH_BUCKET_MS, messageFallbackId } from '../../supabase/functions/_shared/messageFallbackId.ts';
import {
  CLEANUP_EVERY,
  CLEANUP_INTERVAL_MS,
  MemorySeenStore,
  PENDING_TTL_MS,
  claimDelivery,
} from '../../supabase/functions/_shared/seenClaim.ts';

test('three concurrent claims produce one reply', async () => {
  const store = new MemorySeenStore();
  const results = await Promise.all([
    claimDelivery(store, 'SM123'),
    claimDelivery(store, 'SM123'),
    claimDelivery(store, 'SM123'),
  ]);
  assert.deepEqual(results.filter((result) => result === 'claimed'), ['claimed']);
  assert.equal(results.filter((result) => result === 'replay').length, 2);
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
  assert.equal(await claimDelivery(store, 'SM123', start + PENDING_TTL_MS - 1), 'replay');
  assert.equal(await claimDelivery(store, 'SM123', start + PENDING_TTL_MS), 'claimed');
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
