import { signInWithPopup, signOut } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  type AppConfig,
  CONFIG_DEFAULTS,
  type DeliverySubArea,
  type DeliveryZone,
  type MenuItem,
  type MetaTrackingConfig,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';
import {
  auth,
  db,
  functions,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  type MetaCapiDispatcher,
  normalizePhoneForMeta,
  readMetaCookies,
  sha256Hex,
} from './metaTracker';
import {
  mergeSiteContent,
  normalizeTrackingOrderId,
  type OrderStatus,
  type SavedOrderRecord,
} from './orderLogic';
import { MAX_MENU_IMAGE_LENGTH } from './imageUpload';

export interface OrderTrackingRecord {
  docId: string;
  orderId: string;
  status: OrderStatus;
  orderType: 'instant' | 'preorder';
  deliveryZone: string;
  preorderDate: string;
  preorderTimeSlot: string;
  itemCount: number;
  grandTotal: number;
  createdAtIso?: string;
  updatedAtIso?: string;
  source: 'firestore' | 'local';
}

function clampStr(value: unknown, maxLen: number): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

function parseSubAreas(raw: unknown): DeliverySubArea[] {
  if (!Array.isArray(raw)) return [];
  const result: DeliverySubArea[] = [];
  for (let i = 0; i < Math.min(raw.length, 25); i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const name = clampStr(obj.name, 80);
    if (!name) continue;
    const sub: DeliverySubArea = {
      id: clampStr(obj.id, 64) || `sub-${i + 1}`,
      name,
    };
    if (typeof obj.fee === 'number' && Number.isFinite(obj.fee)) {
      sub.fee = Math.max(0, Math.min(10000, obj.fee));
    }
    if (typeof obj.eta === 'string' && obj.eta.trim()) {
      sub.eta = clampStr(obj.eta, 60);
    }
    result.push(sub);
  }
  return result;
}

function sanitizeSubAreasPayload(subAreas?: DeliverySubArea[]): Array<Record<string, unknown>> {
  if (!Array.isArray(subAreas)) return [];
  return subAreas
    .filter((s) => s && typeof s.name === 'string' && s.name.trim().length > 0)
    .slice(0, 25)
    .map((s, idx) => {
      const clean: Record<string, unknown> = {
        id: clampStr(s.id, 64) || `sub-${idx + 1}`,
        name: clampStr(s.name, 80),
      };
      if (typeof s.fee === 'number' && Number.isFinite(s.fee)) {
        clean.fee = Math.max(0, Math.min(10000, s.fee));
      }
      if (typeof s.eta === 'string' && s.eta.trim()) {
        clean.eta = clampStr(s.eta, 60);
      }
      return clean;
    });
}

function timestampToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof (ts as Timestamp)?.toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

export async function signInAdminWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutAdmin() {
  await signOut(auth);
}

export function createCloudCapiDispatcher(): MetaCapiDispatcher {
  const callable = httpsCallable<
    Parameters<MetaCapiDispatcher>[0],
    { status: string }
  >(functions, 'trackMetaServerEvent');

  return async (payload) => {
    const res = await callable(payload);
    return res.data?.status === 'sent';
  };
}

