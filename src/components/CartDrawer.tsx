import { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  type DeliverySubArea,
  type DeliveryZone,
  PREORDER_TIME_SLOTS,
  type RestaurantInfo,
} from '../data/restaurantConfig';
import { generateEventId } from '../utils/metaTracker';
import {
  buildWhatsAppOrderUrl,
  type CartItem,
  computeOrderSummary,
  formatBDT,
  formatWhatsAppOrderMessage,
  formatZoneDisplayName,
  generateOrderId,
  getEffectiveDeliveryEta,
  getEffectiveDeliveryFee,
  type OrderType,
  type SavedOrderRecord,
  toBengaliDigits,
  validateOrderForm,
} from '../utils/orderLogic';

interface CartDrawerProps {
  restaurantInfo: RestaurantInfo;
  deliveryZones: DeliveryZone[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  selectedZone: DeliveryZone;
  selectedSubArea?: DeliverySubArea | null;
  onSelectZone: (zoneId: string) => void;
  onSelectSubArea?: (subAreaId: string) => void;
  orderType: OrderType;
  onChangeOrderType: (type: OrderType) => void;
  onOrderConfirmed: (
    record: SavedOrderRecord,
    customerCity: string,
    metaEventId: string
  ) => Promise<void>;
  onOpenTrackingForOrder: (orderId: string) => void;
}

export function CartDrawer({
  restaurantInfo,
  deliveryZones,
  isOpen,
  onClose,
  onOpen,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  selectedZone,
  selectedSubArea = null,
  onSelectZone,
  onSelectSubArea,
  orderType,
  onChangeOrderType,
  onOrderConfirmed,
  onOpenTrackingForOrder,
}: CartDrawerProps) {
  const todayIso = new Date().toISOString().split('T')[0];

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(todayIso);
  const [timeSlot, setTimeSlot] = useState(PREORDER_TIME_SLOTS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptState, setReceiptState] = useState<{
    orderId: string;
    url: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const waHiddenLinkRef = useRef<HTMLAnchorElement>(null);

  const subAreas = !selectedZone.isOutOfArea ? (selectedZone.subAreas ?? []) : [];
  const zoneDisplayName = formatZoneDisplayName(selectedZone, selectedSubArea);
  const summary = computeOrderSummary(cartItems, selectedZone, orderType, selectedSubArea);

  useEffect(() => {
    const onScroll = () => setShowFloating(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const orderId = generateOrderId();
    const formInput = {
      orderId,
      customerName,
      phone,
      address,
      zone: selectedZone,
      subArea: selectedSubArea,
      orderType: summary.effectiveOrderType,
      deliveryDate,
      timeSlot,
      items: cartItems,
    };

    const validation = validateOrderForm(formInput);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const metaEventId = generateEventId();

    const message = formatWhatsAppOrderMessage(
      formInput,
      summary,
      restaurantInfo.brandName
    );
    const url = buildWhatsAppOrderUrl(
      restaurantInfo.whatsappNumber,
      formInput,
      summary,
      restaurantInfo.brandName
    );

    const record: SavedOrderRecord = {
      orderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      phone: phone.trim(),
      zoneName: zoneDisplayName,
      address:
        address.trim() ||
        (summary.isPickupOnlyZone ? 'দোকান থেকে সরাসরি পিকআপ' : ''),
      orderType: summary.effectiveOrderType,
      deliveryDate: summary.effectiveOrderType === 'pre-order' ? deliveryDate : undefined,
      timeSlot: summary.effectiveOrderType === 'pre-order' ? timeSlot : undefined,
      items: cartItems.map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        servingSize: item.servingSize,
        quantity,
        unitPrice: item.price,
      })),
      subtotal: summary.subtotal,
      deliveryFee: summary.deliveryFee,
      grandTotal: summary.grandTotal,
      metaEventId,
    };

    try {
      await onOrderConfirmed(record, zoneDisplayName, metaEventId);
      setReceiptState({ orderId, url, message });

      if (restaurantInfo.whatsappRedirectEnabled && waHiddenLinkRef.current) {
        waHiddenLinkRef.current.href = url;
        waHiddenLinkRef.current.click();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReceipt = async () => {
    if (!receiptState) return;
    try {
      await navigator.clipboard.writeText(receiptState.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {/* Compact Floating Cart Trigger when scrolled */}
      {!isOpen && summary.itemCount > 0 && showFloating && (
        <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
          <button
            type="button"
            onClick={onOpen}
            data-testid="floating-cart-button"
            aria-label={`ব্যাগ দেখুন, ${toBengaliDigits(summary.itemCount)}টি খাবার, মোট বিল ${formatBDT(summary.subtotal)}`}
            className="inline-flex min-h-[48px] items-center gap-3 rounded-full border border-[#C5A059] bg-[#111815] px-5 py-3 text-sm font-semibold text-[#FAF6F0] shadow-xl transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
            <span className="tabular-nums">
              {toBengaliDigits(summary.itemCount)}টি খাবার
            </span>
            <span aria-hidden="true" className="text-[#C5A059]">
              ·
            </span>
            <span className="font-bold text-[#C5A059] tabular-nums">
              মোট বিল: {formatBDT(summary.subtotal)}
            </span>
          </button>
        </div>
      )}

      {/* Slide-Over Cart & Checkout Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
        >
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          <aside className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[#FAF6F0] text-[#161E1A] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#111815]/12 bg-[#111815] px-6 py-4 text-[#FAF6F0]">
              <div>
                <h2 id="cart-drawer-title" className="font-serif text-xl font-semibold">
                  আপনার অর্ডার ব্যাগ
                </h2>
                <p className="text-xs text-[#C5A059] tabular-nums">
                  {toBengaliDigits(summary.itemCount)}টি খাবার নির্বাচিত হয়েছে
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="অর্ডার ব্যাগ বন্ধ করুন"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-white/15 text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <a
              ref={waHiddenLinkRef}
              href="#top"
              target="_blank"
              rel="noopener noreferrer"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            >
              হোয়াটসঅ্যাপ অর্ডার লিংক
            </a>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag
                    className="h-10 w-10 text-[#111815]/30"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-serif text-xl font-semibold text-[#111815]">
                    আপনার ব্যাগে কোনো খাবার নেই
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-[#525B56]">
                    আমাদের তামার হাঁড়ির কাচ্চি, চিনিগুঁড়া গরুর তেহারি ও কাবাব থেকে পছন্দের খাবার
                    বেছে নিন।
                  </p>
                  <a
                    href="#menu"
                    onClick={onClose}
                    className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-[#111815] px-5 py-2.5 text-xs font-semibold text-[#FAF6F0] hover:bg-[#24332C]"
                  >
                    মেনু দেখুন
                  </a>
                </div>
              ) : receiptState ? (
                <div data-testid="whatsapp-receipt-panel" className="space-y-5">
                  <div className="rounded-lg border border-[#C5A059]/60 bg-[#FFFDF9] p-5">
                    <div className="flex items-center gap-2.5 text-[#111815]">
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-[#8A6924]"
                        aria-hidden="true"
                      />
                      <h3 className="font-serif text-lg font-semibold">
                        অর্ডার রিসিট তৈরি হয়েছে ({receiptState.orderId})
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#525B56]">
                      হোয়াটসঅ্যাপ নিজে থেকে না খুললে নিচের বাটনে ক্লিক করে সরাসরি আমাদের রান্নাঘরের
                      হোয়াটসঅ্যাপে অর্ডার রিসিটটি পাঠিয়ে দিন।
                    </p>

                    <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#111815]/12 bg-[#111815] p-4 font-mono text-xs leading-relaxed text-[#FAF6F0]">
                      {receiptState.message}
                    </pre>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <a
                        href={receiptState.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="whatsapp-direct-link"
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-[#111815] px-4 py-2.5 text-sm font-semibold text-[#C5A059] hover:bg-[#222F28]"
                      >
                        <span>হোয়াটসঅ্যাপে পাঠান</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>

                      <button
                        type="button"
                        onClick={() => onOpenTrackingForOrder(receiptState.orderId)}
                        data-testid="track-confirmed-order-button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-[#C5A059] bg-[#C5A059]/15 px-4 py-2 text-xs font-semibold text-[#111815] hover:bg-[#C5A059]/30 cursor-pointer"
                      >
                        অর্ডার ট্র্যাক করুন
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyReceipt}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#111815]/25 bg-white px-4 py-2 text-xs font-semibold text-[#111815] hover:bg-[#F3EDE2] cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                            <span>কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            <span>রিসিট কপি করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReceiptState(null)}
                    className="text-xs font-semibold text-[#525B56] underline underline-offset-4 hover:text-[#111815] cursor-pointer"
                  >
                    তথ্য পরিবর্তন করতে ফিরে যান
                  </button>
                </div>
              ) : (
                <form
                  id="checkout-form"
                  onSubmit={handleConfirmOrder}
                  noValidate
                  className="space-y-6"
                >
                  {/* Item List */}
                  <div>
                    <h3 className="text-xs font-semibold tracking-wider text-[#525B56]">
                      নির্বাচিত খাবারসমূহ
                    </h3>
                    <ul className="mt-3 divide-y divide-[#111815]/10 border-y border-[#111815]/10">
                      {cartItems.map(({ item, quantity }) => (
                        <li
                          key={item.id}
                          data-testid="cart-item-row"
                          className="flex items-start justify-between gap-3 py-3.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-base font-semibold text-[#111815]">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-[#525B56]">
                              {item.servingSize} ·{' '}
                              <span className="tabular-nums">{formatBDT(item.price)}</span>
                            </p>
                            {item.preOrderOnly && (
                              <p className="mt-1 text-[11px] font-semibold text-[#8A6924]">
                                অগ্রিম অর্ডার ({item.advanceNotice})
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex items-center rounded border border-[#111815]/20 bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptState(null);
                                  onUpdateQuantity(item.id, -1);
                                }}
                                aria-label={`${item.name} এর পরিমাণ কমান`}
                                className="flex min-h-[38px] min-w-[38px] items-center justify-center text-[#111815] hover:bg-[#F3EDE2] cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span className="min-w-[26px] text-center text-xs font-bold tabular-nums">
                                {toBengaliDigits(quantity)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptState(null);
                                  onUpdateQuantity(item.id, 1);
                                }}
                                aria-label={`${item.name} এর পরিমাণ বাড়ান`}
                                className="flex min-h-[38px] min-w-[38px] items-center justify-center text-[#111815] hover:bg-[#F3EDE2] cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setReceiptState(null);
                                onRemoveItem(item.id);
                              }}
                              aria-label={`${item.name} বাদ দিন`}
                              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded text-[#525B56] hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Order Type Toggle */}
                  <div>
                    <span className="block text-xs font-semibold tracking-wider text-[#525B56]">
                      অর্ডারের ধরন নির্বাচন করুন
                    </span>

                    {summary.hasPreOrderItem && (
                      <div
                        data-testid="preorder-lock-notice"
                        className="mt-2 flex items-start gap-2 rounded-md border border-[#C5A059]/60 bg-[#C5A059]/15 px-3 py-2 text-xs text-[#7A5B1C]"
                      >
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                          আপনার ব্যাগে <strong>অগ্রিম অর্ডার (প্রি-অর্ডার)</strong> খাবার থাকায়
                          নির্দিষ্ট তারিখ ও সময় নির্বাচন করা বাধ্যতামূলক।
                        </span>
                      </div>
                    )}

                    <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg border border-[#111815]/15 bg-[#EFE8DA] p-1">
                      <button
                        type="button"
                        disabled={summary.hasPreOrderItem}
                        onClick={() => onChangeOrderType('instant')}
                        className={`min-h-[42px] rounded-md px-2.5 py-2 text-xs font-semibold transition-colors ${
                          summary.effectiveOrderType === 'instant'
                            ? 'bg-[#111815] text-[#FAF6F0]'
                            : 'text-[#525B56] hover:text-[#111815]'
                        } ${summary.hasPreOrderItem ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        তাৎক্ষণিক হোম ডেলিভারি
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeOrderType('pre-order')}
                        className={`min-h-[42px] rounded-md px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          summary.effectiveOrderType === 'pre-order'
                            ? 'bg-[#111815] text-[#C5A059]'
                            : 'text-[#525B56] hover:text-[#111815]'
                        }`}
                      >
                        প্রি-অর্ডার (নির্দিষ্ট সময়ে)
                      </button>
                    </div>
                  </div>

                  {/* Pre-Order Date & Time Slot */}
                  {summary.effectiveOrderType === 'pre-order' && (
                    <div
                      data-testid="preorder-schedule-fields"
                      className="grid grid-cols-1 gap-3.5 rounded-lg border border-[#C5A059]/45 bg-[#FFFDF9] p-4 sm:grid-cols-2"
                    >
                      <div>
                        <label
                          htmlFor="preorder-date"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          তারিখ নির্বাচন করুন
                        </label>
                        <input
                          id="preorder-date"
                          type="date"
                          min={todayIso}
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                        />
                        {errors.deliveryDate && (
                          <p className="mt-1 text-xs text-red-700">{errors.deliveryDate}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="preorder-slot"
                          className="block text-xs font-semibold text-[#111815]"
                        >
                          ডেলিভারির সময়
                        </label>
                        <select
                          id="preorder-slot"
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="mt-1.5 block w-full min-h-[42px] rounded-md border border-[#111815]/20 bg-white px-2.5 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                        >
                          {PREORDER_TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        {errors.timeSlot && (
                          <p className="mt-1 text-xs text-red-700">{errors.timeSlot}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-semibold tracking-wider text-[#525B56]">
                      ডেলিভারি ও যোগাযোগের তথ্য
                    </h3>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="checkout-name"
                          className="block text-xs font-medium text-[#111815]"
                        >
                          আপনার নাম
                        </label>
                        <input
                          id="checkout-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="আপনার পুরো নাম"
                          className="mt-1 block w-full min-h-[44px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                        />
                        {errors.customerName && (
                          <p className="mt-1 text-xs text-red-700">{errors.customerName}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="checkout-phone"
                          className="block text-xs font-medium text-[#111815]"
                        >
                          মোবাইল নম্বর
                        </label>
                        <input
                          id="checkout-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01711-000000"
                          className="mt-1 block w-full min-h-[44px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-xs text-red-700">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-zone"
                        className="block text-xs font-medium text-[#111815]"
                      >
                        ডেলিভারি এলাকা
                      </label>
                      <select
                        id="checkout-zone"
                        value={selectedZone.id}
                        onChange={(e) => onSelectZone(e.target.value)}
                        className="mt-1 block w-full min-h-[44px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                      >
                        {deliveryZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                            {zone.isOutOfArea
                              ? ' — পিকআপ / প্রি-অর্ডার (৳ ০)'
                              : ` — ${formatBDT(zone.fee)} (${zone.eta})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {subAreas.length > 0 && onSelectSubArea && (
                      <div>
                        <label
                          htmlFor="checkout-subarea"
                          className="block text-xs font-medium text-[#111815]"
                        >
                          উপ-এলাকা / মহল্লা
                        </label>
                        <select
                          id="checkout-subarea"
                          data-testid="checkout-subarea-select"
                          value={selectedSubArea?.id ?? subAreas[0].id}
                          onChange={(e) => onSelectSubArea(e.target.value)}
                          className="mt-1 block w-full min-h-[44px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                        >
                          {subAreas.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} — {formatBDT(getEffectiveDeliveryFee(selectedZone, sub))} (
                              {getEffectiveDeliveryEta(selectedZone, sub)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="checkout-address"
                        className="block text-xs font-medium text-[#111815]"
                      >
                        {summary.isPickupOnlyZone
                          ? 'পিকআপ সংক্রান্ত কোনো নির্দেশনা (ঐচ্ছিক)'
                          : 'পূর্ণ ঠিকানা (গ্রাম/রোড/বাড়ির নাম)'}
                      </label>
                      <textarea
                        id="checkout-address"
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={
                          summary.isPickupOnlyZone
                            ? 'কখন পিকআপ করবেন তা লিখতে পারেন'
                            : 'যেমন: বাড়ি ১৪, কলেজ রোড, বড় মসজিদের পাশে'
                        }
                        className="mt-1 block w-full rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
                      />
                      {errors.address && (
                        <p className="mt-1 text-xs text-red-700">{errors.address}</p>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Totals & WhatsApp Button */}
            {cartItems.length > 0 && !receiptState && (
              <div className="border-t border-[#111815]/15 bg-[#FFFDF9] px-6 py-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-[#525B56]">
                    <span>খাবারের দাম</span>
                    <span
                      data-testid="cart-subtotal"
                      className="font-medium text-[#111815] tabular-nums"
                    >
                      {formatBDT(summary.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#525B56]">
                    <span>
                      {summary.isPickupOnlyZone
                        ? 'ডেলিভারি চার্জ (পিকআপ)'
                        : `ডেলিভারি চার্জ (${zoneDisplayName})`}
                    </span>
                    <span
                      data-testid="cart-delivery-fee"
                      className="font-medium text-[#111815] tabular-nums"
                    >
                      {formatBDT(summary.deliveryFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#111815]/12 pt-2 text-base font-bold text-[#111815]">
                    <span>সর্বমোট বিল</span>
                    <span data-testid="cart-grand-total" className="text-lg tabular-nums">
                      {formatBDT(summary.grandTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-[#111815] px-5 py-3 text-sm font-semibold text-[#C5A059] transition-colors hover:bg-[#1E2B25] cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {submitting
                      ? 'অর্ডার সংরক্ষণ করা হচ্ছে...'
                      : restaurantInfo.whatsappRedirectEnabled
                        ? 'অর্ডার কনফার্ম ও হোয়াটসঅ্যাপে পাঠান'
                        : 'অর্ডার কনফার্ম করুন'}
                  </span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
