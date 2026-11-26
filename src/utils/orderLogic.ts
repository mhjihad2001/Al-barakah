import {
  CONFIG_DEFAULTS,
  DEFAULT_SITE_CONTENT,
  type AppConfig,
  type DeliverySubArea,
  type DeliveryZone,
  type MenuCategory,
  type MenuItem,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';

export type OrderType = 'instant' | 'pre-order';
export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'completed';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'অপেক্ষমাণ',
  preparing: 'রান্না চলছে',
  out_for_delivery: 'ডেলিভারিতে আছে',
  completed: 'সম্পন্ন',
};

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderSummary {
  itemCount: number;
  subtotal: number;
  hasPreOrderItem: boolean;
  effectiveOrderType: OrderType;
  isPickupOnlyZone: boolean;
  deliveryFee: number;
  grandTotal: number;
}

export interface OrderFormInput {
  orderId?: string;
  customerName: string;
  phone: string;
  address: string;
  zone: DeliveryZone;
  subArea?: DeliverySubArea | null;
  orderType: OrderType;
  deliveryDate: string;
  timeSlot: string;
  items: CartItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface CateringFormInput {
  name: string;
  phone: string;
  eventDate: string;
  guests: string;
  eventType: string;
  notes: string;
}

export interface RestaurantLiveStatus {
  isOpenForInstant: boolean;
  badgeText: string;
  detailText: string;
}

export interface SavedOrderRecord {
  orderId: string;
  docId?: string;
  status?: OrderStatus;
  createdAt: string;
  customerName: string;
  phone: string;
  zoneName: string;
  address: string;
  orderType: OrderType;
  deliveryDate?: string;
  timeSlot?: string;
  items: Array<{
    id: string;
    name: string;
    servingSize: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  metaEventId?: string;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Validates user/config-supplied external URLs so only safe http(s) links
 * can be rendered in anchor href attributes (blocks javascript:, data:, vbscript:).
 */
export function sanitizeExternalUrl(rawUrl: string | undefined | null): string | null {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
const STORAGE_CONFIG_KEY = 'albarakah_config_v1';
const STORAGE_ORDERS_KEY = 'albarakah_orders_v1';

/**
 * Converts Western ASCII digits (0-9) into Bengali numerals (০-৯).
 */
export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

/**
 * Converts Bengali numerals (০-৯) to Western ASCII digits (0-9).
 */
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (ch) => String(BENGALI_DIGITS.indexOf(ch)));
}

/**
 * Normalizes an entered Order ID (e.g. "#ord-1024", "ORD-১২৩৪", "1024") into "ORD-..." doc ID.
 */
export function normalizeTrackingOrderId(rawInput: string): string {
  const ascii = toAsciiDigits(rawInput).trim().toUpperCase().replace(/^#/, '');
  if (!ascii) return '';
  if (/^\d{4,10}$/.test(ascii)) {
    return `ORD-${ascii}`;
  }
  return ascii.replace(/[^A-Z0-9_-]/g, '');
}

/**
 * Formats an integer BDT amount as "৳ ১,৮৫০".
 */
export function formatBDT(amount: number): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `৳ ${toBengaliDigits(formatted)}`;
}

/**
 * Safely merges partial SiteContent over DEFAULT_SITE_CONTENT.
 */
export function mergeSiteContent(partial?: Partial<SiteContent> | null): SiteContent {
  if (!partial || typeof partial !== 'object') {
    return DEFAULT_SITE_CONTENT;
  }
  return {
    navbar: {
      ...DEFAULT_SITE_CONTENT.navbar,
      ...(partial.navbar ?? {}),
    },
    hero: {
      ...DEFAULT_SITE_CONTENT.hero,
      ...(partial.hero ?? {}),
    },
    heritage: {
      ...DEFAULT_SITE_CONTENT.heritage,
      ...(partial.heritage ?? {}),
      dishes:
        Array.isArray(partial.heritage?.dishes) && partial.heritage.dishes.length > 0
          ? partial.heritage.dishes
          : DEFAULT_SITE_CONTENT.heritage.dishes,
    },
    menu: {
      ...DEFAULT_SITE_CONTENT.menu,
      ...(partial.menu ?? {}),
    },
    catering: {
      ...DEFAULT_SITE_CONTENT.catering,
      ...(partial.catering ?? {}),
    },
    reviews: {
      ...DEFAULT_SITE_CONTENT.reviews,
      ...(partial.reviews ?? {}),
      items:
        Array.isArray(partial.reviews?.items) && partial.reviews.items.length > 0
          ? partial.reviews.items
          : DEFAULT_SITE_CONTENT.reviews.items,
    },
    footer: {
      ...DEFAULT_SITE_CONTENT.footer,
      ...(partial.footer ?? {}),
    },
  };
}

/**
 * Computes whether the kitchen is currently open for instant orders or in pre-order mode.
 */
export function getRestaurantLiveStatus(
  now: Date = new Date(),
  info: Pick<
    RestaurantInfo,
    'statusMode' | 'openHour' | 'openMinute' | 'closeHour' | 'closeMinute' | 'hoursDisplay'
  > = CONFIG_DEFAULTS.restaurantInfo,
  statusCopy: Pick<
    SiteContent['hero'],
    | 'statusOpenBadge'
    | 'statusPreorderBadge'
    | 'statusOpenDetail'
    | 'statusPreorderDetail'
    | 'statusClosedDetail'
  > = DEFAULT_SITE_CONTENT.hero
): RestaurantLiveStatus {
  const openBadge = statusCopy.statusOpenBadge || DEFAULT_SITE_CONTENT.hero.statusOpenBadge;
  const preorderBadge =
    statusCopy.statusPreorderBadge || DEFAULT_SITE_CONTENT.hero.statusPreorderBadge;
  const openDetailBase =
    statusCopy.statusOpenDetail || DEFAULT_SITE_CONTENT.hero.statusOpenDetail;
  const preorderDetail =
    statusCopy.statusPreorderDetail || DEFAULT_SITE_CONTENT.hero.statusPreorderDetail;
  const closedDetail =
    statusCopy.statusClosedDetail || DEFAULT_SITE_CONTENT.hero.statusClosedDetail;

  if (info.statusMode === 'open') {
    return {
      isOpenForInstant: true,
      badgeText: openBadge,
      detailText: `${openDetailBase} (${info.hoursDisplay})`,
    };
  }

  if (info.statusMode === 'preorder') {
    return {
      isOpenForInstant: false,
      badgeText: preorderBadge,
      detailText: preorderDetail,
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = info.openHour * 60 + info.openMinute;
  const closeMinutes = info.closeHour * 60 + info.closeMinute;

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return {
      isOpenForInstant: true,
      badgeText: openBadge,
      detailText: `${openDetailBase} (${info.hoursDisplay})`,
    };
  }

  return {
    isOpenForInstant: false,
    badgeText: preorderBadge,
    detailText: closedDetail,
  };
}

/**
 * Filters menu items by Bengali category tab and optional Pre-order toggle.
 */
export function filterMenuItems(
  items: MenuItem[],
  selectedCategory: 'সব খাবার' | MenuCategory,
  preOrderSpecialsOnly: boolean
): MenuItem[] {
  return items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'সব খাবার' || item.category === selectedCategory;
    const matchesPreOrder = !preOrderSpecialsOnly || item.preOrderOnly;
    return matchesCategory && matchesPreOrder;
  });
}

/**
 * Resolves effective delivery fee considering optional sub-area override.
 */
export function getEffectiveDeliveryFee(
  zone: DeliveryZone,
  subArea?: DeliverySubArea | null
): number {
  if (zone.isOutOfArea) return 0;
  if (subArea && typeof subArea.fee === 'number' && Number.isFinite(subArea.fee)) {
    return Math.max(0, subArea.fee);
  }
  return Math.max(0, zone.fee);
}

/**
 * Resolves effective delivery ETA considering optional sub-area override.
 */
export function getEffectiveDeliveryEta(
  zone: DeliveryZone,
  subArea?: DeliverySubArea | null
): string {
  if (subArea?.eta && subArea.eta.trim()) {
    return subArea.eta.trim();
  }
  return zone.eta;
}

/**
 * Formats full delivery area display label including optional sub-area.
 */
export function formatZoneDisplayName(
  zone: DeliveryZone,
  subArea?: DeliverySubArea | null
): string {
  if (subArea?.name && subArea.name.trim()) {
    return `${zone.name} — ${subArea.name.trim()}`;
  }
  return zone.name;
}

/**
 * Calculates cart totals, delivery fee, and whether Pre-Order mode is forced.
 */
export function computeOrderSummary(
  cartItems: CartItem[],
  selectedZone: DeliveryZone,
  requestedOrderType: OrderType,
  selectedSubArea?: DeliverySubArea | null
): OrderSummary {
  const itemCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );
  const hasPreOrderItem = cartItems.some((entry) => entry.item.preOrderOnly);
  const isPickupOnlyZone = Boolean(selectedZone.isOutOfArea);