export function subscribeToStorefrontConfig(handlers: {
  onSettings: (restaurantInfo: RestaurantInfo, metaConfig: Partial<MetaTrackingConfig>) => void;
  onSiteContent?: (siteContent: SiteContent) => void;
  onMenuItems: (items: MenuItem[]) => void;
  onDeliveryZones: (zones: DeliveryZone[]) => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const restaurantInfo: RestaurantInfo = {
          ...CONFIG_DEFAULTS.restaurantInfo,
          brandName: typeof d.brandName === 'string' && d.brandName ? d.brandName : CONFIG_DEFAULTS.restaurantInfo.brandName,
          heritageOrigin: typeof d.heritageOrigin === 'string' ? d.heritageOrigin : CONFIG_DEFAULTS.restaurantInfo.heritageOrigin,
          logoUrl: typeof d.logoUrl === 'string' ? d.logoUrl : CONFIG_DEFAULTS.restaurantInfo.logoUrl,
          whatsappNumber: typeof d.whatsappNumber === 'string' && d.whatsappNumber ? d.whatsappNumber : CONFIG_DEFAULTS.restaurantInfo.whatsappNumber,
          whatsappRedirectEnabled:
            typeof d.whatsappRedirectEnabled === 'boolean'
              ? d.whatsappRedirectEnabled
              : CONFIG_DEFAULTS.restaurantInfo.whatsappRedirectEnabled,
          displayPhone: typeof d.displayPhone === 'string' ? d.displayPhone : CONFIG_DEFAULTS.restaurantInfo.displayPhone,
          email: typeof d.email === 'string' ? d.email : CONFIG_DEFAULTS.restaurantInfo.email,
          address: typeof d.address === 'string' ? d.address : CONFIG_DEFAULTS.restaurantInfo.address,
          hoursDisplay: typeof d.hoursDisplay === 'string' ? d.hoursDisplay : CONFIG_DEFAULTS.restaurantInfo.hoursDisplay,
          openHour: typeof d.openHour === 'number' ? d.openHour : CONFIG_DEFAULTS.restaurantInfo.openHour,
          openMinute: typeof d.openMinute === 'number' ? d.openMinute : CONFIG_DEFAULTS.restaurantInfo.openMinute,
          closeHour: typeof d.closeHour === 'number' ? d.closeHour : CONFIG_DEFAULTS.restaurantInfo.closeHour,
          closeMinute: typeof d.closeMinute === 'number' ? d.closeMinute : CONFIG_DEFAULTS.restaurantInfo.closeMinute,
          statusMode:
            d.statusMode === 'open' || d.statusMode === 'preorder' || d.statusMode === 'auto'
              ? d.statusMode
              : CONFIG_DEFAULTS.restaurantInfo.statusMode,
          adminPin: typeof d.adminPin === 'string' && d.adminPin ? d.adminPin : CONFIG_DEFAULTS.restaurantInfo.adminPin,
          mapsCoordinates: typeof d.mapsCoordinates === 'string' ? d.mapsCoordinates : CONFIG_DEFAULTS.restaurantInfo.mapsCoordinates,
          mapsUrl: typeof d.mapsUrl === 'string' ? d.mapsUrl : CONFIG_DEFAULTS.restaurantInfo.mapsUrl,
          facebookUrl: typeof d.facebookUrl === 'string' ? d.facebookUrl : CONFIG_DEFAULTS.restaurantInfo.facebookUrl,
          instagramUrl: typeof d.instagramUrl === 'string' ? d.instagramUrl : CONFIG_DEFAULTS.restaurantInfo.instagramUrl,
        };

        const metaPatch: Partial<MetaTrackingConfig> = {
          enabled: typeof d.metaEnabled === 'boolean' ? d.metaEnabled : false,
          pixelId: typeof d.metaPixelId === 'string' ? d.metaPixelId : '',
          capiEnabled: typeof d.capiEnabled === 'boolean' ? d.capiEnabled : false,
          testEventCode: typeof d.metaTestEventCode === 'string' ? d.metaTestEventCode : '',
          debugConsole: typeof d.metaDebugConsole === 'boolean' ? d.metaDebugConsole : false,
        };

        handlers.onSettings(restaurantInfo, metaPatch);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
      }
    )
  );

  if (handlers.onSiteContent) {
    const onSiteContent = handlers.onSiteContent;
    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'site_content'),
        (snap) => {
          if (!snap.exists()) return;
          const merged = mergeSiteContent(snap.data() as Partial<SiteContent>);
          onSiteContent(merged);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'settings/site_content');
        }
      )
    );
  }

  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'menu_items'),
        where('sortOrder', '>=', 0),
        orderBy('sortOrder', 'asc')
      ),
      (snap) => {
        if (snap.empty) return;
        const items: MenuItem[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: String(d.name ?? ''),
            category: d.category as MenuItem['category'],
            description: String(d.description ?? ''),
            servingSize: String(d.servingSize ?? ''),
            price: Number(d.price ?? 0),
            image: String(d.image ?? '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg'),
            available: Boolean(d.available),
            preOrderOnly: Boolean(d.preOrderOnly),
            advanceNotice: d.advanceNotice ? String(d.advanceNotice) : undefined,
            sortOrder: Number(d.sortOrder ?? 0),
          };
        });
        handlers.onMenuItems(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'menu_items');
      }
    )
  );

  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'delivery_zones'),
        where('sortOrder', '>=', 0),
        orderBy('sortOrder', 'asc')
      ),
      (snap) => {
        if (snap.empty) return;
        const zones: DeliveryZone[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: String(d.name ?? ''),
            fee: Number(d.fee ?? 0),
            eta: String(d.eta ?? ''),
            isOutOfArea: Boolean(d.isOutOfArea),
            note: d.note ? String(d.note) : undefined,
            subAreas: parseSubAreas(d.subAreas),
            sortOrder: Number(d.sortOrder ?? 0),
          };
        });
        handlers.onDeliveryZones(zones);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'delivery_zones');
      }
    )
  );

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

