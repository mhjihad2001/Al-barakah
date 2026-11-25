/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  type AppConfig,
  CONFIG_DEFAULTS,
  type MenuCategory,
  type MenuItem,
} from './data/restaurantConfig';
import {
  type CartItem,
  computeOrderSummary,
  getRestaurantLiveStatus,
  loadAppConfig,
  loadSavedOrders,
  normalizeTrackingOrderId,
  type OrderStatus,
  type OrderType,
  saveAppConfig,
  saveOrderRecord,
  type SavedOrderRecord,
} from './utils/orderLogic';
import { MetaTracker } from './utils/metaTracker';
import { auth, trackAnalyticsEvent } from './firebase';
import {
  createCloudCapiDispatcher,
  deleteDeliveryZoneFromFirestore,
  deleteMenuItemFromFirestore,
  saveGeneralSettingsToFirestore,
  saveSecretSettingsToFirestore,
  saveSiteContentToFirestore,
  seedInitialData,
  signInAdminWithGoogle,
  signOutAdmin,
  submitOrderToFirestore,
  subscribeToAdminOrders,
  subscribeToStorefrontConfig,
  updateOrderStatusInFirestore,
  upsertDeliveryZoneToFirestore,
  upsertMenuItemToFirestore,
} from './utils/firestoreService';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SignatureHeritageSection } from './components/SignatureHeritageSection';
import { DishDetailModal, MenuSection } from './components/MenuSection';
import { CateringSection } from './components/CateringSection';
import { ReviewsAndFooter } from './components/ReviewsAndFooter';
import { CartDrawer } from './components/CartDrawer';
import { AdminModal } from './components/AdminModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';

declare global {
  interface Window {
    seedInitialData?: () => Promise<{ ok: boolean; message: string }>;
  }
}

