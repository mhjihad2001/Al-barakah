import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Download,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  type AppConfig,
  CONFIG_DEFAULTS,
  DEFAULT_SITE_CONTENT,
  type DeliveryZone,
  type MenuCategory,
  type MenuItem,
  type StoreStatusMode,
} from '../data/restaurantConfig';
import { type MetaEventLogEntry, MetaTracker } from '../utils/metaTracker';
import {
  formatBDT,
  mergeSiteContent,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type SavedOrderRecord,
  toBengaliDigits,
} from '../utils/orderLogic';
import { AdminPageCopyEditor } from './AdminPageCopyEditor';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (next: AppConfig) => void;
  onResetDefaults: () => void;
  orders: SavedOrderRecord[];
  firestoreOrders: SavedOrderRecord[];
  adminUserEmail: string | null;
  onSignInAdmin: () => Promise<void>;
  onSignOutAdmin: () => Promise<void>;
  onSeedFirestore: () => Promise<{ ok: boolean; message: string }>;
  onUpdateOrderStatus: (orderIdOrDocId: string, status: OrderStatus) => Promise<void>;
  onSaveSecretsToFirestore: (token: string, endpoint: string) => Promise<void>;
}

type AdminTab = 'general' | 'content' | 'menu' | 'zones' | 'meta' | 'orders';

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'general', label: 'সাধারণ তথ্য' },
  { id: 'content', label: 'পেজের সব লেখা' },
  { id: 'menu', label: 'মেনু ম্যানেজমেন্ট' },
  { id: 'zones', label: 'ডেলিভারি জোন' },
  { id: 'meta', label: 'মেটা অ্যাডস ও ট্র্যাকিং' },
  { id: 'orders', label: 'অর্ডার হিস্ট্রি ও ব্যাকআপ' },
];

const CATEGORY_OPTIONS: MenuCategory[] = [
  'স্পেশাল কাচ্চি ও তেহারি',
  'কাবাব ও স্টার্টার',
  'ডেজার্ট ও পানীয়',
];

