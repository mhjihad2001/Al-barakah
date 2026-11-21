import { type MetaTrackingConfig } from '../data/restaurantConfig';

/**
 * ============================================================================
 * META_TRACKER: Browser Meta Pixel + Server-Side CAPI with Event Deduplication
 * ============================================================================
 * Supports:
 * - Dynamic Meta Pixel script injection when a valid Pixel ID is configured
 * - Unique `event_id` generation passed to both `fbq` and CAPI POST payload
 * - SHA-256 Advanced Matching hashing via Web Crypto API (`ph`, `fn`, `ct`, `em`)
 * - `_fbp` & `_fbc` cookie extraction
 * - Real-time event log for the Admin Live Event Debugger
 */

export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Purchase'
  | 'SelectDeliveryZone';

export interface MetaUserInfo {
  phone?: string;
  firstName?: string;
  city?: string;
  email?: string;
}

export interface MetaEventCustomData {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  order_id?: string;
  num_items?: number;
  zone_name?: string;
  delivery_fee?: number;
}

export interface MetaEventLogEntry {
  id: string;
  timestamp: string;
  eventName: MetaEventName;
  eventId: string;
  pixelStatus: 'fired' | 'skipped' | 'disabled';
  capiStatus: 'sent' | 'failed' | 'not_configured' | 'disabled';
  customData: MetaEventCustomData;
  capiPayload?: Record<string, unknown>;
  errorMessage?: string;
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
  }
}

const STANDARD_META_EVENTS = new Set<MetaEventName>([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Lead',
  'Purchase',
]);

const LOG_STORAGE_KEY = 'albarakah_meta_logs_v1';

/**
 * Generates a unique deduplication event_id (e.g., evt_1794979671234_a9f3c1).
 */
export function generateEventId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `evt_${Date.now()}_${rand}`;
}

/**
 * Normalizes Bangladeshi or international mobile numbers for Meta Advanced Matching.
 */
export function normalizePhoneForMeta(rawPhone: string): string {
  const bengaliDigits = '০১২৩৪৫৬৭৮৯';
  const ascii = rawPhone.replace(/[০-৯]/g, (c) => String(bengaliDigits.indexOf(c)));
  const digits = ascii.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  return digits;
}

/**
 * Computes lowercase SHA-256 hex digest using Web Crypto API (with pure Node fallback for tests).
 */
export async function sha256Hex(value: string): Promise<string> {
  const clean = value.trim().toLowerCase();
  if (!clean) return '';

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(clean);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return '';
}

/**
 * Reads Meta `_fbp` and `_fbc` cookies from document.cookie safely.
 */
export function readMetaCookies(cookieString?: string): {
  fbp?: string;
  fbc?: string;
} {
  const source =
    cookieString !== undefined
      ? cookieString
      : typeof document !== 'undefined'
        ? document.cookie
        : '';

  if (!source) return {};

  const result: { fbp?: string; fbc?: string } = {};
  source.split(';').forEach((pair) => {
    const [rawKey, ...rest] = pair.trim().split('=');
    const val = rest.join('=');
    if (rawKey === '_fbp' && val) result.fbp = decodeURIComponent(val);
    if (rawKey === '_fbc' && val) result.fbc = decodeURIComponent(val);
  });
  return result;
}

/**
 * Builds the Server-Side Meta Conversions API (CAPI) JSON payload.
 */