function isAdminRouteLocation(): boolean {
  const cleanPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const cleanHash = window.location.hash
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const queryAdmin =
    params.get('admin') === '1' ||
    params.get('admin') === 'true' ||
    params.get('panel')?.toLowerCase() === 'admin';
  return (
    cleanPath === '/admin' ||
    cleanPath.endsWith('/admin') ||
    cleanHash === 'admin' ||
    queryAdmin
  );
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => loadAppConfig());
  const [orders, setOrders] = useState<SavedOrderRecord[]>(() => loadSavedOrders());
  const [firestoreOrders, setFirestoreOrders] = useState<SavedOrderRecord[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    () => loadAppConfig().deliveryZones[0]?.id ?? CONFIG_DEFAULTS.deliveryZones[0].id
  );
  const [selectedSubAreaId, setSelectedSubAreaId] = useState<string>(
    () =>
      loadAppConfig().deliveryZones[0]?.subAreas?.[0]?.id ??
      CONFIG_DEFAULTS.deliveryZones[0]?.subAreas?.[0]?.id ??
      ''
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('instant');
  const [cartOpen, setCartOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => isAdminRouteLocation());
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined);
  const [inspectedDish, setInspectedDish] = useState<MenuItem | null>(null);

  const pageViewFiredRef = useRef(false);

  const selectedZone =
    config.deliveryZones.find((z) => z.id === selectedZoneId) ??
    config.deliveryZones[0];

  const availableSubAreas = !selectedZone.isOutOfArea
    ? (selectedZone.subAreas ?? [])
    : [];
  const selectedSubArea =
    availableSubAreas.find((s) => s.id === selectedSubAreaId) ??
    availableSubAreas[0] ??
    null;

  const liveStatus = getRestaurantLiveStatus(
    new Date(),
    config.restaurantInfo,
    config.siteContent.hero
  );
  const totalItems = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);

  // Keep browser tab title synced with editable brand name & current route
  useEffect(() => {
    if (isAdminRoute) {
      document.title = `অ্যাডমিন প্যানেল — ${config.restaurantInfo.brandName}`;
      return;
    }
    if (config.restaurantInfo.brandName.trim()) {
      document.title = config.restaurantInfo.heritageOrigin.trim()
        ? `${config.restaurantInfo.brandName} — ${config.restaurantInfo.heritageOrigin}`
        : config.restaurantInfo.brandName;
    }
  }, [isAdminRoute, config.restaurantInfo.brandName, config.restaurantInfo.heritageOrigin]);

  // Register Cloud Function CAPI dispatcher & console seedInitialData helper
  useEffect(() => {
    MetaTracker.setCapiDispatcher(createCloudCapiDispatcher());
    window.seedInitialData = () => seedInitialData(CONFIG_DEFAULTS);
    return () => {
      MetaTracker.setCapiDispatcher(null);
      delete window.seedInitialData;
    };
  }, []);

  // Track Firebase Auth user for Admin features
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time Firestore storefront collections
  useEffect(() => {
    const unsub = subscribeToStorefrontConfig({
      onSettings: (restaurantInfo, metaPatch) => {
        setConfig((prev) => {
          const next: AppConfig = {
            ...prev,
            restaurantInfo,
            metaConfig: {
              ...prev.metaConfig,
              ...metaPatch,
            },
          };
          saveAppConfig(next);
          return next;
        });
      },
      onMenuItems: (menuItems) => {
        setConfig((prev) => {
          const next = { ...prev, menuItems };
          saveAppConfig(next);
          return next;
        });
      },
      onDeliveryZones: (deliveryZones) => {
        setConfig((prev) => {
          const next = { ...prev, deliveryZones };
          saveAppConfig(next);
          return next;
        });
      },
      onSiteContent: (siteContent) => {
        setConfig((prev) => {
          const next = { ...prev, siteContent };
          saveAppConfig(next);
          return next;
        });
      },
    });
    return () => unsub();
  }, []);

  // Subscribe to live Firestore orders when Admin is authenticated on the /admin route
  useEffect(() => {
    if (!adminUser || !adminUser.emailVerified || !isAdminRoute) {
      return;
    }
    const unsub = subscribeToAdminOrders((liveOrders) => {
      setFirestoreOrders(liveOrders);
    });
    return () => unsub();
  }, [adminUser, isAdminRoute]);

  // Sync MetaTracker configuration & fire initial PageView once on customer storefront
  useEffect(() => {
    MetaTracker.init(config.metaConfig);
    if (!isAdminRoute && !pageViewFiredRef.current) {
      pageViewFiredRef.current = true;
      void MetaTracker.track('PageView', {
        content_name: config.restaurantInfo.brandName,
        currency: 'BDT',
      });
      trackAnalyticsEvent('page_view', {
        page_title: config.restaurantInfo.brandName,
      });
    }
  }, [isAdminRoute, config.metaConfig, config.restaurantInfo.brandName]);

  // Sync route state when navigating via browser history (/admin) or hash (#admin)
  useEffect(() => {
    const syncRoute = () => {
      setIsAdminRoute(isAdminRouteLocation());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const handleExitAdminRoute = () => {
    window.history.pushState(null, '', '/');
    setIsAdminRoute(false);
  };

  const syncConfigDiffToFirestore = async (prev: AppConfig, next: AppConfig) => {
    if (!adminUser?.emailVerified) return;

    const tasks: Array<Promise<unknown>> = [];

    if (
      JSON.stringify(prev.restaurantInfo) !== JSON.stringify(next.restaurantInfo) ||
      prev.metaConfig.enabled !== next.metaConfig.enabled ||
      prev.metaConfig.pixelId !== next.metaConfig.pixelId ||
      prev.metaConfig.capiEnabled !== next.metaConfig.capiEnabled ||
      prev.metaConfig.testEventCode !== next.metaConfig.testEventCode ||
      prev.metaConfig.debugConsole !== next.metaConfig.debugConsole
    ) {
      tasks.push(saveGeneralSettingsToFirestore(next.restaurantInfo, next.metaConfig));
    }

    if (JSON.stringify(prev.siteContent) !== JSON.stringify(next.siteContent)) {
      tasks.push(saveSiteContentToFirestore(next.siteContent));
    }

    const prevMenuMap = new Map(prev.menuItems.map((m) => [m.id, m]));
    const nextMenuMap = new Map(next.menuItems.map((m) => [m.id, m]));

    next.menuItems.forEach((item, index) => {
      const old = prevMenuMap.get(item.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        tasks.push(upsertMenuItemToFirestore(item, item.sortOrder ?? index + 1));
      }
    });
    prev.menuItems.forEach((old) => {
      if (!nextMenuMap.has(old.id)) {
        tasks.push(deleteMenuItemFromFirestore(old.id));
      }
    });

    const prevZoneMap = new Map(prev.deliveryZones.map((z) => [z.id, z]));
    const nextZoneMap = new Map(next.deliveryZones.map((z) => [z.id, z]));

    next.deliveryZones.forEach((zone, index) => {
      const old = prevZoneMap.get(zone.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(zone)) {
        tasks.push(upsertDeliveryZoneToFirestore(zone, zone.sortOrder ?? index + 1));
      }
    });
    prev.deliveryZones.forEach((old) => {
      if (!nextZoneMap.has(old.id)) {
        tasks.push(deleteDeliveryZoneFromFirestore(old.id));
      }
    });

    await Promise.all(tasks);
  };

  const handleUpdateConfig = (next: AppConfig) => {
    const prev = config;
    setConfig(next);
    saveAppConfig(next);
    MetaTracker.init(next.metaConfig);
    void syncConfigDiffToFirestore(prev, next);
  };

  const handleResetDefaults = () => {
    setConfig(CONFIG_DEFAULTS);
    saveAppConfig(CONFIG_DEFAULTS);
    MetaTracker.init(CONFIG_DEFAULTS.metaConfig);
    if (adminUser?.emailVerified) {
      void seedInitialData(CONFIG_DEFAULTS);
    }
  };

  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const zone = config.deliveryZones.find((z) => z.id === zoneId);
    setSelectedSubAreaId(zone?.subAreas?.[0]?.id ?? '');
    if (zone) {
      void MetaTracker.track('SelectDeliveryZone', {
        zone_name: zone.name,
        delivery_fee: zone.fee,
        currency: 'BDT',
      });
      trackAnalyticsEvent('select_delivery_zone', {
        zone_id: zone.id,
        zone_name: zone.name,
        delivery_fee: zone.fee,
        currency: 'BDT',
      });
    }
  };

  const handleSelectSubArea = (subAreaId: string) => {
    setSelectedSubAreaId(subAreaId);
    const sub = selectedZone.subAreas?.find((s) => s.id === subAreaId);
    if (sub) {
      const fee = typeof sub.fee === 'number' ? sub.fee : selectedZone.fee;
      void MetaTracker.track('SelectDeliveryZone', {
        zone_name: `${selectedZone.name} — ${sub.name}`,
        delivery_fee: fee,
        currency: 'BDT',
      });
    }
  };

  const handleOpenCart = () => {
    setCartOpen(true);
    const summary = computeOrderSummary(
      cartItems,
      selectedZone,
      orderType,
      selectedSubArea
    );
    if (cartItems.length > 0) {
      void MetaTracker.track('InitiateCheckout', {
        content_ids: cartItems.map((c) => c.item.id),
        num_items: summary.itemCount,
        value: summary.grandTotal,
        currency: 'BDT',
      });
      trackAnalyticsEvent('begin_checkout', {
        currency: 'BDT',
        value: summary.grandTotal,
        items: cartItems.map((c) => ({
          item_id: c.item.id,
          item_name: c.item.name,
          price: c.item.price,
          quantity: c.quantity,
        })),
      });
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCartItems((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    if (item.preOrderOnly) {
      setOrderType('pre-order');
    }

    void MetaTracker.track('AddToCart', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price,
      currency: 'BDT',
    });
    trackAnalyticsEvent('add_to_cart', {
      currency: 'BDT',
      value: item.price,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
          quantity: 1,
        },
      ],
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((entry) =>
          entry.item.id === itemId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((entry) => entry.item.id !== itemId));
  };

  const handleInspectDish = (item: MenuItem) => {
    setInspectedDish(item);
    void MetaTracker.track('ViewContent', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price,
      currency: 'BDT',
    });
    trackAnalyticsEvent('view_item', {
      currency: 'BDT',
      value: item.price,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
        },
      ],
    });
  };

  const handleCategoryChange = (category: 'সব খাবার' | MenuCategory) => {
    void MetaTracker.track('ViewContent', {
      content_name: category,
      content_type: 'product_group',
      currency: 'BDT',
    });
  };

  const handleStartPreOrder = () => {
    setOrderType('pre-order');
    handleOpenCart();
  };

  const handleOpenTracking = (orderId?: string) => {
    setTrackingOrderId(orderId);
    setCartOpen(false);
    setTrackingOpen(true);
  };

  const handleOrderConfirmed = async (
    record: SavedOrderRecord,
    customerCity: string,
    metaEventId: string
  ) => {
    const updatedOrders = saveOrderRecord(record);
    setOrders(updatedOrders);

    try {
      await submitOrderToFirestore({ record, metaEventId });
    } catch (err) {
      console.warn('Order Firestore sync deferred/failed, kept in local backup:', err);
    }

    const userInfo = {
      phone: record.phone,
      firstName: record.customerName,
      city: customerCity,
    };

    const customData = {
      order_id: record.orderId,
      content_ids: record.items.map((i) => i.id),
      num_items: record.items.reduce((sum, i) => sum + i.quantity, 0),
      value: record.grandTotal,
      currency: 'BDT',
    };

    void MetaTracker.track('Lead', customData, userInfo);
    void MetaTracker.track('Purchase', customData, userInfo, {
      eventId: metaEventId,
      deferServerToFirestoreTrigger: true,
    });
    trackAnalyticsEvent('purchase', {
      transaction_id: record.orderId,
      currency: 'BDT',
      value: record.grandTotal,
      shipping: record.deliveryFee,
      items: record.items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  };

  const handleUpdateOrderStatus = async (orderIdOrDocId: string, status: OrderStatus) => {
    const cleanTarget = normalizeTrackingOrderId(orderIdOrDocId);
    setOrders((prev) =>
      prev.map((ord) =>
        normalizeTrackingOrderId(ord.orderId) === cleanTarget ? { ...ord, status } : ord
      )
    );
    if (adminUser?.emailVerified) {
      await updateOrderStatusInFirestore(cleanTarget, status);
    }
  };

  if (isAdminRoute) {
    return (
      <AdminModal
        isOpen={true}
        asPage={true}
        onClose={handleExitAdminRoute}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onResetDefaults={handleResetDefaults}
        orders={orders}
        firestoreOrders={firestoreOrders}
        adminUserEmail={adminUser?.email ?? null}
        onSignInAdmin={async () => {
          await signInAdminWithGoogle();
        }}
        onSignOutAdmin={signOutAdmin}
        onSeedFirestore={() => seedInitialData(config)}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onSaveSecretsToFirestore={saveSecretSettingsToFirestore}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#111815] text-[#FAF6F0]">
      <Navbar
        restaurantInfo={config.restaurantInfo}
        siteContent={config.siteContent.navbar}
        cartItemCount={totalItems}
        onOpenCart={handleOpenCart}
        onOpenTracking={() => handleOpenTracking()}
      />

      <main>
        <HeroSection
          restaurantInfo={config.restaurantInfo}
          heroContent={config.siteContent.hero}
          deliveryZones={config.deliveryZones}
          liveStatus={liveStatus}
          selectedZone={selectedZone}
          selectedSubArea={selectedSubArea}
          onSelectZone={handleSelectZone}
          onSelectSubArea={handleSelectSubArea}
          onStartPreOrder={handleStartPreOrder}
          onOpenTracking={() => handleOpenTracking()}
        />

        <SignatureHeritageSection
          menuItems={config.menuItems}
          heritageContent={config.siteContent.heritage}
          orderButtonLabel={config.siteContent.menu.orderButtonLabel}
          onAddToCart={handleAddToCart}
          onInspectDish={handleInspectDish}
        />

        <MenuSection
          items={config.menuItems}
          menuContent={config.siteContent.menu}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onCategoryChange={handleCategoryChange}
          onInspectDish={handleInspectDish}
        />

        <CateringSection
          restaurantInfo={config.restaurantInfo}
          cateringContent={config.siteContent.catering}
        />
      </main>

      <ReviewsAndFooter
        restaurantInfo={config.restaurantInfo}
        reviewsContent={config.siteContent.reviews}
        footerContent={config.siteContent.footer}
        onOpenTracking={() => handleOpenTracking()}
      />

      <DishDetailModal
        item={inspectedDish}
        onClose={() => setInspectedDish(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        restaurantInfo={config.restaurantInfo}
        deliveryZones={config.deliveryZones}
        isOpen={cartOpen}
        onOpen={handleOpenCart}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        selectedZone={selectedZone}
        selectedSubArea={selectedSubArea}
        onSelectZone={handleSelectZone}
        onSelectSubArea={handleSelectSubArea}
        orderType={orderType}
        onChangeOrderType={setOrderType}
        onOrderConfirmed={handleOrderConfirmed}
        onOpenTrackingForOrder={(orderId) => handleOpenTracking(orderId)}
      />

      <OrderTrackingModal
        isOpen={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        initialOrderId={trackingOrderId}
        localOrders={orders}
      />
    </div>
  );
}