  const effectiveOrderType: OrderType = hasPreOrderItem
    ? 'pre-order'
    : requestedOrderType;

  const deliveryFee =
    itemCount === 0 || isPickupOnlyZone
      ? 0
      : getEffectiveDeliveryFee(selectedZone, selectedSubArea);

  const grandTotal = itemCount === 0 ? 0 : subtotal + deliveryFee;

  return {
    itemCount,
    subtotal,
    hasPreOrderItem,
    effectiveOrderType,
    isPickupOnlyZone,
    deliveryFee,
    grandTotal,
  };
}

/**
 * Generates a collision-resistant Order ID such as #ORD-482915.
 */
export function generateOrderId(): string {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `#ORD-${suffix}`;
}

/**
 * Validates customer checkout fields with clear Bengali error messages.
 */
export function validateOrderForm(input: OrderFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.items.length === 0) {
    errors.cart = 'অর্ডার করতে অনুগ্রহ করে মেনু থেকে কমপক্ষে একটি খাবার যোগ করুন।';
  }

  if (input.customerName.trim().length < 2) {
    errors.customerName = 'অনুগ্রহ করে আপনার পুরো নাম লিখুন।';
  }

  const normalizedDigits = input.phone
    .replace(/[০-৯]/g, (ch) => String(BENGALI_DIGITS.indexOf(ch)))
    .replace(/[^\d]/g, '');

  if (normalizedDigits.length < 10 || normalizedDigits.length > 15) {
    errors.phone = 'সঠিক মোবাইল নম্বর দিন (যেমন: 01711-000000)।';
  }

  if (!input.zone.isOutOfArea && input.address.trim().length < 5) {
    errors.address = 'অনুগ্রহ করে আপনার গ্রাম, রোড বা বাড়ির পূর্ণ ঠিকানা লিখুন।';
  }

  const hasPreOrderItem = input.items.some((entry) => entry.item.preOrderOnly);
  const effectiveType: OrderType = hasPreOrderItem ? 'pre-order' : input.orderType;

  if (effectiveType === 'pre-order') {
    if (!input.deliveryDate.trim()) {
      errors.deliveryDate = 'প্রি-অর্ডারের তারিখ নির্বাচন করুন।';
    }
    if (!input.timeSlot.trim()) {
      errors.timeSlot = 'ডেলিভারির সময় স্লট নির্বাচন করুন।';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the custom catering / bulk pre-order request form in Bengali.
 */
export function validateCateringForm(input: CateringFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 2) {
    errors.name = 'আপনার নাম বা প্রতিষ্ঠানের নাম লিখুন।';
  }

  const normalizedDigits = input.phone
    .replace(/[০-৯]/g, (ch) => String(BENGALI_DIGITS.indexOf(ch)))
    .replace(/[^\d]/g, '');

  if (normalizedDigits.length < 10 || normalizedDigits.length > 15) {
    errors.phone = 'সঠিক মোবাইল নম্বর দিন।';
  }

  if (!input.eventDate.trim()) {
    errors.eventDate = 'অনুষ্ঠানের তারিখ নির্বাচন করুন।';
  }

  const guestCount = Number(input.guests);
  if (!Number.isFinite(guestCount) || guestCount < 10) {
    errors.guests = 'ক্যাটারিং অর্ডারের জন্য কমপক্ষে ১০ জন অতিথি নির্বাচন করুন।';
  }

  if (input.notes.trim().length < 5) {
    errors.notes = 'কী কী খাবার ও কত প্লেট লাগবে তা সংক্ষেপে লিখুন।';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a structured Bengali WhatsApp order receipt.
 */
export function formatWhatsAppOrderMessage(
  input: OrderFormInput,
  summary: OrderSummary,
  restaurantName: string
): string {
  const orderId = input.orderId || '#ORD-1024';
  const orderModeLabel = summary.isPickupOnlyZone
    ? summary.effectiveOrderType === 'pre-order'
      ? 'প্রি-অর্ডার (দোকান থেকে পিকআপ)'
      : 'দোকান থেকে সরাসরি পিকআপ (এলাকার বাইরে)'
    : summary.effectiveOrderType === 'pre-order'
      ? 'প্রি-অর্ডার (নির্দিষ্ট সময়ে হোম ডেলিভারি)'
      : 'তাৎক্ষণিক হোম ডেলিভারি';

  const lines: string[] = [
    `*নতুন অর্ডার (${orderId}) — ${restaurantName}*`,
    `--------------------------------`,
    `*অর্ডারের ধরন:* ${orderModeLabel}`,
  ];

  if (summary.effectiveOrderType === 'pre-order') {
    lines.push(`*তারিখ:* ${toBengaliDigits(input.deliveryDate)}`);
    lines.push(`*সময়:* ${input.timeSlot}`);
  }

  const zoneDisplay = formatZoneDisplayName(input.zone, input.subArea);

  lines.push(
    ``,
    `*ক্রেতার তথ্য:*`,
    `নাম: ${input.customerName.trim()}`,
    `মোবাইল: ${input.phone.trim()}`,
    `এলাকা: ${zoneDisplay}`,
    `ঠিকানা: ${
      input.address.trim() ||
      (summary.isPickupOnlyZone ? 'দোকান থেকে পিকআপ করবেন' : '')
    }`,
    ``,
    `*অর্ডার করা খাবার:*`
  );

  input.items.forEach(({ item, quantity }, idx) => {
    const lineTotal = item.price * quantity;
    const tag = item.preOrderOnly ? ' [প্রি-অর্ডার]' : '';
    lines.push(
      `${toBengaliDigits(idx + 1)}. ${item.name} (${item.servingSize})${tag} × ${toBengaliDigits(quantity)} = ${formatBDT(lineTotal)}`
    );
  });

  lines.push(
    `--------------------------------`,
    `খাবারের দাম: ${formatBDT(summary.subtotal)}`,
    `ডেলিভারি চার্জ (${zoneDisplay}): ${
      summary.deliveryFee === 0 ? '৳ ০ (পিকআপ)' : formatBDT(summary.deliveryFee)
    }`,
    `*সর্বমোট বিল: ${formatBDT(summary.grandTotal)}*`,
    `--------------------------------`,
    `অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`
  );

  return lines.join('\n');
}

/**
 * Generates the https://wa.me/... link for a confirmed checkout order.
 */
export function buildWhatsAppOrderUrl(
  whatsappNumber: string,
  input: OrderFormInput,
  summary: OrderSummary,
  restaurantName: string
): string {
  const cleanPhone = whatsappNumber.replace(/[^\d]/g, '');
  const text = formatWhatsAppOrderMessage(input, summary, restaurantName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Formats and generates the https://wa.me/... link for a custom catering inquiry in Bengali.
 */
export function buildWhatsAppCateringUrl(
  whatsappNumber: string,
  input: CateringFormInput,
  restaurantName: string
): string {
  const cleanPhone = whatsappNumber.replace(/[^\d]/g, '');
  const message = [
    `*বড় দাওয়াত ও কাস্টম অর্ডার অনুরোধ — ${restaurantName}*`,
    `--------------------------------`,
    `নাম: ${input.name.trim()}`,
    `মোবাইল: ${input.phone.trim()}`,
    `অনুষ্ঠানের ধরন: ${input.eventType}`,
    `তারিখ: ${toBengaliDigits(input.eventDate)}`,
    `অতিথি সংখ্যা: ${toBengaliDigits(input.guests)} জন`,
    `বিবরণ: ${input.notes.trim()}`,
    `--------------------------------`,
    `দয়া করে প্যাকেজ মূল্য ও প্রাপ্যতা জানাবেন।`,
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Loads AppConfig from localStorage, merging safely over CONFIG_DEFAULTS.
 */
export function loadAppConfig(): AppConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return CONFIG_DEFAULTS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return CONFIG_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      restaurantInfo: {
        ...CONFIG_DEFAULTS.restaurantInfo,
        ...(parsed.restaurantInfo ?? {}),
      },
      siteContent: mergeSiteContent(parsed.siteContent),
      deliveryZones:
        Array.isArray(parsed.deliveryZones) && parsed.deliveryZones.length > 0
          ? parsed.deliveryZones.map((zone) => {
              if (Array.isArray(zone.subAreas)) return zone;
              const defaultMatch = CONFIG_DEFAULTS.deliveryZones.find(
                (dz) => dz.id === zone.id
              );
              return {
                ...zone,
                subAreas: defaultMatch?.subAreas ?? [],
              };
            })
          : CONFIG_DEFAULTS.deliveryZones,
      menuItems:
        Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0
          ? parsed.menuItems
          : CONFIG_DEFAULTS.menuItems,
      metaConfig: {
        ...CONFIG_DEFAULTS.metaConfig,
        ...(parsed.metaConfig ?? {}),
      },
    };
  } catch {
    return CONFIG_DEFAULTS;
  }
}

/**
 * Persists AppConfig to localStorage.
 */
export function saveAppConfig(config: AppConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Loads order history from localStorage.
 */
export function loadSavedOrders(): SavedOrderRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new order record at the top of order history in localStorage.
 */
export function saveOrderRecord(record: SavedOrderRecord): SavedOrderRecord[] {
  const existing = loadSavedOrders();
  const updated = [record, ...existing].slice(0, 100);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}