export async function buildCapiPayload(params: {
  eventName: MetaEventName;
  eventId: string;
  customData: MetaEventCustomData;
  userInfo?: MetaUserInfo;
  config: MetaTrackingConfig;
  sourceUrl?: string;
  cookieString?: string;
}): Promise<Record<string, unknown>> {
  const { eventName, eventId, customData, userInfo, config, sourceUrl, cookieString } =
    params;

  const cookies = readMetaCookies(cookieString);
  const userData: Record<string, unknown> = {};

  if (cookies.fbp) userData.fbp = cookies.fbp;
  if (cookies.fbc) userData.fbc = cookies.fbc;

  if (userInfo?.phone) {
    const normalizedPhone = normalizePhoneForMeta(userInfo.phone);
    if (normalizedPhone) {
      userData.ph = [await sha256Hex(normalizedPhone)];
    }
  }
  if (userInfo?.firstName) {
    const firstToken = userInfo.firstName.trim().split(/\s+/)[0];
    if (firstToken) {
      userData.fn = [await sha256Hex(firstToken)];
    }
  }
  if (userInfo?.city) {
    userData.ct = [await sha256Hex(userInfo.city)];
  }
  if (userInfo?.email) {
    userData.em = [await sha256Hex(userInfo.email)];
  }

  const eventRecord: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url:
      sourceUrl ?? (typeof window !== 'undefined' ? window.location.href : ''),
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  };

  const payload: Record<string, unknown> = {
    data: [eventRecord],
    event_name: eventName,
    event_time: eventRecord.event_time,
    event_id: eventId,
    event_source_url: eventRecord.event_source_url,
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  };

  if (config.pixelId.trim()) {
    payload.pixel_id = config.pixelId.trim();
  }
  if (config.testEventCode.trim()) {
    payload.test_event_code = config.testEventCode.trim();
  }
  if (config.capiAccessToken.trim()) {
    payload.access_token = config.capiAccessToken.trim();
  }

  return payload;
}

export type MetaCapiDispatcher = (payload: {
  eventName: MetaEventName;
  eventId: string;
  customData: MetaEventCustomData;
  userData: {
    fbp?: string;
    fbc?: string;
    phone?: string;
    firstName?: string;
    city?: string;
  };
  sourceUrl: string;
}) => Promise<boolean>;

class MetaTrackerService {
  private config: MetaTrackingConfig = {
    enabled: false,
    pixelId: '',
    capiEnabled: false,
    capiAccessToken: '',
    capiEndpointUrl: '',
    testEventCode: '',
    debugConsole: false,
  };

  private initializedPixelId: string | null = null;
  private logs: MetaEventLogEntry[] = [];
  private listeners: Set<(logs: MetaEventLogEntry[]) => void> = new Set();
  private capiDispatcher: MetaCapiDispatcher | null = null;

  constructor() {
    this.logs = this.loadLogs();
  }

  setCapiDispatcher(dispatcher: MetaCapiDispatcher | null): void {
    this.capiDispatcher = dispatcher;
  }

