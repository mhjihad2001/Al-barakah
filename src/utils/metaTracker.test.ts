import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCapiPayload,
  generateEventId,
  normalizePhoneForMeta,
  readMetaCookies,
  sha256Hex,
} from './metaTracker';
import { CONFIG_DEFAULTS } from '../data/restaurantConfig';

test('generateEventId creates unique deduplication identifiers', () => {
  const a = generateEventId();
  const b = generateEventId();
  assert.match(a, /^evt_\d+_[a-z0-9]+$/);
  assert.notEqual(a, b);
});

test('normalizePhoneForMeta handles Bengali and local 01X numbers', () => {
  assert.equal(normalizePhoneForMeta('01711-223344'), '8801711223344');
  assert.equal(normalizePhoneForMeta('০১৭১১-২২৩৩৪৪'), '8801711223344');
  assert.equal(normalizePhoneForMeta('+8801819001122'), '8801819001122');
});

test('readMetaCookies extracts _fbp and _fbc cleanly', () => {
  const cookies = readMetaCookies(
    'session=abc; _fbp=fb.1.1700000000.123456; _fbc=fb.1.1700000001.IwAR0xyz'
  );
  assert.equal(cookies.fbp, 'fb.1.1700000000.123456');
  assert.equal(cookies.fbc, 'fb.1.1700000001.IwAR0xyz');
});

test('buildCapiPayload hashes PII with SHA-256 and attaches event_id & test_event_code', async () => {
  const eventId = generateEventId();
  const expectedPhoneHash = await sha256Hex('8801711223344');
  assert.equal(expectedPhoneHash.length, 64);

  const payload = await buildCapiPayload({
    eventName: 'Purchase',
    eventId,
    customData: {
      value: 800,
      currency: 'BDT',
      order_id: '#ORD-1025',
      num_items: 2,
    },
    userInfo: {
      phone: '০১৭১১-২২৩৩৪৪',
      firstName: 'Nadia Karim',
      city: 'Brahmanpara',
    },
    config: {
      ...CONFIG_DEFAULTS.metaConfig,
      enabled: true,
      pixelId: '123456789012345',
      testEventCode: 'TEST12345',
    },
    sourceUrl: 'https://example.com/',
    cookieString: '_fbp=fb.1.123.456',
  });

  assert.equal(payload.event_id, eventId);
  assert.equal(payload.event_name, 'Purchase');
  assert.equal(payload.test_event_code, 'TEST12345');
  assert.equal(payload.action_source, 'website');

  const userData = payload.user_data as Record<string, unknown>;
  assert.deepEqual(userData.ph, [expectedPhoneHash]);
  assert.equal(userData.fbp, 'fb.1.123.456');
});

import { MetaTracker } from './metaTracker';

test('MetaTracker dispatches upper-funnel CAPI events via Cloud dispatcher and preserves explicit Purchase eventId', async () => {
  const dispatched: Array<{ eventName: string; eventId: string }> = [];
  MetaTracker.setCapiDispatcher(async (payload) => {
    dispatched.push({ eventName: payload.eventName, eventId: payload.eventId });
    return true;
  });

  MetaTracker.init({
    ...CONFIG_DEFAULTS.metaConfig,
    enabled: true,
    capiEnabled: true,
    pixelId: '123456789012345',
  });

  const viewLog = await MetaTracker.track('ViewContent', { value: 380, currency: 'BDT' });
  assert.equal(viewLog.capiStatus, 'sent');
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].eventId, viewLog.eventId);

  const sharedPurchaseId = generateEventId();
  const purchaseLog = await MetaTracker.track(
    'Purchase',
    { value: 420, currency: 'BDT', order_id: '#ORD-999111' },
    { phone: '01711000000' },
    { eventId: sharedPurchaseId, deferServerToFirestoreTrigger: true }
  );
  assert.equal(purchaseLog.eventId, sharedPurchaseId);
  assert.equal(purchaseLog.capiStatus, 'sent');
  assert.equal(dispatched.length, 1);

  MetaTracker.setCapiDispatcher(null);
});

