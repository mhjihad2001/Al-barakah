import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppCateringUrl,
  buildWhatsAppOrderUrl,
  computeOrderSummary,
  filterMenuItems,
  formatBDT,
  getRestaurantLiveStatus,
  sanitizeExternalUrl,
  toBengaliDigits,
  validateCateringForm,
  validateOrderForm,
} from './orderLogic';
import { CONFIG_DEFAULTS } from '../data/restaurantConfig';

const { deliveryZones, menuItems, restaurantInfo } = CONFIG_DEFAULTS;

test('toBengaliDigits and formatBDT render Bengali numerals properly', () => {
  assert.equal(toBengaliDigits('12345'), '১২৩৪৫');
  assert.equal(formatBDT(1850), '৳ ১,৮৫০');
  assert.equal(formatBDT(40), '৳ ৪০');
});

test('getRestaurantLiveStatus reflects auto hours and manual Admin status overrides in Bengali', () => {
  const openAfternoon = new Date('2026-11-17T14:00:00');
  const openStatus = getRestaurantLiveStatus(openAfternoon, restaurantInfo);
  assert.equal(openStatus.isOpenForInstant, true);
  assert.match(openStatus.badgeText, /এখন অর্ডার নেওয়া হচ্ছে/);

  const lateNight = new Date('2026-11-17T23:30:00');
  const closedStatus = getRestaurantLiveStatus(lateNight, restaurantInfo);
  assert.equal(closedStatus.isOpenForInstant, false);
  assert.match(closedStatus.badgeText, /প্রি-অর্ডার চলছে/);

  const forcedOpen = getRestaurantLiveStatus(lateNight, {
    ...restaurantInfo,
    statusMode: 'open',
  });
  assert.equal(forcedOpen.isOpenForInstant, true);
});

test('filterMenuItems filters accurately by Bengali category and pre-order toggle', () => {
  const all = filterMenuItems(menuItems, 'সব খাবার', false);
  assert.equal(all.length, menuItems.length);

  const kebabs = filterMenuItems(menuItems, 'কাবাব ও স্টার্টার', false);
  assert.ok(kebabs.length >= 2);
  assert.ok(kebabs.every((i) => i.category === 'কাবাব ও স্টার্টার'));

  const preOrders = filterMenuItems(menuItems, 'সব খাবার', true);
  assert.ok(preOrders.length >= 2);
  assert.ok(preOrders.every((i) => i.preOrderOnly === true));
});

test('computeOrderSummary calculates totals and enforces pre-order for special items', () => {
  const kacchi = menuItems.find((m) => m.id === 'royal-mutton-kacchi-1-1')!;
  const raan = menuItems.find((m) => m.id === 'whole-roast-khashi-raan')!;
  const sadar = deliveryZones.find((z) => z.id === 'sadar-bazar')!;
  const outside = deliveryZones.find((z) => z.id === 'outside-zone')!;

  const instantSummary = computeOrderSummary(
    [{ item: kacchi, quantity: 2 }],
    sadar,
    'instant'
  );
  assert.equal(instantSummary.itemCount, 2);
  assert.equal(instantSummary.subtotal, 760);
  assert.equal(instantSummary.deliveryFee, 40);
  assert.equal(instantSummary.grandTotal, 800);
  assert.equal(instantSummary.hasPreOrderItem, false);
  assert.equal(instantSummary.effectiveOrderType, 'instant');

  const forcedPreOrder = computeOrderSummary(
    [
      { item: kacchi, quantity: 1 },
      { item: raan, quantity: 1 },
    ],
    sadar,
    'instant'
  );
  assert.equal(forcedPreOrder.hasPreOrderItem, true);
  assert.equal(forcedPreOrder.effectiveOrderType, 'pre-order');

  const outsideSummary = computeOrderSummary(
    [{ item: kacchi, quantity: 1 }],
    outside,
    'pre-order'
  );
  assert.equal(outsideSummary.isPickupOnlyZone, true);
  assert.equal(outsideSummary.deliveryFee, 0);
  assert.equal(outsideSummary.grandTotal, kacchi.price);
});