export async function submitOrderToFirestore(params: {
  record: SavedOrderRecord;
  metaEventId: string;
}): Promise<{ docId: string; savedToFirestore: boolean }> {
  const { record, metaEventId } = params;
  const cleanDocId = normalizeTrackingOrderId(record.orderId) || `ORD-${Date.now()}`;
  const cookies = readMetaCookies();
  const normalizedPhone = normalizePhoneForMeta(record.phone);
  const phoneHash = normalizedPhone ? await sha256Hex(normalizedPhone) : '';

  const firestoreOrderType: 'instant' | 'preorder' =
    record.orderType === 'pre-order' ? 'preorder' : 'instant';

  const itemCount = Math.max(
    1,
    record.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const orderDocPayload = {
    orderId: clampStr(record.orderId, 40),
    customerName: clampStr(record.customerName, 120),
    customerPhone: clampStr(record.phone, 25),
    deliveryZone: clampStr(record.zoneName, 100),
    fullAddress: clampStr(record.address, 400),
    orderType: firestoreOrderType,
    preorderDate: clampStr(record.deliveryDate ?? '', 20),
    preorderTimeSlot: clampStr(record.timeSlot ?? '', 60),
    items: record.items.slice(0, 30).map((i) => ({
      id: clampStr(i.id, 128),
      name: clampStr(i.name, 140),
      servingSize: clampStr(i.servingSize, 80),
      quantity: Math.max(1, Number(i.quantity || 1)),
      unitPrice: Math.max(0, Number(i.unitPrice || 0)),
    })),
    subtotal: Math.max(0, Number(record.subtotal || 0)),
    deliveryCharge: Math.max(0, Number(record.deliveryFee || 0)),
    grandTotal: Math.max(0, Number(record.grandTotal || 0)),
    status: 'pending' as const,
    metaEventId: clampStr(metaEventId, 80),
    fbp: clampStr(cookies.fbp ?? '', 160),
    fbc: clampStr(cookies.fbc ?? '', 240),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const trackingPayload = {
    orderId: clampStr(record.orderId, 40),
    status: 'pending' as const,
    orderType: firestoreOrderType,
    deliveryZone: clampStr(record.zoneName, 100),
    preorderDate: clampStr(record.deliveryDate ?? '', 20),
    preorderTimeSlot: clampStr(record.timeSlot ?? '', 60),
    itemCount,
    grandTotal: Math.max(0, Number(record.grandTotal || 0)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    let existingPhoneIndex = false;
    let existingPhoneCount = 0;

    if (phoneHash.length === 64) {
      const phoneSnap = await getDoc(doc(db, 'phone_order_index', phoneHash));
      if (phoneSnap.exists()) {
        existingPhoneIndex = true;
        const ids = phoneSnap.data()?.orderIds;
        existingPhoneCount = Array.isArray(ids) ? ids.length : 0;
      }
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', cleanDocId), orderDocPayload);
    batch.set(doc(db, 'order_tracking', cleanDocId), trackingPayload);

    if (phoneHash.length === 64) {
      const phoneRef = doc(db, 'phone_order_index', phoneHash);
      if (!existingPhoneIndex) {
        batch.set(phoneRef, {
          latestOrderId: cleanDocId,
          orderIds: [cleanDocId],
          updatedAt: serverTimestamp(),
        });
      } else if (existingPhoneCount < 30) {
        batch.update(phoneRef, {
          latestOrderId: cleanDocId,
          orderIds: arrayUnion(cleanOrderIdValue(cleanDocId)),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return { docId: cleanDocId, savedToFirestore: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${cleanDocId}`);
  }
}

function cleanOrderIdValue(id: string): string {
  return clampStr(id, 64);
}

export async function lookupOrderTracking(
  queryText: string
): Promise<OrderTrackingRecord[]> {
  const trimmed = queryText.trim();
  if (!trimmed) return [];

  const normalizedPhone = normalizePhoneForMeta(trimmed);
  const looksLikePhone = /^\+?[\d০-৯\s-]{8,16}$/.test(trimmed) && normalizedPhone.length >= 10;

  if (looksLikePhone) {
    const phoneHash = await sha256Hex(normalizedPhone);
    if (phoneHash.length !== 64) return [];
    try {
      const idxSnap = await getDoc(doc(db, 'phone_order_index', phoneHash));
      if (!idxSnap.exists()) return [];
      const orderIds = Array.isArray(idxSnap.data().orderIds)
        ? (idxSnap.data().orderIds as string[]).slice(-10).reverse()
        : [];
      const trackingSnaps = await Promise.all(
        orderIds.map((id) => getDoc(doc(db, 'order_tracking', id)))
      );
      return trackingSnaps
        .filter((s) => s.exists())
        .map((s) => mapTrackingSnap(s.id, s.data()!));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `phone_order_index/${phoneHash}`);
    }
  }

  const cleanId = normalizeTrackingOrderId(trimmed);
  if (!cleanId) return [];

  try {
    const trackingSnap = await getDoc(doc(db, 'order_tracking', cleanId));
    if (!trackingSnap.exists()) return [];
    return [mapTrackingSnap(trackingSnap.id, trackingSnap.data())];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `order_tracking/${cleanId}`);
  }
}

export function subscribeToOrderTracking(
  docId: string,
  onUpdate: (record: OrderTrackingRecord | null) => void
): Unsubscribe {
  const cleanId = normalizeTrackingOrderId(docId);
  return onSnapshot(
    doc(db, 'order_tracking', cleanId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(mapTrackingSnap(snap.id, snap.data()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `order_tracking/${cleanId}`);
    }
  );
}

function mapTrackingSnap(
  docId: string,
  d: Record<string, unknown>
): OrderTrackingRecord {
  return {
    docId,
    orderId: String(d.orderId ?? `#${docId}`),
    status: (d.status as OrderStatus) || 'pending',
    orderType: d.orderType === 'preorder' ? 'preorder' : 'instant',
    deliveryZone: String(d.deliveryZone ?? ''),
    preorderDate: String(d.preorderDate ?? ''),
    preorderTimeSlot: String(d.preorderTimeSlot ?? ''),
    itemCount: Number(d.itemCount ?? 1),
    grandTotal: Number(d.grandTotal ?? 0),
    createdAtIso: timestampToIso(d.createdAt),
    updatedAtIso: timestampToIso(d.updatedAt),
    source: 'firestore',
  };
}

export function subscribeToAdminOrders(
  onOrders: (orders: SavedOrderRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => {
      const list: SavedOrderRecord[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          docId: docSnap.id,
          orderId: String(d.orderId ?? `#${docSnap.id}`),
          status: (d.status as OrderStatus) || 'pending',
          createdAt: timestampToIso(d.createdAt),
          customerName: String(d.customerName ?? ''),
          phone: String(d.customerPhone ?? ''),
          zoneName: String(d.deliveryZone ?? ''),
          address: String(d.fullAddress ?? ''),
          orderType: d.orderType === 'preorder' ? 'pre-order' : 'instant',
          deliveryDate: d.preorderDate ? String(d.preorderDate) : undefined,
          timeSlot: d.preorderTimeSlot ? String(d.preorderTimeSlot) : undefined,
          items: Array.isArray(d.items) ? d.items : [],
          subtotal: Number(d.subtotal ?? 0),
          deliveryFee: Number(d.deliveryCharge ?? 0),
          grandTotal: Number(d.grandTotal ?? 0),
          metaEventId: d.metaEventId ? String(d.metaEventId) : undefined,
        };
      });
      onOrders(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export async function updateOrderStatusInFirestore(
  orderDocId: string,
  status: OrderStatus
): Promise<void> {
  const cleanId = normalizeTrackingOrderId(orderDocId);
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', cleanId), {
      status,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'order_tracking', cleanId), {
      status,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${cleanId}`);
  }
}

export async function saveGeneralSettingsToFirestore(
  restaurantInfo: RestaurantInfo,
  metaConfig: MetaTrackingConfig
): Promise<void> {
  const payload = {
    brandName: clampStr(restaurantInfo.brandName, 120) || 'আল-বারাকাহ্‌ কাচ্চি এন্ড তেহারি',
    heritageOrigin: clampStr(restaurantInfo.heritageOrigin, 200),
    logoUrl: clampStr(restaurantInfo.logoUrl, 500),
    whatsappNumber: clampStr(restaurantInfo.whatsappNumber, 25) || '8801711000000',
    whatsappRedirectEnabled: Boolean(restaurantInfo.whatsappRedirectEnabled),
    displayPhone: clampStr(restaurantInfo.displayPhone, 30),
    email: clampStr(restaurantInfo.email, 120),
    address: clampStr(restaurantInfo.address, 300),
    hoursDisplay: clampStr(restaurantInfo.hoursDisplay, 120),
    openHour: Math.min(23, Math.max(0, Number(restaurantInfo.openHour ?? 11))),
    openMinute: Math.min(59, Math.max(0, Number(restaurantInfo.openMinute ?? 30))),
    closeHour: Math.min(23, Math.max(0, Number(restaurantInfo.closeHour ?? 22))),
    closeMinute: Math.min(59, Math.max(0, Number(restaurantInfo.closeMinute ?? 30))),
    statusMode: restaurantInfo.statusMode,
    isOpen: restaurantInfo.statusMode !== 'preorder',
    adminPin: clampStr(restaurantInfo.adminPin, 20) || '1234',
    mapsCoordinates: clampStr(restaurantInfo.mapsCoordinates, 80),
    mapsUrl: clampStr(restaurantInfo.mapsUrl, 500),
    facebookUrl: clampStr(restaurantInfo.facebookUrl, 500),
    instagramUrl: clampStr(restaurantInfo.instagramUrl, 500),
    metaEnabled: Boolean(metaConfig.enabled),
    metaPixelId: clampStr(metaConfig.pixelId, 30),
    capiEnabled: Boolean(metaConfig.capiEnabled),
    metaTestEventCode: clampStr(metaConfig.testEventCode, 40),
    metaDebugConsole: Boolean(metaConfig.debugConsole),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'settings', 'general'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/general');
  }
}

function sanitizeSiteContentPayload(siteContent: SiteContent) {
  return {
    navbar: {
      heritageLabel: clampStr(siteContent.navbar.heritageLabel, 60),
      menuLabel: clampStr(siteContent.navbar.menuLabel, 60),
      cateringLabel: clampStr(siteContent.navbar.cateringLabel, 60),
      contactLabel: clampStr(siteContent.navbar.contactLabel, 60),
      trackLabel: clampStr(siteContent.navbar.trackLabel, 60),
      cartLabel: clampStr(siteContent.navbar.cartLabel, 40),
    },
    hero: {
      heroImageUrl: clampStr(siteContent.hero.heroImageUrl, 500),
      headline: clampStr(siteContent.hero.headline, 240),
      description: clampStr(siteContent.hero.description, 800),
      primaryCtaLabel: clampStr(siteContent.hero.primaryCtaLabel, 80),
      secondaryCtaLabel: clampStr(siteContent.hero.secondaryCtaLabel, 80),
      trackCtaLabel: clampStr(siteContent.hero.trackCtaLabel, 80),
      zoneCheckerTitle: clampStr(siteContent.hero.zoneCheckerTitle, 120),
      zoneSelectLabel: clampStr(siteContent.hero.zoneSelectLabel, 120),
      statusOpenBadge: clampStr(siteContent.hero.statusOpenBadge, 100),
      statusPreorderBadge: clampStr(siteContent.hero.statusPreorderBadge, 100),
      statusOpenDetail: clampStr(siteContent.hero.statusOpenDetail, 240),
      statusPreorderDetail: clampStr(siteContent.hero.statusPreorderDetail, 240),
      statusClosedDetail: clampStr(siteContent.hero.statusClosedDetail, 240),
    },
    heritage: {
      eyebrow: clampStr(siteContent.heritage.eyebrow, 100),
      heading: clampStr(siteContent.heritage.heading, 240),
      subheading: clampStr(siteContent.heritage.subheading, 600),
      dishes: siteContent.heritage.dishes.slice(0, 12).map((d) => ({
        id: clampStr(d.id, 64),
        number: clampStr(d.number, 16),
        title: clampStr(d.title, 140),
        subtitle: clampStr(d.subtitle, 200),
        story: clampStr(d.story, 600),
        pairing: clampStr(d.pairing, 160),
        price: Math.max(0, Math.min(500000, Number(d.price || 0))),
        servingSize: clampStr(d.servingSize, 80),
        image: clampStr(d.image, 500),
        menuItemId: clampStr(d.menuItemId, 128),
      })),
    },
    menu: {
      eyebrow: clampStr(siteContent.menu.eyebrow, 100),
      heading: clampStr(siteContent.menu.heading, 240),
      preOrderFilterLabel: clampStr(siteContent.menu.preOrderFilterLabel, 80),
      orderButtonLabel: clampStr(siteContent.menu.orderButtonLabel, 60),
      outOfStockLabel: clampStr(siteContent.menu.outOfStockLabel, 80),
    },
    catering: {
      eyebrow: clampStr(siteContent.catering.eyebrow, 100),
      heading: clampStr(siteContent.catering.heading, 240),
      description: clampStr(siteContent.catering.description, 800),
      highlight1Title: clampStr(siteContent.catering.highlight1Title, 120),
      highlight1Text: clampStr(siteContent.catering.highlight1Text, 300),
      highlight2Title: clampStr(siteContent.catering.highlight2Title, 120),
      highlight2Text: clampStr(siteContent.catering.highlight2Text, 300),
      formTitle: clampStr(siteContent.catering.formTitle, 140),
      formSubtitle: clampStr(siteContent.catering.formSubtitle, 300),
      submitButtonLabel: clampStr(siteContent.catering.submitButtonLabel, 100),
    },
    reviews: {
      eyebrow: clampStr(siteContent.reviews.eyebrow, 100),
      heading: clampStr(siteContent.reviews.heading, 240),
      ratingBadgeText: clampStr(siteContent.reviews.ratingBadgeText, 40),
      verifiedLabel: clampStr(siteContent.reviews.verifiedLabel, 120),
      items: siteContent.reviews.items.slice(0, 20).map((r) => ({
        id: clampStr(r.id, 64),
        author: clampStr(r.author, 100),
        location: clampStr(r.location, 100),
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating || 5)))),
        dishOrdered: clampStr(r.dishOrdered, 140),
        dateLabel: clampStr(r.dateLabel, 60),
        quote: clampStr(r.quote, 600),
      })),
    },
    footer: {
      aboutDescription: clampStr(siteContent.footer.aboutDescription, 500),
      quickLinksHeading: clampStr(siteContent.footer.quickLinksHeading, 80),
      socialHeading: clampStr(siteContent.footer.socialHeading, 80),
      mapHeaderLabel: clampStr(siteContent.footer.mapHeaderLabel, 100),
      mapLocationNote: clampStr(siteContent.footer.mapLocationNote, 240),
      mapFooterLabel: clampStr(siteContent.footer.mapFooterLabel, 100),
      mapButtonLabel: clampStr(siteContent.footer.mapButtonLabel, 80),
      copyrightText: clampStr(siteContent.footer.copyrightText, 120),
      bottomNote: clampStr(siteContent.footer.bottomNote, 160),
    },
    updatedAt: serverTimestamp(),
  };
}

export async function saveSiteContentToFirestore(siteContent: SiteContent): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'site_content'), sanitizeSiteContentPayload(siteContent));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/site_content');
  }
}

export async function saveSecretSettingsToFirestore(
  capiAccessToken: string,
  capiEndpointUrl: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'secrets'), {
      capiAccessToken: clampStr(capiAccessToken, 512),
      capiEndpointUrl: clampStr(capiEndpointUrl, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/secrets');
  }
}

export async function upsertMenuItemToFirestore(
  item: MenuItem,
  sortOrder: number
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: clampStr(item.id, 128),
    name: clampStr(item.name, 140),
    category: item.category,
    description: clampStr(item.description, 600),
    servingSize: clampStr(item.servingSize, 80),
    price: Math.max(0, Math.min(500000, Number(item.price || 0))),
    image: clampStr(item.image, MAX_MENU_IMAGE_LENGTH),
    available: Boolean(item.available),
    preOrderOnly: Boolean(item.preOrderOnly),
    sortOrder: Math.max(0, Math.min(10000, Number(sortOrder))),
  };
  if (item.advanceNotice) {
    payload.advanceNotice = clampStr(item.advanceNotice, 160);
  }
  try {
    await setDoc(doc(db, 'menu_items', item.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `menu_items/${item.id}`);
  }
}

export async function deleteMenuItemFromFirestore(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'menu_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `menu_items/${itemId}`);
  }
}

export async function upsertDeliveryZoneToFirestore(
  zone: DeliveryZone,
  sortOrder: number
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: clampStr(zone.id, 128),
    name: clampStr(zone.name, 100),
    fee: Math.max(0, Math.min(10000, Number(zone.fee || 0))),
    eta: clampStr(zone.eta, 80) || '৩০–৪০ মিনিট',
    isOutOfArea: Boolean(zone.isOutOfArea),
    subAreas: sanitizeSubAreasPayload(zone.subAreas),
    sortOrder: Math.max(0, Math.min(10000, Number(sortOrder))),
  };
  if (zone.note) {
    payload.note = clampStr(zone.note, 300);
  }
  try {
    await setDoc(doc(db, 'delivery_zones', zone.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `delivery_zones/${zone.id}`);
  }
}

export async function deleteDeliveryZoneFromFirestore(zoneId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'delivery_zones', zoneId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `delivery_zones/${zoneId}`);
  }
}

/**
 * Seeds initial Bengali restaurant settings, menu items, and delivery zones to Firestore.
 * Exposed globally on window.seedInitialData() as well as inside the Admin panel.
 */
export async function seedInitialData(
  sourceConfig: AppConfig = CONFIG_DEFAULTS
): Promise<{ ok: boolean; message: string }> {
  if (!auth.currentUser) {
    try {
      await signInAdminWithGoogle();
    } catch {
      const msg =
        'Firestore-এ ডেটা সিড করতে অনুগ্রহ করে অ্যাডমিন প্যানেল থেকে Google সাইন-ইন করুন।';
      console.warn('[seedInitialData]', msg);
      return { ok: false, message: msg };
    }
  }

  try {
    const batch = writeBatch(db);

    batch.set(doc(db, 'settings', 'general'), {
      brandName: clampStr(sourceConfig.restaurantInfo.brandName, 120),
      heritageOrigin: clampStr(sourceConfig.restaurantInfo.heritageOrigin, 200),
      logoUrl: clampStr(sourceConfig.restaurantInfo.logoUrl, 500),
      whatsappNumber: clampStr(sourceConfig.restaurantInfo.whatsappNumber, 25),
      whatsappRedirectEnabled: Boolean(sourceConfig.restaurantInfo.whatsappRedirectEnabled),
      displayPhone: clampStr(sourceConfig.restaurantInfo.displayPhone, 30),
      email: clampStr(sourceConfig.restaurantInfo.email, 120),
      address: clampStr(sourceConfig.restaurantInfo.address, 300),
      hoursDisplay: clampStr(sourceConfig.restaurantInfo.hoursDisplay, 120),
      openHour: sourceConfig.restaurantInfo.openHour,
      openMinute: sourceConfig.restaurantInfo.openMinute,
      closeHour: sourceConfig.restaurantInfo.closeHour,
      closeMinute: sourceConfig.restaurantInfo.closeMinute,
      statusMode: sourceConfig.restaurantInfo.statusMode,
      isOpen: sourceConfig.restaurantInfo.statusMode !== 'preorder',
      adminPin: clampStr(sourceConfig.restaurantInfo.adminPin, 20),
      mapsCoordinates: clampStr(sourceConfig.restaurantInfo.mapsCoordinates, 80),
      mapsUrl: clampStr(sourceConfig.restaurantInfo.mapsUrl, 500),
      facebookUrl: clampStr(sourceConfig.restaurantInfo.facebookUrl, 500),
      instagramUrl: clampStr(sourceConfig.restaurantInfo.instagramUrl, 500),
      metaEnabled: Boolean(sourceConfig.metaConfig.enabled),
      metaPixelId: clampStr(sourceConfig.metaConfig.pixelId, 30),
      capiEnabled: Boolean(sourceConfig.metaConfig.capiEnabled),
      metaTestEventCode: clampStr(sourceConfig.metaConfig.testEventCode, 40),
      metaDebugConsole: Boolean(sourceConfig.metaConfig.debugConsole),
      updatedAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'settings', 'site_content'),
      sanitizeSiteContentPayload(sourceConfig.siteContent)
    );

    sourceConfig.menuItems.forEach((item, index) => {
      const payload: Record<string, unknown> = {
        id: clampStr(item.id, 128),
        name: clampStr(item.name, 140),
        category: item.category,
        description: clampStr(item.description, 600),
        servingSize: clampStr(item.servingSize, 80),
        price: Math.max(0, Number(item.price || 0)),
        image: clampStr(item.image, MAX_MENU_IMAGE_LENGTH),
        available: Boolean(item.available),
        preOrderOnly: Boolean(item.preOrderOnly),
        sortOrder: item.sortOrder ?? index + 1,
      };
      if (item.advanceNotice) {
        payload.advanceNotice = clampStr(item.advanceNotice, 160);
      }
      batch.set(doc(db, 'menu_items', item.id), payload);
    });

    sourceConfig.deliveryZones.forEach((zone, index) => {
      const payload: Record<string, unknown> = {
        id: clampStr(zone.id, 128),
        name: clampStr(zone.name, 100),
        fee: Math.max(0, Number(zone.fee || 0)),
        eta: clampStr(zone.eta, 80),
        isOutOfArea: Boolean(zone.isOutOfArea),
        subAreas: sanitizeSubAreasPayload(zone.subAreas),
        sortOrder: zone.sortOrder ?? index + 1,
      };
      if (zone.note) {
        payload.note = clampStr(zone.note, 300);
      }
      batch.set(doc(db, 'delivery_zones', zone.id), payload);
    });

    await batch.commit();
    console.info('[seedInitialData] সফলভাবে Firestore-এ ডিফল্ট বাংলা ডেটা সিড হয়েছে।');
    return {
      ok: true,
      message: 'সফলভাবে Firestore-এ মেনু, জোন ও সেটিংস সিড হয়েছে।',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialData');
  }
}
