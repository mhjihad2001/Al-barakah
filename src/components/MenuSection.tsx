import { useState } from 'react';
import { CalendarClock, Minus, Plus, UtensilsCrossed, X } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  MENU_CATEGORIES,
  type MenuCategory,
  type MenuItem,
  type SiteContent,
} from '../data/restaurantConfig';
import {
  type CartItem,
  filterMenuItems,
  formatBDT,
  toBengaliDigits,
} from '../utils/orderLogic';

interface MenuSectionProps {
  items: MenuItem[];
  menuContent?: SiteContent['menu'];
  cartItems: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onCategoryChange: (category: 'সব খাবার' | MenuCategory) => void;
  onInspectDish: (item: MenuItem) => void;
}

function MenuCardImage({ item }: { item: MenuItem }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#18221D] to-[#111815] p-6 text-center text-[#C5A059]">
        <UtensilsCrossed className="h-8 w-8 opacity-80" aria-hidden="true" />
        <span className="mt-2 font-serif text-sm text-[#FAF6F0]">{item.name}</span>
      </div>
    );
  }

  return (
    <img
      src={item.image}
      alt={item.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function MenuSection({
  items,
  menuContent = DEFAULT_SITE_CONTENT.menu,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onCategoryChange,
  onInspectDish,
}: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'সব খাবার' | MenuCategory>('সব খাবার');
  const [preOrderOnlyFilter, setPreOrderOnlyFilter] = useState(false);

  const filteredItems = filterMenuItems(items, selectedCategory, preOrderOnlyFilter);

  const getCartQuantity = (id: string) =>
    cartItems.find((entry) => entry.item.id === id)?.quantity ?? 0;

  const handleSelectCategory = (category: 'সব খাবার' | MenuCategory) => {
    setSelectedCategory(category);
    onCategoryChange(category);
  };

  return (
    <section
      id="menu"
      className="border-t border-[#111815]/10 bg-[#F3EDE2] py-16 text-[#161E1A] sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header & Controls */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-wider text-[#8A6924]">
              {menuContent.eyebrow}
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#111815] sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              {menuContent.heading}
            </h2>
          </div>

          {/* Bengali Category Tabs + Pre-order Only Toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              role="tablist"
              aria-label="খাবারের তালিকা ফিল্টার"
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#111815]/12 bg-[#FAF6F0] p-1"
            >
              {MENU_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectCategory(category)}
                    className={`min-h-[40px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#111815] text-[#FAF6F0]'
                        : 'text-[#525B56] hover:text-[#111815]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-pressed={preOrderOnlyFilter}
              onClick={() => setPreOrderOnlyFilter((prev) => !prev)}
              className={`inline-flex min-h-[46px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                preOrderOnlyFilter
                  ? 'border-[#C5A059] bg-[#C5A059] text-[#111815]'
                  : 'border-[#C5A059]/60 bg-[#FAF6F0] text-[#7A5B1C] hover:border-[#C5A059]'
              }`}
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              <span>{menuContent.preOrderFilterLabel}</span>
            </button>
          </div>
        </div>

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="mt-12 rounded-xl border border-[#111815]/12 bg-[#FAF6F0] p-10 text-center">
            <p className="font-serif text-xl font-semibold text-[#111815]">
              এই বিভাগে কোনো খাবার পাওয়া যায়নি
            </p>
            <p className="mt-2 text-sm text-[#525B56]">
              সব খাবার দেখতে ফিল্টার রিসেট করুন অথবা &ldquo;সব খাবার&rdquo; ট্যাবে ফিরে যান।
            </p>
            <button
              type="button"
              onClick={() => {
                handleSelectCategory('সব খাবার');
                setPreOrderOnlyFilter(false);
              }}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-md bg-[#111815] px-5 py-2 text-xs font-semibold text-[#FAF6F0] hover:bg-[#23312B] cursor-pointer"
            >
              সব খাবার দেখুন
            </button>
          </div>
        ) : (
          <div
            data-testid="menu-grid"
            className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredItems.map((item) => {
              const qty = getCartQuantity(item.id);
              return (
                <article
                  key={item.id}
                  data-testid="menu-card"
                  className={`group flex flex-col overflow-hidden rounded-xl border border-[#111815]/12 bg-[#FFFDF9] transition-transform duration-200 hover:-translate-y-0.5 ${
                    !item.available ? 'opacity-75' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onInspectDish(item)}
                    className="aspect-[4/3] w-full overflow-hidden bg-[#18221D] text-left cursor-pointer"
                    aria-label={`${item.name} এর বিস্তারিত দেখুন`}
                  >
                    <MenuCardImage item={item} />
                  </button>

                  <div className="flex flex-1 flex-col p-6">
                    {/* Clean Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#525B56]">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#111815]">
                        পরিমাণ: {item.servingSize}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onInspectDish(item)}
                      className="mt-2 text-left cursor-pointer"
                    >
                      <h3 className="font-serif text-xl font-semibold leading-snug text-[#111815] group-hover:text-[#8A6924] transition-colors">
                        {item.name}
                      </h3>
                    </button>

                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#454E49]">
                      {item.description}
                    </p>

                    {/* Distinct Gold Pre-Order Badge */}
                    {item.preOrderOnly && (
                      <div className="mt-4 flex items-center gap-2 rounded-md border border-[#C5A059]/60 bg-[#C5A059]/15 px-3 py-2 text-xs font-semibold text-[#7A5B1C]">
                        <CalendarClock
                          className="h-4 w-4 shrink-0 text-[#9A7426]"
                          aria-hidden="true"
                        />
                        <span>
                          অগ্রিম অর্ডার (প্রি-অর্ডার) ·{' '}
                          {item.advanceNotice || 'কমপক্ষে ৪ ঘণ্টা আগে অর্ডার করতে হবে'}
                        </span>
                      </div>
                    )}

                    {/* Price & Order Action */}
                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#111815]/10 pt-4">
                      <div>
                        <span className="block text-[11px] text-[#525B56]">দাম</span>
                        <span className="text-lg font-bold text-[#111815] tabular-nums">
                          {formatBDT(item.price)}
                        </span>
                      </div>

                      {!item.available ? (
                        <span className="inline-flex min-h-[42px] items-center rounded-md border border-[#111815]/15 bg-[#EFE8DA] px-4 py-2 text-xs font-semibold text-[#525B56]">
                          {menuContent.outOfStockLabel}
                        </span>
                      ) : qty > 0 ? (
                        <div className="inline-flex items-center rounded-md border border-[#111815]/20 bg-[#FAF6F0]">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            aria-label={`${item.name} এর পরিমাণ কমান`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[#111815] hover:bg-[#111815]/10 cursor-pointer"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span
                            aria-label={`${item.name} ব্যাগে পরিমাণ`}
                            className="min-w-[28px] text-center text-sm font-bold text-[#111815] tabular-nums"
                          >
                            {toBengaliDigits(qty)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            aria-label={`${item.name} এর পরিমাণ বাড়ান`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[#111815] hover:bg-[#111815]/10 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart(item)}
                          aria-label={`${item.name} অর্ডার করুন`}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#111815] px-5 py-2.5 text-xs font-semibold text-[#FAF6F0] transition-colors hover:bg-[#24332C] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                          <span>{menuContent.orderButtonLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface DishDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
}

export function DishDetailModal({
  item,
  onClose,
  onAddToCart,
}: DishDetailModalProps) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[#C5A059]/40 bg-[#FFFDF9] text-[#161E1A] shadow-2xl">
        <div className="relative aspect-[4/3] w-full bg-[#18221D]">
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="খাবারের বিবরণ বন্ধ করুন"
            className="absolute right-3 top-3 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-[#111815]/85 text-[#FAF6F0] hover:bg-[#111815] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-xs text-[#525B56]">
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>পরিমাণ: {item.servingSize}</span>
          </div>

          <h3
            id="dish-modal-title"
            className="mt-2 font-serif text-2xl font-semibold text-[#111815]"
          >
            {item.name}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-[#38413C]">
            {item.description}
          </p>

          {item.preOrderOnly && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#C5A059]/60 bg-[#C5A059]/15 px-3 py-2 text-xs font-semibold text-[#7A5B1C]">
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                অগ্রিম অর্ডার (প্রি-অর্ডার) ·{' '}
                {item.advanceNotice || 'কমপক্ষে ৪ ঘণ্টা আগে অর্ডার করতে হবে'}
              </span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#111815]/10 pt-4">
            <span className="text-xl font-bold text-[#111815] tabular-nums">
              {formatBDT(item.price)}
            </span>

            <button
              type="button"
              disabled={!item.available}
              onClick={() => {
                onAddToCart(item);
                onClose();
              }}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors ${
                item.available
                  ? 'bg-[#111815] text-[#FAF6F0] hover:bg-[#24332C] cursor-pointer'
                  : 'bg-[#111815]/20 text-[#525B56] cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
              <span>{item.available ? 'ব্যাগে যোগ করুন' : 'বর্তমানে স্টক শেষ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