test('validateOrderForm and WhatsApp receipt generation work with Bengali & ASCII phone inputs', () => {
  const kacchi = menuItems.find((m) => m.id === 'royal-mutton-kacchi-1-1')!;
  const sadar = deliveryZones.find((z) => z.id === 'sadar-bazar')!;

  const invalid = validateOrderForm({
    customerName: '',
    phone: '123',
    address: '',
    zone: sadar,
    orderType: 'pre-order',
    deliveryDate: '',
    timeSlot: '',
    items: [{ item: kacchi, quantity: 1 }],
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.deliveryDate);

  const input = {
    orderId: '#ORD-1025',
    customerName: 'নাদিয়া করিম',
    phone: '০১৭১১-২২৩৩৪৪',
    address: 'কলেজ রোড, সদর বাজার',
    zone: sadar,
    orderType: 'pre-order' as const,
    deliveryDate: '2026-11-22',
    timeSlot: 'দুপুর ১:০০ - ২:৩০',
    items: [{ item: kacchi, quantity: 2 }],
  };
  assert.equal(validateOrderForm(input).isValid, true);

  const summary = computeOrderSummary(input.items, sadar, input.orderType);
  const url = buildWhatsAppOrderUrl('8801711000000', input, summary, restaurantInfo.brandName);
  assert.ok(url.startsWith('https://wa.me/8801711000000?text='));
  const decoded = decodeURIComponent(url.split('text=')[1]);
  assert.match(decoded, /#ORD-1025/);
  assert.match(decoded, /নাদিয়া করিম/);
  assert.match(decoded, /৳ ৮০০/);

  const cateringValid = validateCateringForm({
    name: 'কামরুল হাসান',
    phone: '01712345678',
    eventDate: '2026-12-05',
    guests: '40',
    eventType: 'বিয়ে / হলুদ অনুষ্ঠান',
    notes: '৪০ প্লেট কাচ্চি ও বোরহানি',
  });
  assert.equal(cateringValid.isValid, true);
  const cateringUrl = buildWhatsAppCateringUrl(
    '8801711000000',
    {
      name: 'কামরুল হাসান',
      phone: '01712345678',
      eventDate: '2026-12-05',
      guests: '40',
      eventType: 'বিয়ে / হলুদ অনুষ্ঠান',
      notes: '৪০ প্লেট কাচ্চি ও বোরহানি',
    },
    restaurantInfo.brandName
  );
  assert.ok(cateringUrl.startsWith('https://wa.me/8801711000000?text='));
});

import {
  formatWhatsAppOrderMessage,
  formatZoneDisplayName,
  generateOrderId,
  getEffectiveDeliveryEta,
  getEffectiveDeliveryFee,
  mergeSiteContent,
  normalizeTrackingOrderId,
  ORDER_STATUS_LABELS,
} from './orderLogic';
import { DEFAULT_SITE_CONTENT } from '../data/restaurantConfig';

test('normalizeTrackingOrderId handles Bengali digits, hash prefix, and bare numbers', () => {
  assert.equal(normalizeTrackingOrderId('#ORD-482915'), 'ORD-482915');
  assert.equal(normalizeTrackingOrderId('ord-৪৮২৯১৫'), 'ORD-482915');
  assert.equal(normalizeTrackingOrderId('৪৮২৯১৫'), 'ORD-482915');
  assert.match(generateOrderId(), /^#ORD-\d{6}$/);
  assert.equal(ORDER_STATUS_LABELS.pending, 'অপেক্ষমাণ');
  assert.equal(ORDER_STATUS_LABELS.preparing, 'রান্না চলছে');
  assert.equal(ORDER_STATUS_LABELS.out_for_delivery, 'ডেলিভারিতে আছে');
  assert.equal(ORDER_STATUS_LABELS.completed, 'সম্পন্ন');
});

test('mergeSiteContent merges partial page copy overrides safely and preserves defaults', () => {
  const merged = mergeSiteContent({
    hero: {
      ...DEFAULT_SITE_CONTENT.hero,
      headline: 'কাস্টম রাজকীয় শিরোনাম',
      statusOpenBadge: 'লাইভ কিচেন চালু',
    },
    footer: {
      ...DEFAULT_SITE_CONTENT.footer,
      aboutDescription: 'নতুন ফুটার বিবরণ',
    },
  });

  assert.equal(merged.hero.headline, 'কাস্টম রাজকীয় শিরোনাম');
  assert.equal(merged.footer.aboutDescription, 'নতুন ফুটার বিবরণ');
  assert.equal(merged.navbar.menuLabel, DEFAULT_SITE_CONTENT.navbar.menuLabel);
  assert.equal(merged.heritage.dishes.length, DEFAULT_SITE_CONTENT.heritage.dishes.length);
  assert.equal(merged.reviews.items.length, DEFAULT_SITE_CONTENT.reviews.items.length);

  const openAfternoon = new Date('2026-11-17T14:00:00');
  const customStatus = getRestaurantLiveStatus(openAfternoon, restaurantInfo, merged.hero);
  assert.equal(customStatus.badgeText, 'লাইভ কিচেন চালু');
});

test('sub-area overrides delivery fee, ETA, order summary, and WhatsApp receipt cleanly', () => {
  const kacchi = menuItems.find((m) => m.id === 'royal-mutton-kacchi-1-1')!;
  const sahebabad = deliveryZones.find((z) => z.id === 'sahebabad')!;
  const bazar = sahebabad.subAreas!.find((s) => s.id === 'sahebabad-bazar')!;
  const dokkhin = sahebabad.subAreas!.find((s) => s.id === 'sahebabad-dokkhin-para')!;

  // Sub-area without custom fee inherits parent zone fee (50)
  assert.equal(getEffectiveDeliveryFee(sahebabad, bazar), 50);
  assert.equal(getEffectiveDeliveryEta(sahebabad, bazar), sahebabad.eta);
  assert.equal(formatZoneDisplayName(sahebabad, bazar), 'সাহেবাবাদ — সাহেবাবাদ বাজার');

  // Sub-area with custom fee overrides parent fee (55)
  assert.equal(getEffectiveDeliveryFee(sahebabad, dokkhin), 55);
  const summary = computeOrderSummary([{ item: kacchi, quantity: 1 }], sahebabad, 'instant', dokkhin);
  assert.equal(summary.deliveryFee, 55);
  assert.equal(summary.grandTotal, kacchi.price + 55);

  const msg = formatWhatsAppOrderMessage(
    {
      orderId: '#ORD-9001',
      customerName: 'আরিফুল ইসলাম',
      phone: '01711000000',
      address: 'দক্ষিণ পাড়া মসজিদ মোড়',
      zone: sahebabad,
      subArea: dokkhin,
      orderType: 'instant',
      deliveryDate: '',
      timeSlot: '',
      items: [{ item: kacchi, quantity: 1 }],
    },
    summary,
    restaurantInfo.brandName
  );
  assert.match(msg, /এলাকা: সাহেবাবাদ — দক্ষিণ পাড়া/);
  assert.match(msg, /৳ ৫৫/);
});

test('sanitizeExternalUrl allows http/https links and rejects javascript/data schemes', () => {
  assert.equal(
    sanitizeExternalUrl('https://maps.google.com/?q=23.6214,91.1142'),
    'https://maps.google.com/?q=23.6214,91.1142'
  );
  assert.equal(sanitizeExternalUrl('http://example.com/page'), 'http://example.com/page');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeExternalUrl('   '), null);
});