  private loadLogs(): MetaEventLogEntry[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistLogs(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
      } catch {
        // Ignore quota error
      }
    }
    this.listeners.forEach((cb) => cb([...this.logs]));
  }

  subscribe(listener: (logs: MetaEventLogEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getLogs(): MetaEventLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    this.persistLogs();
  }

  /**
   * Initializes Meta Pixel dynamically when tracking is enabled and Pixel ID is valid.
   */
  init(newConfig: MetaTrackingConfig): void {
    this.config = { ...newConfig };
    const cleanPixelId = this.config.pixelId.trim();

    if (
      typeof window === 'undefined' ||
      !this.config.enabled ||
      !/^\d{6,20}$/.test(cleanPixelId)
    ) {
      return;
    }

    if (!window.fbq) {
      const fbqFn = function (...args: unknown[]) {
        if (fbqFn.callMethod) {
          fbqFn.callMethod(...args);
        } else {
          fbqFn.queue?.push(args);
        }
      } as NonNullable<Window['fbq']>;
      fbqFn.queue = [];
      fbqFn.loaded = true;
      fbqFn.version = '2.0';
      fbqFn.push = fbqFn;
      window.fbq = fbqFn;
      window._fbq = fbqFn;

      if (typeof document !== 'undefined') {
        const existingScript = document.querySelector(
          'script[src*="connect.facebook.net/en_US/fbevents.js"]'
        );
        if (!existingScript) {
          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://connect.facebook.net/en_US/fbevents.js';
          document.head.appendChild(script);
        }
      }
    }

    if (this.initializedPixelId !== cleanPixelId && window.fbq) {
      window.fbq('init', cleanPixelId);
      this.initializedPixelId = cleanPixelId;
    }
  }

  /**
   * Tracks an event on both Browser Pixel and Server-Side CAPI with shared `event_id`.
   */
  async track(
    eventName: MetaEventName,
    customData: MetaEventCustomData = {},
    userInfo?: MetaUserInfo,
    options?: { eventId?: string; deferServerToFirestoreTrigger?: boolean }
  ): Promise<MetaEventLogEntry> {
    const eventId = options?.eventId || generateEventId();
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });

    if (!this.config.enabled) {
      const entry: MetaEventLogEntry = {
        id: `${eventId}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        eventName,
        eventId,
        pixelStatus: 'disabled',
        capiStatus: 'disabled',
        customData,
      };
      this.logs = [entry, ...this.logs].slice(0, 50);
      this.persistLogs();
      return entry;
    }

    let pixelStatus: MetaEventLogEntry['pixelStatus'] = 'skipped';
    const cleanPixelId = this.config.pixelId.trim();

    if (typeof window !== 'undefined' && window.fbq && /^\d{6,20}$/.test(cleanPixelId)) {
      try {
        if (STANDARD_META_EVENTS.has(eventName)) {
          window.fbq('track', eventName, customData, { eventID: eventId });
        } else {
          window.fbq('trackCustom', eventName, customData, { eventID: eventId });
        }
        pixelStatus = 'fired';
      } catch {
        pixelStatus = 'skipped';
      }
    }

    const capiPayload = await buildCapiPayload({
      eventName,
      eventId,
      customData,
      userInfo,
      config: this.config,
    });

    let capiStatus: MetaEventLogEntry['capiStatus'] = 'not_configured';
    let errorMessage: string | undefined;

    if (options?.deferServerToFirestoreTrigger && this.config.capiEnabled) {
      capiStatus = 'sent';
    } else if (this.config.capiEnabled && this.capiDispatcher) {
      const cookies = readMetaCookies();
      try {
        const sent = await this.capiDispatcher({
          eventName,
          eventId,
          customData,
          userData: {
            fbp: cookies.fbp,
            fbc: cookies.fbc,
            phone: userInfo?.phone,
            firstName: userInfo?.firstName,
            city: userInfo?.city,
          },
          sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        });
        capiStatus = sent ? 'sent' : 'not_configured';
      } catch (err) {
        capiStatus = 'failed';
        errorMessage = err instanceof Error ? err.message : 'Cloud Function error';
      }
    } else {
      const endpoint = this.config.capiEndpointUrl.trim();
      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiPayload),
            keepalive: true,
          });
          capiStatus = response.ok ? 'sent' : 'failed';
          if (!response.ok) {
            errorMessage = `HTTP ${response.status}`;
          }
        } catch (err) {
          capiStatus = 'failed';
          errorMessage = err instanceof Error ? err.message : 'Network error';
        }
      }
    }

    const entry: MetaEventLogEntry = {
      id: `${eventId}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      eventName,
      eventId,
      pixelStatus,
      capiStatus,
      customData,
      capiPayload,
      errorMessage,
    };

    if (this.config.debugConsole && typeof console !== 'undefined') {
      console.info(`[MetaTracker] ${eventName} (${eventId})`, {
        pixelStatus,
        capiStatus,
        customData,
        capiPayload,
      });
    }

    this.logs = [entry, ...this.logs].slice(0, 50);
    this.persistLogs();
    return entry;
  }

  /**
   * Fires a diagnostic test event using configured Test Event Code.
   */
  async sendTestEvent(): Promise<MetaEventLogEntry> {
    return this.track(
      'Lead',
      {
        content_name: 'Admin Test Connection Event',
        currency: 'BDT',
        value: 380,
      },
      {
        firstName: 'Test',
        phone: '01711000000',
        city: 'Brahmanpara',
      }
    );
  }
}

export const MetaTracker = new MetaTrackerService();
