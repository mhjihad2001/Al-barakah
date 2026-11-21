import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Clock,
  PackageCheck,
  Search,
  Truck,
  X,
} from 'lucide-react';
import {
  lookupOrderTracking,
  type OrderTrackingRecord,
  subscribeToOrderTracking,
} from '../utils/firestoreService';
import {
  formatBDT,
  normalizeTrackingOrderId,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type SavedOrderRecord,
  toBengaliDigits,
} from '../utils/orderLogic';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  localOrders: SavedOrderRecord[];
}

const STATUS_STEPS: Array<{
  key: OrderStatus;
  label: string;
  desc: string;
  icon: typeof Clock;
}> = [
  {
    key: 'pending',
    label: ORDER_STATUS_LABELS.pending,
    desc: 'আপনার অর্ডারটি রান্নাঘরে পৌঁছেছে এবং যাচাই করা হচ্ছে।',
    icon: Clock,
  },
  {
    key: 'preparing',
    label: ORDER_STATUS_LABELS.preparing,
    desc: 'বাবুর্চি গরম ও তাজা খাবার প্রস্তুত করছেন।',
    icon: ChefHat,
  },
  {
    key: 'out_for_delivery',
    label: ORDER_STATUS_LABELS.out_for_delivery,
    desc: 'রাইডার হট-বক্সে খাবার নিয়ে আপনার ঠিকানার পথে রওনা হয়েছেন।',
    icon: Truck,
  },
  {
    key: 'completed',
    label: ORDER_STATUS_LABELS.completed,
    desc: 'খাবার সফলভাবে পৌঁছে দেওয়া হয়েছে। ধন্যবাদ!',
  icon: PackageCheck,
  },
];

const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'preparing',
  'out_for_delivery',
  'completed',
];

