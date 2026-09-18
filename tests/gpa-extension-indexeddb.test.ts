import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openGpaDatabase,
  closeGpaDatabase,
  addTargets,
  getNextQueuedTarget,
  updateTargetStatus,
  queueUnsentBatch,
  getAllUnsentBatches,
  removeUnsentBatch,
  getQueueMetrics,
  setCheckpoint,
  getCheckpoint,
} from '../../gpa-extension/lib/indexeddb.js';

describe('GPA Extension IndexedDB Durable Storage & Crash Recovery', () => {
  it('preserves target queue across database reopenings (crash simulation)', async () => {
    const db1 = await openGpaDatabase();
    expect(db1).toBeDefined();

    // 1. Queue targets
    await addTargets([
      {
        id: 'target_13_1',
        title_id: 13,
        title_name: 'Amazing Spider-Man, The',
        issue_id: 1,
        gpa_url: 'https://comics.gpanalysis.com/analyse-prices/sales-data/13/1',
      },
    ]);

    // 2. Set checkpoint
    await setCheckpoint('last_processed_title', '13');

    // 3. Queue unsent batch
    const batchId = await queueUnsentBatch({ test: 'payload_asm_1' });
    expect(batchId).toBeDefined();

    // 4. Close database connection (simulate browser crash / service worker teardown)
    closeGpaDatabase();

    // 5. Reopen database (simulate browser restart)
    const db2 = await openGpaDatabase(true);
    expect(db2).toBeDefined();

    // 6. Verify target is still queued
    const nextTarget = await getNextQueuedTarget();
    expect(nextTarget).not.toBeNull();
    expect(nextTarget?.id).toBe('target_13_1');
    expect(nextTarget?.status).toBe('QUEUED');

    // 7. Verify checkpoint survived
    const cp = await getCheckpoint('last_processed_title');
    expect(cp).toBe('13');

    // 8. Verify unsent batches survived
    const unsent = await getAllUnsentBatches();
    expect(unsent).toHaveLength(1);
    expect(unsent[0].id).toBe(batchId);
    expect(unsent[0].payload).toEqual({ test: 'payload_asm_1' });

    // 9. Process and sync batch
    await removeUnsentBatch(batchId);
    await updateTargetStatus('target_13_1', 'COMPLETED');

    const metrics = await getQueueMetrics();
    expect(metrics.queued).toBe(0);
    expect(metrics.completed).toBe(1);
    expect(metrics.unsent).toBe(0);
  });
});