export function AdminModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetDefaults,
  orders,
  firestoreOrders,
  adminUserEmail,
  onSignInAdmin,
  onSignOutAdmin,
  onSeedFirestore,
  onUpdateOrderStatus,
  onSaveSecretsToFirestore,
}: AdminModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('general');
  const [saveBanner, setSaveBanner] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // New Menu Item State
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategory, setNewDishCategory] = useState<MenuCategory>(CATEGORY_OPTIONS[0]);
  const [newDishPrice, setNewDishPrice] = useState('350');
  const [newDishServing, setNewDishServing] = useState('১ জনের জন্য');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishImage, setNewDishImage] = useState(
    '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg'
  );
  const [newDishPreOrder, setNewDishPreOrder] = useState(false);
  const [newDishNotice, setNewDishNotice] = useState('কমপক্ষে ৪ ঘণ্টা আগে অর্ডার করতে হবে');
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  // New Delivery Zone State
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState('60');
  const [newZoneEta, setNewZoneEta] = useState('৪০–৫০ মিনিট');
  const [newZoneNote, setNewZoneNote] = useState('');
  const [newZoneOutOfArea, setNewZoneOutOfArea] = useState(false);

  // Meta Debugger Logs
  const [metaLogs, setMetaLogs] = useState<MetaEventLogEntry[]>([]);
  const [testSending, setTestSending] = useState(false);

  // Config Export / Import
  const [copiedJson, setCopiedJson] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const unsubscribe = MetaTracker.subscribe((logs) => {
      setMetaLogs(logs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const flashBanner = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(''), 2500);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === config.restaurantInfo.adminPin) {
      setUnlocked(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('ভুল পিন! ডিফল্ট পিন হলো 1234');
    }
  };

  const updateRestaurantInfo = <K extends keyof AppConfig['restaurantInfo']>(
    key: K,
    value: AppConfig['restaurantInfo'][K]
  ) => {
    onUpdateConfig({
      ...config,
      restaurantInfo: {
        ...config.restaurantInfo,
        [key]: value,
      },
    });
  };

  const updateMetaConfig = <K extends keyof AppConfig['metaConfig']>(
    key: K,
    value: AppConfig['metaConfig'][K]
  ) => {
    onUpdateConfig({
      ...config,
      metaConfig: {
        ...config.metaConfig,
        [key]: value,
      },
    });
  };

  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) return;
    const priceNum = Math.max(0, Number(newDishPrice) || 0);
    const created: MenuItem = {
      id: `dish-${Date.now()}`,
      name: newDishName.trim(),
      category: newDishCategory,
      description:
        newDishDesc.trim() || 'ঐতিহ্যবাহী রেসিপিতে খাঁটি মসলায় প্রস্তুতকৃত তাজা খাবার।',
      servingSize: newDishServing.trim() || '১ জনের জন্য',
      price: priceNum,
      image:
        newDishImage.trim() || '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg',
      available: true,
      preOrderOnly: newDishPreOrder,
      advanceNotice: newDishPreOrder ? newDishNotice.trim() : undefined,
    };

    onUpdateConfig({
      ...config,
      menuItems: [created, ...config.menuItems],
    });
    setNewDishName('');
    setNewDishDesc('');
    setNewDishPreOrder(false);
    flashBanner('নতুন খাবার মেনুতে যোগ করা হয়েছে।');
  };

  const handleUpdateMenuItem = (id: string, patch: Partial<MenuItem>) => {
    onUpdateConfig({
      ...config,
      menuItems: config.menuItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  const handleDeleteMenuItem = (id: string) => {
    onUpdateConfig({
      ...config,
      menuItems: config.menuItems.filter((item) => item.id !== id),
    });
    flashBanner('খাবারটি মেনু থেকে মুছে ফেলা হয়েছে।');
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    const zone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: newZoneName.trim(),
      fee: newZoneOutOfArea ? 0 : Math.max(0, Number(newZoneFee) || 0),
      eta: newZoneEta.trim() || '৪০–৫০ মিনিট',
      note: newZoneNote.trim() || undefined,
      isOutOfArea: newZoneOutOfArea,
    };
    onUpdateConfig({
      ...config,
      deliveryZones: [...config.deliveryZones, zone],
    });
    setNewZoneName('');
    setNewZoneNote('');
    setNewZoneOutOfArea(false);
    flashBanner('নতুন ডেলিভারি জোন যোগ করা হয়েছে।');
  };

  const handleUpdateZone = (id: string, patch: Partial<DeliveryZone>) => {
    onUpdateConfig({
      ...config,
      deliveryZones: config.deliveryZones.map((z) =>
        z.id === id ? { ...z, ...patch } : z
      ),
    });
  };

  const handleDeleteZone = (id: string) => {
    if (config.deliveryZones.length <= 1) return;
    onUpdateConfig({
      ...config,
      deliveryZones: config.deliveryZones.filter((z) => z.id !== id),
    });
    flashBanner('ডেলিভারি জোন মুছে ফেলা হয়েছে।');
  };

  const handleSendTestEvent = async () => {
    setTestSending(true);
    try {
      await MetaTracker.sendTestEvent();
      flashBanner('টেস্ট ইভেন্ট ফায়ার করা হয়েছে। নিচের লগে দেখুন।');
    } finally {
      setTestSending(false);
    }
  };

  const handleCopyConfigJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setCopiedJson(false);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restaurant-config-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importText) as Partial<AppConfig>;
      if (!parsed.restaurantInfo || !Array.isArray(parsed.menuItems)) {
        setImportError('সঠিক কনফিগারেশন JSON ফরম্যাট নয়।');
        return;
      }
      onUpdateConfig({
        restaurantInfo: {
          ...CONFIG_DEFAULTS.restaurantInfo,
          ...parsed.restaurantInfo,
        },
        siteContent: mergeSiteContent(parsed.siteContent),
        deliveryZones: Array.isArray(parsed.deliveryZones)
          ? parsed.deliveryZones
          : config.deliveryZones,
        menuItems: parsed.menuItems,
        metaConfig: {
          ...CONFIG_DEFAULTS.metaConfig,
          ...(parsed.metaConfig ?? {}),
        },
      });
      setImportError('');
      setImportText('');
      flashBanner('কনফিগারেশন সফলভাবে ইমপোর্ট হয়েছে।');
    } catch {
      setImportError('JSON পার্স করা যায়নি। সিনট্যাক্স যাচাই করুন।');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#C5A059]/40 bg-[#FAF6F0] text-[#161E1A] shadow-2xl">
        {/* Top Admin Header */}
        <div className="flex items-center justify-between border-b border-[#C5A059]/25 bg-[#111815] px-5 py-4 text-[#FAF6F0]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#C5A059]" aria-hidden="true" />
            <div>
              <h2 id="admin-modal-title" className="font-serif text-lg font-semibold sm:text-xl">
                অ্যাডমিন কনফিগারেশন প্যানেল
              </h2>
              <p className="text-xs text-[#FAF6F0]/70">
                সব পরিবর্তন স্বয়ংক্রিয়ভাবে ব্রাউজারে সংরক্ষিত হয়
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="অ্যাডমিন প্যানেল বন্ধ করুন"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-white/15 text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {!unlocked ? (
          /* PIN Login Screen */
          <div className="flex flex-1 items-center justify-center p-8">
            <form
              onSubmit={handleUnlock}
              className="w-full max-w-sm rounded-xl border border-[#111815]/15 bg-[#FFFDF9] p-6 shadow-sm"
            >
              <div className="flex items-center gap-2.5 text-[#111815]">
                <KeyRound className="h-5 w-5 text-[#8A6924]" aria-hidden="true" />
                <h3 className="font-serif text-xl font-semibold">অ্যাডমিন পিন দিন</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#525B56]">
                মেনু, ডেলিভারি চার্জ ও মেটা পিক্সেল কনফিগার করতে পিন দিন (ডিফল্ট পিন: 1234)।
              </p>

              <label
                htmlFor="admin-pin-input"
                className="mt-5 block text-xs font-semibold text-[#111815]"
              >
                অ্যাডমিন পিন কোড
              </label>
              <input
                id="admin-pin-input"
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="পিন লিখুন (যেমন: 1234)"
                autoFocus
                className="mt-1.5 block w-full min-h-[44px] rounded-md border border-[#111815]/25 bg-white px-3.5 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
              />
              {pinError && <p className="mt-2 text-xs text-red-700">{pinError}</p>}

              <button
                type="submit"
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-[#111815] px-5 py-2.5 text-sm font-semibold text-[#C5A059] hover:bg-[#1E2B25] cursor-pointer"
              >
                প্যানেল আনলক করুন
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked 5-Tab Dashboard */
          <>
            {/* Firebase Cloud Sync Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111815]/10 bg-[#FFFDF9] px-4 py-2.5 text-xs sm:px-6">
              <div className="flex items-center gap-2 text-[#111815]">
                <span className="font-semibold">Firebase (albarakah3526):</span>
                {adminUserEmail ? (
                  <span className="font-medium text-emerald-800">
                    যুক্ত ({adminUserEmail})
                  </span>
                ) : (
                  <span className="text-[#525B56]">লোকাল মোড (লাইভ সিঙ্কের জন্য সাইন-ইন করুন)</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {adminUserEmail ? (
                  <>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={async () => {
                        setAuthBusy(true);
                        try {
                          const res = await onSeedFirestore();
                          flashBanner(res.message);
                        } finally {
                          setAuthBusy(false);
                        }
                      }}
                      className="rounded border border-[#C5A059] bg-[#C5A059]/15 px-2.5 py-1 text-xs font-semibold text-[#111815] hover:bg-[#C5A059]/30 cursor-pointer disabled:opacity-50"
                    >
                      ডিফল্ট ডেটা সিড করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSignOutAdmin()}
                      className="rounded border border-[#111815]/20 px-2.5 py-1 text-xs font-medium text-[#525B56] hover:text-[#111815] cursor-pointer"
                    >
                      সাইন আউট
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={async () => {
                      setAuthBusy(true);
                      try {
                        await onSignInAdmin();
                        flashBanner('Google অ্যাডমিন অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে।');
                      } catch {
                        flashBanner('সাইন-ইন সম্পন্ন হয়নি।');
                      } finally {
                        setAuthBusy(false);
                      }
                    }}
                    className="rounded bg-[#111815] px-3 py-1.5 text-xs font-semibold text-[#C5A059] hover:bg-[#222F28] cursor-pointer disabled:opacity-50"
                  >
                    Google অ্যাডমিন সাইন-ইন
                  </button>
                )}
              </div>
            </div>

            {/* Tab Bar */}
            <div className="border-b border-[#111815]/12 bg-[#EFE8DA] px-4 py-2.5 sm:px-6">
              <div
                role="tablist"
                aria-label="অ্যাডমিন সেটিংস ট্যাব"
                className="flex flex-wrap gap-1.5"
              >
                {ADMIN_TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#111815] text-[#C5A059]'
                          : 'bg-[#FAF6F0]/70 text-[#525B56] hover:text-[#111815]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {saveBanner && (
                <p className="mt-2 text-xs font-semibold text-emerald-800">{saveBanner}</p>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* TAB 1: General Settings (ALL General Info) */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Group 1: Brand & Contact */}
                  <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
                    <h3 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
                      ব্র্যান্ড ও যোগাযোগের সাধারণ তথ্য
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="admin-brand-name" className="block text-xs font-semibold text-[#111815]">
                          রেস্তোরাঁর নাম
                        </label>
                        <input
                          id="admin-brand-name"
                          type="text"
                          value={config.restaurantInfo.brandName}
                          onChange={(e) => updateRestaurantInfo('brandName', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-tagline" className="block text-xs font-semibold text-[#111815]">
                          ট্যাগলাইন / ঐতিহ্য পরিচয়
                        </label>
                        <input
                          id="admin-tagline"
                          type="text"
                          value={config.restaurantInfo.heritageOrigin}
                          onChange={(e) => updateRestaurantInfo('heritageOrigin', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-whatsapp" className="block text-xs font-semibold text-[#111815]">
                          হোয়াটসঅ্যাপ অর্ডার নম্বর (880 সহ)
                        </label>
                        <input
                          id="admin-whatsapp"
                          type="text"
                          value={config.restaurantInfo.whatsappNumber}
                          onChange={(e) =>
                            updateRestaurantInfo('whatsappNumber', e.target.value)
                          }
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-phone" className="block text-xs font-semibold text-[#111815]">
                          দৃশ্যমান ফোন নম্বর
                        </label>
                        <input
                          id="admin-phone"
                          type="text"
                          value={config.restaurantInfo.displayPhone}
                          onChange={(e) => updateRestaurantInfo('displayPhone', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-email" className="block text-xs font-semibold text-[#111815]">
                          ইমেইল ঠিকানা
                        </label>
                        <input
                          id="admin-email"
                          type="email"
                          value={config.restaurantInfo.email}
                          onChange={(e) => updateRestaurantInfo('email', e.target.value)}
                          placeholder="orders@example.com"
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-logo" className="block text-xs font-semibold text-[#111815]">
                          লোগো ইমেজ URL (ঐচ্ছিক)
                        </label>
                        <input
                          id="admin-logo"
                          type="url"
                          value={config.restaurantInfo.logoUrl}
                          onChange={(e) => updateRestaurantInfo('logoUrl', e.target.value)}
                          placeholder="https://..."
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="admin-address" className="block text-xs font-semibold text-[#111815]">
                          দোকানের পূর্ণ ঠিকানা
                        </label>
                        <input
                          id="admin-address"
                          type="text"
                          value={config.restaurantInfo.address}
                          onChange={(e) => updateRestaurantInfo('address', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Hours & Live Status */}
                  <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
                    <h3 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
                      সময়সূচি ও লাইভ স্ট্যাটাস কনফিগারেশন
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="admin-status-mode" className="block text-xs font-semibold text-[#111815]">
                          রেস্তোরাঁর স্ট্যাটাস মোড
                        </label>
                        <select
                          id="admin-status-mode"
                          value={config.restaurantInfo.statusMode}
                          onChange={(e) =>
                            updateRestaurantInfo(
                              'statusMode',
                              e.target.value as StoreStatusMode
                            )
                          }
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        >
                          <option value="auto">স্বয়ংক্রিয় (সময় অনুযায়ী ওপেন / প্রি-অর্ডার)</option>
                          <option value="open">খোলা আছে (এখন অর্ডার নেওয়া হচ্ছে)</option>
                          <option value="preorder">বন্ধ / শুধু প্রি-অর্ডার চলছে</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="admin-hours-display" className="block text-xs font-semibold text-[#111815]">
                          দৃশ্যমান খোলার সময়সূচি (পেজে যেভাবে দেখাবে)
                        </label>
                        <input
                          id="admin-hours-display"
                          type="text"
                          value={config.restaurantInfo.hoursDisplay}
                          onChange={(e) => updateRestaurantInfo('hoursDisplay', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          খোলার ঘণ্টা (০–২৩)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={config.restaurantInfo.openHour}
                          onChange={(e) =>
                            updateRestaurantInfo(
                              'openHour',
                              Math.min(23, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="mt-1.5 block w-full min-h-[40px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          খোলার মিনিট (০–৫৯)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={config.restaurantInfo.openMinute}
                          onChange={(e) =>
                            updateRestaurantInfo(
                              'openMinute',
                              Math.min(59, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="mt-1.5 block w-full min-h-[40px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          বন্ধের ঘণ্টা (০–২৩)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={config.restaurantInfo.closeHour}
                          onChange={(e) =>
                            updateRestaurantInfo(
                              'closeHour',
                              Math.min(23, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="mt-1.5 block w-full min-h-[40px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          বন্ধের মিনিট (০–৫৯)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={config.restaurantInfo.closeMinute}
                          onChange={(e) =>
                            updateRestaurantInfo(
                              'closeMinute',
                              Math.min(59, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="mt-1.5 block w-full min-h-[40px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Map & Social Links */}
                  <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
                    <h3 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
                      গুগল ম্যাপ ও সোশ্যাল মিডিয়া লিংক
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          ম্যাপ স্থানাঙ্ক (Coordinates লেখা)
                        </label>
                        <input
                          type="text"
                          value={config.restaurantInfo.mapsCoordinates}
                          onChange={(e) =>
                            updateRestaurantInfo('mapsCoordinates', e.target.value)
                          }
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          গুগল ম্যাপ ডিরেকশন লিংক (URL)
                        </label>
                        <input
                          type="url"
                          value={config.restaurantInfo.mapsUrl}
                          onChange={(e) => updateRestaurantInfo('mapsUrl', e.target.value)}
                          placeholder="https://maps.google.com/..."
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          ফেসবুক পেজ লিংক (URL)
                        </label>
                        <input
                          type="url"
                          value={config.restaurantInfo.facebookUrl}
                          onChange={(e) => updateRestaurantInfo('facebookUrl', e.target.value)}
                          placeholder="https://facebook.com/..."
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          ইনস্টাগ্রাম লিংক (URL)
                        </label>
                        <input
                          type="url"
                          value={config.restaurantInfo.instagramUrl}
                          onChange={(e) => updateRestaurantInfo('instagramUrl', e.target.value)}
                          placeholder="https://instagram.com/..."
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 4: Security & WhatsApp Redirect */}
                  <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
                    <h3 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
                      নিরাপত্তা ও অর্ডার সেটিংস
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-center">
                      <div>
                        <label className="block text-xs font-semibold text-[#111815]">
                          অ্যাডমিন পিন পরিবর্তন করুন
                        </label>
                        <input
                          type="text"
                          value={config.restaurantInfo.adminPin}
                          onChange={(e) => updateRestaurantInfo('adminPin', e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#111815] cursor-pointer sm:pt-5">
                        <input
                          type="checkbox"
                          checked={config.restaurantInfo.whatsappRedirectEnabled}
                          onChange={(e) =>
                            updateRestaurantInfo('whatsappRedirectEnabled', e.target.checked)
                          }
                        />
                        <span>
                          অর্ডার সাবমিট করার পর স্বয়ংক্রিয়ভাবে WhatsApp রিসিট ওপেন করুন
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1B: Full Page Copy Editor */}
              {activeTab === 'content' && (
                <AdminPageCopyEditor
                  siteContent={config.siteContent}
                  menuItems={config.menuItems}
                  onChange={(nextSiteContent) =>
                    onUpdateConfig({
                      ...config,
                      siteContent: nextSiteContent,
                    })
                  }
                  onResetDefaultCopy={() => {
                    onUpdateConfig({
                      ...config,
                      siteContent: DEFAULT_SITE_CONTENT,
                    });
                    flashBanner('পেজের সব লেখা ডিফল্টে ফিরিয়ে আনা হয়েছে।');
                  }}
                />
              )}

              {/* TAB 2: Menu Manager */}
              {activeTab === 'menu' && (
                <div className="space-y-6">
                  {/* Add New Dish Form */}
                  <form
                    onSubmit={handleAddMenuItem}
                    className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-4 space-y-3"
                  >
                    <h3 className="font-serif text-base font-semibold text-[#111815]">
                      নতুন খাবার যোগ করুন
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <input
                        type="text"
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        placeholder="খাবারের নাম"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm sm:col-span-2"
                      />
                      <select
                        value={newDishCategory}
                        onChange={(e) => setNewDishCategory(e.target.value as MenuCategory)}
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={newDishPrice}
                        onChange={(e) => setNewDishPrice(e.target.value)}
                        placeholder="দাম (৳)"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm tabular-nums"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        value={newDishServing}
                        onChange={(e) => setNewDishServing(e.target.value)}
                        placeholder="পরিমাণ (যেমন: ১ জনের জন্য)"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm"
                      />
                      <input
                        type="text"
                        value={newDishImage}
                        onChange={(e) => setNewDishImage(e.target.value)}
                        placeholder="ছবির পাথ বা URL"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm sm:col-span-2"
                      />
                    </div>
                    <input
                      type="text"
                      value={newDishDesc}
                      onChange={(e) => setNewDishDesc(e.target.value)}
                      placeholder="খাবারের সংক্ষিপ্ত বিবরণ"
                      className="w-full min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={newDishPreOrder}
                            onChange={(e) => setNewDishPreOrder(e.target.checked)}
                          />
                          <span>শুধুমাত্র প্রি-অর্ডার (Pre-order Only)</span>
                        </label>
                        {newDishPreOrder && (
                          <input
                            type="text"
                            value={newDishNotice}
                            onChange={(e) => setNewDishNotice(e.target.value)}
                            className="min-h-[36px] rounded border border-[#111815]/20 bg-white px-2.5 text-xs"
                          />
                        )}
                      </div>
                      <button
                        type="submit"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-[#111815] px-4 py-2 text-xs font-semibold text-[#C5A059] hover:bg-[#22302A] cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>মেনুতে যোগ করুন</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing Menu List */}
                  <div className="space-y-3">
                    {config.menuItems.map((item) => {
                      const isEditing = editingMenuId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-serif text-base font-semibold text-[#111815]">
                                {item.name}
                              </p>
                              <p className="text-xs text-[#525B56]">
                                {item.category} · {item.servingSize}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-1 text-xs">
                                <span>৳</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateMenuItem(item.id, {
                                      price: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  aria-label={`${item.name} দাম`}
                                  className="w-20 rounded border border-[#111815]/20 bg-white px-2 py-1 text-xs font-semibold tabular-nums"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingMenuId(isEditing ? null : item.id)
                                }
                                className={`inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                                  isEditing
                                    ? 'bg-[#111815] text-[#C5A059]'
                                    : 'border border-[#111815]/20 bg-white text-[#111815] hover:bg-[#EFE8DA]'
                                }`}
                              >
                                <Pencil className="h-3 w-3" aria-hidden="true" />
                                <span>{isEditing ? 'বন্ধ করুন' : 'এডিট'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMenuItem(item.id, { available: !item.available })
                                }
                                className={`rounded px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                                  item.available
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-red-100 text-red-900'
                                }`}
                              >
                                {item.available ? 'স্টক আছে' : 'স্টক শেষ'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMenuItem(item.id, {
                                    preOrderOnly: !item.preOrderOnly,
                                    advanceNotice:
                                      item.advanceNotice || 'কমপক্ষে ৪ ঘণ্টা আগে অর্ডার করতে হবে',
                                  })
                                }
                                className={`rounded px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                                  item.preOrderOnly
                                    ? 'bg-[#C5A059]/25 text-[#7A5B1C]'
                                    : 'bg-[#EFE8DA] text-[#525B56]'
                                }`}
                              >
                                {item.preOrderOnly ? 'প্রি-অর্ডার' : 'সাধারণ'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                aria-label={`${item.name} মুছুন`}
                                className="rounded p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="border-t border-[#111815]/10 pt-3 space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-semibold text-[#525B56]">
                                    খাবারের নাম
                                  </label>
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) =>
                                      handleUpdateMenuItem(item.id, { name: e.target.value })
                                    }
                                    aria-label="খাবারের নাম এডিট"
                                    className="mt-1 block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525B56]">
                                    ক্যাটাগরি
                                  </label>
                                  <select
                                    value={item.category}
                                    onChange={(e) =>
                                      handleUpdateMenuItem(item.id, {
                                        category: e.target.value as MenuCategory,
                                      })
                                    }
                                    className="mt-1 block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                                  >
                                    {CATEGORY_OPTIONS.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525B56]">
                                    পরিবেশনের পরিমাণ
                                  </label>
                                  <input
                                    type="text"
                                    value={item.servingSize}
                                    onChange={(e) =>
                                      handleUpdateMenuItem(item.id, {
                                        servingSize: e.target.value,
                                      })
                                    }
                                    className="mt-1 block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-semibold text-[#525B56]">
                                    ছবির পাথ বা URL
                                  </label>
                                  <input
                                    type="text"
                                    value={item.image}
                                    onChange={(e) =>
                                      handleUpdateMenuItem(item.id, { image: e.target.value })
                                    }
                                    className="mt-1 block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#525B56]">
                                  খাবারের বিবরণ
                                </label>
                                <textarea
                                  rows={2}
                                  value={item.description}
                                  onChange={(e) =>
                                    handleUpdateMenuItem(item.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  className="mt-1 block w-full rounded border border-[#111815]/20 bg-white px-2.5 py-1.5 text-sm"
                                />
                              </div>
                              {item.preOrderOnly && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525B56]">
                                    প্রি-অর্ডার অগ্রিম নোটিশ
                                  </label>
                                  <input
                                    type="text"
                                    value={item.advanceNotice ?? ''}
                                    onChange={(e) =>
                                      handleUpdateMenuItem(item.id, {
                                        advanceNotice: e.target.value,
                                      })
                                    }
                                    className="mt-1 block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-2.5 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Delivery Zones */}
              {activeTab === 'zones' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleAddZone}
                    className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-4 space-y-3"
                  >
                    <h3 className="font-serif text-base font-semibold text-[#111815]">
                      নতুন ডেলিভারি এলাকা যোগ করুন
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        placeholder="এলাকার নাম (যেমন: দুলালপুর)"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm"
                      />
                      <input
                        type="number"
                        value={newZoneFee}
                        disabled={newZoneOutOfArea}
                        onChange={(e) => setNewZoneFee(e.target.value)}
                        placeholder="চার্জ (৳)"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm tabular-nums disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={newZoneEta}
                        onChange={(e) => setNewZoneEta(e.target.value)}
                        placeholder="আনুমানিক সময় (যেমন: ৪০–৫০ মিনিট)"
                        className="min-h-[40px] rounded border border-[#111815]/20 bg-white px-3 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={newZoneNote}
                      onChange={(e) => setNewZoneNote(e.target.value)}
                      placeholder="ডেলিভারি নোট / বিবরণ (ঐচ্ছিক)"
                      className="w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-3 text-xs"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={newZoneOutOfArea}
                          onChange={(e) => setNewZoneOutOfArea(e.target.checked)}
                        />
                        <span>এলাকার বাইরে (শুধুমাত্র পিকআপ / প্রি-অর্ডার)</span>
                      </label>
                      <button
                        type="submit"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-[#111815] px-4 py-2 text-xs font-semibold text-[#C5A059] cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>জোন যোগ করুন</span>
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {config.deliveryZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-2.5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-1 flex-wrap items-center gap-3">
                            <input
                              type="text"
                              value={zone.name}
                              onChange={(e) =>
                                handleUpdateZone(zone.id, { name: e.target.value })
                              }
                              aria-label="এলাকার নাম"
                              className="min-h-[36px] w-44 rounded border border-[#111815]/20 bg-white px-2.5 text-sm font-semibold"
                            />
                            <label className="inline-flex items-center gap-1 text-xs">
                              <span>চার্জ ৳</span>
                              <input
                                type="number"
                                value={zone.fee}
                                disabled={Boolean(zone.isOutOfArea)}
                                onChange={(e) =>
                                  handleUpdateZone(zone.id, {
                                    fee: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-20 rounded border border-[#111815]/20 bg-white px-2 py-1 text-xs tabular-nums disabled:opacity-50"
                              />
                            </label>
                            <input
                              type="text"
                              value={zone.eta}
                              onChange={(e) =>
                                handleUpdateZone(zone.id, { eta: e.target.value })
                              }
                              aria-label="আনুমানিক সময়"
                              className="min-h-[36px] w-36 rounded border border-[#111815]/20 bg-white px-2.5 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateZone(zone.id, {
                                  isOutOfArea: !zone.isOutOfArea,
                                  fee: !zone.isOutOfArea ? 0 : zone.fee || 50,
                                })
                              }
                              className={`rounded px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                                zone.isOutOfArea
                                  ? 'bg-[#C5A059]/25 text-[#7A5B1C]'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {zone.isOutOfArea ? 'পিকআপ মোড' : 'হোম ডেলিভারি'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteZone(zone.id)}
                              aria-label={`${zone.name} জোন মুছুন`}
                              className="rounded p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={zone.note ?? ''}
                          onChange={(e) =>
                            handleUpdateZone(zone.id, { note: e.target.value })
                          }
                          placeholder="এই এলাকার জন্য বিশেষ নোট বা বিবরণ লিখুন"
                          aria-label={`${zone.name} নোট`}
                          className="w-full min-h-[34px] rounded border border-[#111815]/15 bg-white px-2.5 text-xs text-[#525B56]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Meta Ads & CAPI Tracking */}
              {activeTab === 'meta' && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111815]/10 pb-4">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-[#111815]">
                          মেটা পিক্সেল ও সার্ভার-সাইড CAPI কনফিগারেশন
                        </h3>
                        <p className="text-xs text-[#525B56]">
                          ব্রাউজার পিক্সেল ও সার্ভার-সাইড CAPI উভয় ক্ষেত্রেই একক event_id দিয়ে
                          ডুপ্লিকেশন রোধ করা হয়।
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={config.metaConfig.enabled}
                            onChange={(e) => updateMetaConfig('enabled', e.target.checked)}
                          />
                          <span>Meta Pixel চালু করুন</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={Boolean(config.metaConfig.capiEnabled)}
                            onChange={(e) => updateMetaConfig('capiEnabled', e.target.checked)}
                          />
                          <span>Server-Side CAPI (Cloud Function)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={config.metaConfig.debugConsole}
                            onChange={(e) =>
                              updateMetaConfig('debugConsole', e.target.checked)
                            }
                          />
                          <span>লাইভ কনসোল ডিবাগার</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="meta-pixel-id"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          Meta Pixel ID
                        </label>
                        <input
                          id="meta-pixel-id"
                          type="text"
                          value={config.metaConfig.pixelId}
                          onChange={(e) => updateMetaConfig('pixelId', e.target.value)}
                          placeholder="যেমন: 123456789012345"
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm tabular-nums"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="meta-test-code"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          Meta Test Event Code
                        </label>
                        <input
                          id="meta-test-code"
                          type="text"
                          value={config.metaConfig.testEventCode}
                          onChange={(e) => updateMetaConfig('testEventCode', e.target.value)}
                          placeholder="যেমন: TEST12345"
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="meta-capi-endpoint"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          Server-Side CAPI Endpoint URL (Stape / Cloudflare Worker / Webhook)
                        </label>
                        <input
                          id="meta-capi-endpoint"
                          type="url"
                          value={config.metaConfig.capiEndpointUrl}
                          onChange={(e) => updateMetaConfig('capiEndpointUrl', e.target.value)}
                          placeholder="https://sst.yourdomain.com/capi-webhook"
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="meta-capi-token"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          Conversions API (CAPI) Access Token (ঐচ্ছিক)
                        </label>
                        <input
                          id="meta-capi-token"
                          type="password"
                          value={config.metaConfig.capiAccessToken}
                          onChange={(e) =>
                            updateMetaConfig('capiAccessToken', e.target.value)
                          }
                          placeholder="EAAxxxxxxxx..."
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={testSending}
                          onClick={handleSendTestEvent}
                          data-testid="send-test-event-button"
                          className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-[#111815] px-4 py-2 text-xs font-semibold text-[#C5A059] hover:bg-[#1E2B25] cursor-pointer disabled:opacity-60"
                        >
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{testSending ? 'পাঠানো হচ্ছে...' : 'টেস্ট ইভেন্ট পাঠান (Send Test Event)'}</span>
                        </button>

                        {adminUserEmail && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onSaveSecretsToFirestore(
                                config.metaConfig.capiAccessToken,
                                config.metaConfig.capiEndpointUrl
                              );
                              flashBanner('CAPI Access Token নিরাপদে Firestore settings/secrets-এ সংরক্ষিত হয়েছে।');
                            }}
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-[#111815]/25 bg-white px-4 py-2 text-xs font-semibold text-[#111815] hover:bg-[#EFE8DA] cursor-pointer"
                          >
                            <span>টোকেন সেভ করুন (Cloud Function)</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => MetaTracker.clearLogs()}
                        className="text-xs font-semibold text-[#525B56] underline underline-offset-4 hover:text-[#111815] cursor-pointer"
                      >
                        লগ পরিষ্কার করুন
                      </button>
                    </div>
                  </div>

                  {/* Live Event Debugger Log */}
                  <div className="rounded-lg border border-[#111815]/15 bg-[#111815] p-4 text-[#FAF6F0]">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                      <Activity className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                      <h4 className="text-sm font-semibold">
                        লাইভ ইভেন্ট ডিবাগার লগ ({toBengaliDigits(metaLogs.length)})
                      </h4>
                    </div>

                    {metaLogs.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#FAF6F0]/60">
                        এখনো কোনো ট্র্যাকিং ইভেন্ট রেকর্ড হয়নি। ট্র্যাকিং চালু করে টেস্ট ইভেন্ট পাঠান।
                      </p>
                    ) : (
                      <div
                        data-testid="meta-event-log-list"
                        className="mt-3 max-h-60 space-y-2 overflow-y-auto font-mono text-xs"
                      >
                        {metaLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-[#18221D] px-3 py-2"
                          >
                            <div>
                              <span className="font-bold text-[#C5A059]">{log.eventName}</span>
                              <span className="ml-2 text-[#FAF6F0]/70">{log.eventId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span>Pixel: {log.pixelStatus}</span>
                              <span>·</span>
                              <span>CAPI: {log.capiStatus}</span>
                              <span>·</span>
                              <span className="text-[#FAF6F0]/60">{log.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Orders & Backup */}
              {activeTab === 'orders' && (() => {
                const displayOrders = firestoreOrders.length > 0 ? firestoreOrders : orders;
                return (
                <div className="space-y-6">
                  {/* Order History */}
                  <div className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold text-[#111815]">
                        সাম্প্রতিক অর্ডারসমূহ ({toBengaliDigits(displayOrders.length)})
                      </h3>
                      <span className="text-xs text-[#525B56]">
                        {firestoreOrders.length > 0 ? 'Firestore লাইভ অর্ডার' : 'লোকাল ব্রাউজার অর্ডার'}
                      </span>
                    </div>
                    {displayOrders.length === 0 ? (
                      <p className="mt-3 text-sm text-[#525B56]">
                        এখনো কোনো অর্ডার পাওয়া যায়নি।
                      </p>
                    ) : (
                      <div
                        data-testid="admin-orders-list"
                        className="mt-4 space-y-3 max-h-72 overflow-y-auto"
                      >
                        {displayOrders.map((ord) => (
                          <div
                            key={ord.orderId}
                            className="rounded-md border border-[#111815]/12 bg-[#FAF6F0] p-3.5 text-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-[#111815]">
                                {ord.orderId} — {ord.customerName} ({ord.phone})
                              </span>
                              <span className="font-bold text-[#8A6924] tabular-nums">
                                {formatBDT(ord.grandTotal)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[#525B56]">
                                এলাকা: {ord.zoneName} ·{' '}
                                {ord.orderType === 'pre-order'
                                  ? `প্রি-অর্ডার (${ord.deliveryDate || ''} ${ord.timeSlot || ''})`
                                  : 'তাৎক্ষণিক ডেলিভারি'}
                              </p>
                              <select
                                aria-label={`${ord.orderId} অর্ডারের অবস্থা`}
                                value={ord.status ?? 'pending'}
                                onChange={async (e) => {
                                  const nextStatus = e.target.value as OrderStatus;
                                  await onUpdateOrderStatus(ord.docId || ord.orderId, nextStatus);
                                  flashBanner(`${ord.orderId} এর অবস্থা "${ORDER_STATUS_LABELS[nextStatus]}" করা হয়েছে।`);
                                }}
                                className="rounded border border-[#111815]/20 bg-white px-2.5 py-1 text-xs font-semibold text-[#111815]"
                              >
                                {(['pending', 'preparing', 'out_for_delivery', 'completed'] as OrderStatus[]).map((st) => (
                                  <option key={st} value={st}>
                                    {ORDER_STATUS_LABELS[st]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Config Backup Export / Import */}
                  <div className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-5 space-y-4">
                    <h3 className="font-serif text-lg font-semibold text-[#111815]">
                      কনফিগারেশন ব্যাকআপ (JSON Export / Import)
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleCopyConfigJson}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#111815] px-4 py-2 text-xs font-semibold text-[#C5A059] cursor-pointer"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="h-4 w-4" aria-hidden="true" />
                            <span>JSON কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            <span>Copy Config JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadJson}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#111815]/25 bg-white px-4 py-2 text-xs font-semibold text-[#111815] hover:bg-[#EFE8DA] cursor-pointer"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span>JSON ডাউনলোড</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onResetDefaults();
                          flashBanner('ডিফল্ট কনফিগারেশন রিসেট করা হয়েছে।');
                        }}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        <span>ডিফল্ট রিসেট</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-[#111815]">
                        JSON পেস্ট করে ইমপোর্ট করুন
                      </label>
                      <textarea
                        rows={3}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder='{"restaurantInfo": ...}'
                        className="mt-1.5 block w-full rounded-md border border-[#111815]/20 bg-white p-2.5 font-mono text-xs"
                      />
                      {importError && (
                        <p className="mt-1 text-xs text-red-700">{importError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleImportJson}
                        className="mt-2 inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#111815]/25 bg-[#EFE8DA] px-4 py-1.5 text-xs font-semibold text-[#111815] cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>কনফিগ ইমপোর্ট করুন</span>
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
