import crypto from 'node:crypto';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const FIRESTORE_DATABASE_ID =
  'ai-studio-android-albaraka-2a39cb97-8b11-41d9-ba26-e3cf9f5c2bf9';

const app = getApps().length ? getApp() : initializeApp();
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

function sha256(value) {
  if (!value || typeof value !== 'string') return '';
  const clean = value.trim().toLowerCase();
  if (!clean) return '';
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function normalizeBdPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const bn = '০১২৩৪৫৬৭৮৯';
  const ascii = rawPhone.replace(/[০-৯]/g, (c) => String(bn.indexOf(c)));
  const digits = ascii.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  return digits;
}

async function getMetaCapiConfig() {
  const [generalSnap, secretSnap] = await Promise.all([
    db.doc('settings/general').get(),
    db.doc('settings/secrets').get(),
  ]);

  const general = generalSnap.exists ? generalSnap.data() : {};
  const secrets = secretSnap.exists ? secretSnap.data() : {};

  const pixelId = String(general?.metaPixelId || '').trim();
  const capiEnabled = Boolean(general?.capiEnabled && general?.metaEnabled);
  const testEventCode = String(general?.metaTestEventCode || '').trim();
  const accessToken = String(
    process.env.META_CAPI_ACCESS_TOKEN || secrets?.capiAccessToken || ''
  ).trim();

  return { pixelId, capiEnabled, testEventCode, accessToken };
}

async function postToMetaGraphApi({ pixelId, accessToken, testEventCode, eventRecord }) {
  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;

  const body = {
    data: [eventRecord],
  };
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const resultText = await response.text();
  if (!response.ok) {
    throw new Error(`Meta Graph API HTTP ${response.status}: ${resultText}`);
  }
  return resultText;
}

/**
 * Trigger 1: Automatically dispatches Server-Side Meta CAPI `Purchase`
 * whenever a new order is written to `orders/{orderId}`.
 * Customer PII is hashed with SHA-256 on the server and Access Token never leaves backend.
 */
export const sendOrderPurchaseCapi = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    database: FIRESTORE_DATABASE_ID,
    region: 'asia-southeast1',
  },
  async (event) => {
    const order = event.data?.data();
    if (!order) return;

    const { pixelId, capiEnabled, testEventCode, accessToken } = await getMetaCapiConfig();
    if (!capiEnabled || !pixelId || !accessToken) {
      logger.info('Meta CAPI skipped (disabled or missing Pixel ID / Access Token)', {
        orderId: order.orderId,
      });
      return;
    }

    const normalizedPhone = normalizeBdPhone(order.customerPhone);
    const firstNameToken = String(order.customerName || '').trim().split(/\s+/)[0];

    const userData = {};
    if (order.fbp) userData.fbp = order.fbp;
    if (order.fbc) userData.fbc = order.fbc;
    if (normalizedPhone) userData.ph = [sha256(normalizedPhone)];
    if (firstNameToken) userData.fn = [sha256(firstNameToken)];
    if (order.deliveryZone) userData.ct = [sha256(order.deliveryZone)];

    const eventRecord = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: order.metaEventId || `evt_order_${event.params.orderId}`,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        currency: 'BDT',
        value: Number(order.grandTotal || 0),
        order_id: order.orderId,
        content_ids: Array.isArray(order.items) ? order.items.map((i) => i.id) : [],
        num_items: Array.isArray(order.items)
          ? order.items.reduce((sum, i) => sum + Number(i.quantity || 1), 0)
          : 1,
      },
    };

    try {
      const responseText = await postToMetaGraphApi({
        pixelId,
        accessToken,
        testEventCode,
        eventRecord,
      });
      logger.info('Meta CAPI Purchase dispatched', {
        orderId: order.orderId,
        eventId: eventRecord.event_id,
        responseText,
      });
    } catch (err) {
      logger.error('Meta CAPI Purchase failed', {
        orderId: order.orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * Trigger 2: Server-Side CAPI relay for upper-funnel events (`ViewContent`, `AddToCart`,
 * `InitiateCheckout`, `SelectDeliveryZone`, `Lead`) with `event_id` deduplication.
 */
export const trackMetaServerEvent = onCall(
  {
    region: 'asia-southeast1',
    cors: true,
  },
  async (request) => {
    const { eventName, eventId, customData = {}, userData = {}, sourceUrl = '' } =
      request.data || {};

    if (!eventName || !eventId) {
      throw new HttpsError('invalid-argument', 'eventName and eventId are required.');
    }

    const { pixelId, capiEnabled, testEventCode, accessToken } = await getMetaCapiConfig();
    if (!capiEnabled || !pixelId || !accessToken) {
      return { status: 'skipped', reason: 'capi_not_configured' };
    }

    const rawReq = request.rawRequest;
    const forwardedFor = rawReq?.headers?.['x-forwarded-for'];
    const clientIp =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : rawReq?.ip || '';
    const clientUa = rawReq?.headers?.['user-agent'] || '';

    const normalizedUserData = {};
    if (userData.fbp) normalizedUserData.fbp = String(userData.fbp);
    if (userData.fbc) normalizedUserData.fbc = String(userData.fbc);
    if (clientIp) normalizedUserData.client_ip_address = clientIp;
    if (clientUa) normalizedUserData.client_user_agent = String(clientUa);
    if (userData.phone) {
      const norm = normalizeBdPhone(String(userData.phone));
      if (norm) normalizedUserData.ph = [sha256(norm)];
    }
    if (userData.firstName) {
      const first = String(userData.firstName).trim().split(/\s+/)[0];
      if (first) normalizedUserData.fn = [sha256(first)];
    }
    if (userData.city) {
      normalizedUserData.ct = [sha256(String(userData.city))];
    }

    const eventRecord = {
      event_name: String(eventName),
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(eventId),
      event_source_url: String(sourceUrl || ''),
      action_source: 'website',
      user_data: normalizedUserData,
      custom_data: customData,
    };

    try {
      await postToMetaGraphApi({
        pixelId,
        accessToken,
        testEventCode,
        eventRecord,
      });
      return { status: 'sent', eventId };
    } catch (err) {
      logger.error('trackMetaServerEvent error', {
        eventName,
        eventId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new HttpsError('internal', 'Failed to dispatch Meta CAPI event.');
    }
  }
);