export function OrderTrackingModal({
  isOpen,
  onClose,
  initialOrderId,
  localOrders,
}: OrderTrackingModalProps) {
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<OrderTrackingRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OrderTrackingRecord | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialOrderId) {
      setQueryInput(initialOrderId);
      void runLookup(initialOrderId);
    }
  }, [isOpen, initialOrderId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !selectedRecord || selectedRecord.source !== 'firestore') return;
    const unsub = subscribeToOrderTracking(selectedRecord.docId, (live) => {
      if (live) {
        setSelectedRecord(live);
        setResults((prev) =>
          prev.map((entry) => (entry.docId === live.docId ? live : entry))
        );
      }
    });
    return () => unsub();
  }, [isOpen, selectedRecord?.docId, selectedRecord?.source]);

  const runLookup = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setErrorMsg('অনুগ্রহ করে আপনার অর্ডার আইডি অথবা মোবাইল নম্বর লিখুন।');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const remoteMatches = await lookupOrderTracking(trimmed);
      if (remoteMatches.length > 0) {
        setResults(remoteMatches);
        setSelectedRecord(remoteMatches[0]);
        setLoading(false);
        return;
      }
    } catch {
      // Fall back to local browser orders cleanly if Firestore read fails
    }

    const cleanId = normalizeTrackingOrderId(trimmed);
    const digitsOnly = trimmed.replace(/[^\d০-৯]/g, '');
    const localMatches: OrderTrackingRecord[] = localOrders
      .filter((ord) => {
        const ordDocId = normalizeTrackingOrderId(ord.orderId);
        const ordPhoneDigits = ord.phone.replace(/[^\d০-৯]/g, '');
        return (
          (cleanId && ordDocId === cleanId) ||
          (digitsOnly.length >= 8 && ordPhoneDigits.endsWith(digitsOnly.slice(-8)))
        );
      })
      .map((ord) => ({
        docId: normalizeTrackingOrderId(ord.orderId),
        orderId: ord.orderId,
        status: ord.status ?? 'pending',
        orderType: ord.orderType === 'pre-order' ? 'preorder' : 'instant',
        deliveryZone: ord.zoneName,
        preorderDate: ord.deliveryDate ?? '',
        preorderTimeSlot: ord.timeSlot ?? '',
        itemCount: ord.items.reduce((sum, i) => sum + i.quantity, 0),
        grandTotal: ord.grandTotal,
        createdAtIso: ord.createdAt,
        source: 'local',
      }));

    if (localMatches.length > 0) {
      setResults(localMatches);
      setSelectedRecord(localMatches[0]);
    } else {
      setResults([]);
      setSelectedRecord(null);
      setErrorMsg('এই অর্ডার আইডি বা মোবাইল নম্বরে কোনো অর্ডার পাওয়া যায়নি।');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runLookup(queryInput);
  };

  if (!isOpen) return null;

  const activeStepIndex = selectedRecord
    ? Math.max(0, STATUS_ORDER.indexOf(selectedRecord.status))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-tracking-title"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        aria-hidden="true"
      />

      <div
        data-testid="order-tracking-modal"
        className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#C5A059]/40 bg-[#FAF6F0] text-[#161E1A] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C5A059]/25 bg-[#111815] px-5 py-4 text-[#FAF6F0]">
          <div>
            <h2 id="order-tracking-title" className="font-serif text-lg font-semibold sm:text-xl">
              অর্ডার ট্র্যাক করুন (লাইভ স্ট্যাটাস)
            </h2>
            <p className="text-xs text-[#C5A059]">
              অর্ডার আইডি অথবা মোবাইল নম্বর দিয়ে খাবারের বর্তমান অবস্থা দেখুন
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="অর্ডার ট্র্যাকিং বন্ধ করুন"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-white/15 text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="track-order-input"
              className="block text-xs font-semibold text-[#111815]"
            >
              অর্ডার আইডি বা মোবাইল নম্বর লিখুন
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="track-order-input"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="যেমন: #ORD-482915 অথবা 01711-000000"
                className="flex-1 min-h-[46px] rounded-md border border-[#111815]/25 bg-white px-3.5 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                data-testid="track-order-submit"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md bg-[#111815] px-5 py-2.5 text-sm font-semibold text-[#C5A059] hover:bg-[#1E2B25] cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>{loading ? 'খোঁজা হচ্ছে...' : 'অবস্থা দেখুন'}</span>
              </button>
            </div>
          </form>

          {/* Recent local orders quick chips */}
          {localOrders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#525B56]">
                আপনার সাম্প্রতিক অর্ডারসমূহ:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {localOrders.slice(0, 4).map((ord) => (
                  <button
                    key={ord.orderId}
                    type="button"
                    onClick={() => {
                      setQueryInput(ord.orderId);
                      void runLookup(ord.orderId);
                    }}
                    className="rounded-md border border-[#C5A059]/45 bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#111815] hover:border-[#C5A059] hover:bg-[#EFE8DA] cursor-pointer tabular-nums"
                  >
                    {ord.orderId} · {formatBDT(ord.grandTotal)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Multiple match selector if phone has multiple orders */}
          {results.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-[#525B56]">
                এই নম্বরে একাধিক অর্ডার পাওয়া গেছে ({toBengaliDigits(results.length)}টি):
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {results.map((rec) => (
                  <button
                    key={rec.docId}
                    type="button"
                    onClick={() => setSelectedRecord(rec)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      selectedRecord?.docId === rec.docId
                        ? 'bg-[#111815] text-[#C5A059]'
                        : 'border border-[#111815]/20 bg-white text-[#111815]'
                    }`}
                  >
                    {rec.orderId} ({ORDER_STATUS_LABELS[rec.status]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Order Live Timeline */}
          {selectedRecord && (
            <div
              data-testid="tracking-result-card"
              className="rounded-xl border border-[#C5A059]/45 bg-[#FFFDF9] p-5 space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#111815]/10 pb-4">
                <div>
                  <span className="text-xs font-semibold text-[#8A6924]">
                    অর্ডার আইডি: {selectedRecord.orderId}
                  </span>
                  <h3 className="mt-0.5 font-serif text-xl font-semibold text-[#111815]">
                    বর্তমান অবস্থা: {ORDER_STATUS_LABELS[selectedRecord.status]}
                  </h3>
                  <p className="mt-1 text-xs text-[#525B56]">
                    এলাকা: {selectedRecord.deliveryZone} ·{' '}
                    {selectedRecord.orderType === 'preorder'
                      ? `প্রি-অর্ডার (${toBengaliDigits(selectedRecord.preorderDate)} · ${selectedRecord.preorderTimeSlot})`
                      : 'তাৎক্ষণিক ডেলিভারি'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-[#525B56]">সর্বমোট বিল</span>
                  <span className="font-serif text-lg font-bold text-[#111815] tabular-nums">
                    {formatBDT(selectedRecord.grandTotal)}
                  </span>
                </div>
              </div>

              <ol className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const completed = index <= activeStepIndex;
                  const isCurrent = index === activeStepIndex;
                  return (
                    <li key={step.key} className="flex items-start gap-3.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                          completed
                            ? 'border-[#C5A059] bg-[#111815] text-[#C5A059]'
                            : 'border-[#111815]/15 bg-[#EFE8DA] text-[#525B56]'
                        }`}
                      >
                        {completed && !isCurrent ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p
                          className={`text-sm font-semibold ${
                            completed ? 'text-[#111815]' : 'text-[#525B56]'
                          }`}
                        >
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 text-xs font-medium text-[#8A6924]">
                              (বর্তমান ধাপ)
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#525B56]">
                          {step.desc}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
