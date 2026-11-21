import { useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  type MenuItem,
  type SiteContent,
} from '../data/restaurantConfig';
import { formatBDT } from '../utils/orderLogic';

interface SignatureHeritageSectionProps {
  menuItems: MenuItem[];
  heritageContent?: SiteContent['heritage'];
  orderButtonLabel?: string;
  onAddToCart: (item: MenuItem) => void;
  onInspectDish: (item: MenuItem) => void;
}

function DishImage({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#18221D] to-[#111815] p-6 text-center text-[#C5A059]">
        <UtensilsCrossed className="h-8 w-8 opacity-80" aria-hidden="true" />
        <span className="mt-2 font-serif text-sm text-[#FAF6F0]">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function SignatureHeritageSection({
  menuItems,
  heritageContent = DEFAULT_SITE_CONTENT.heritage,
  orderButtonLabel = DEFAULT_SITE_CONTENT.menu.orderButtonLabel,
  onAddToCart,
  onInspectDish,
}: SignatureHeritageSectionProps) {
  return (
    <section id="heritage" className="bg-[#FAF6F0] py-16 text-[#161E1A] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-[#111815]/12 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-[#8A6924]">
              {heritageContent.eyebrow}
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#111815] sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              {heritageContent.heading}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#525B56]">
            {heritageContent.subheading}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {heritageContent.dishes.map((dish) => {
            const linkedMenuItem = menuItems.find((m) => m.id === dish.menuItemId);
            const displayPrice = linkedMenuItem ? linkedMenuItem.price : dish.price;
            const isAvailable = linkedMenuItem ? linkedMenuItem.available : true;

            return (
              <article
                key={dish.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#111815]/12 bg-[#FFFDF9] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => linkedMenuItem && onInspectDish(linkedMenuItem)}
                  className="aspect-[4/3] w-full overflow-hidden bg-[#18221D] text-left cursor-pointer"
                  aria-label={`${dish.title} এর বিস্তারিত দেখুন`}
                >
                  <DishImage
                    src={dish.image || linkedMenuItem?.image || ''}
                    alt={`${dish.title} — ${dish.subtitle}`}
                    title={dish.title}
                  />
                </button>

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#525B56]">
                    <span className="font-semibold text-[#8A6924] tabular-nums">
                      {dish.number}. বিশেষ ঐতিহ্য
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{dish.servingSize || linkedMenuItem?.servingSize}</span>
                  </div>

                  <h3 className="mt-2.5 font-serif text-2xl font-semibold leading-snug text-[#111815]">
                    {dish.title || linkedMenuItem?.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[#525B56]">{dish.subtitle}</p>

                  <p className="mt-3.5 flex-1 text-sm leading-relaxed text-[#38413C]">
                    {dish.story}
                  </p>

                  <p className="mt-4 text-xs font-medium text-[#8A6924]">{dish.pairing}</p>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#111815]/10 pt-4">
                    <span className="text-lg font-bold text-[#111815] tabular-nums">
                      {formatBDT(displayPrice)}
                    </span>
                    {linkedMenuItem && (
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => onAddToCart(linkedMenuItem)}
                        aria-label={`${linkedMenuItem.name} অর্ডার করুন`}
                        className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          isAvailable
                            ? 'bg-[#111815] text-[#FAF6F0] hover:bg-[#23312B] cursor-pointer'
                            : 'bg-[#111815]/20 text-[#525B56] cursor-not-allowed'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5 text-[#C5A059]" aria-hidden="true" />
                        <span>{isAvailable ? orderButtonLabel : 'স্টক শেষ'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
