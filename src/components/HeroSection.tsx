import { ArrowRight, Clock, MapPin, Truck } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  type DeliveryZone,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';
import { formatBDT, type RestaurantLiveStatus } from '../utils/orderLogic';

interface HeroSectionProps {
  restaurantInfo: RestaurantInfo;
  heroContent?: SiteContent['hero'];
  deliveryZones: DeliveryZone[];
  liveStatus: RestaurantLiveStatus;
  selectedZone: DeliveryZone;
  onSelectZone: (zoneId: string) => void;
  onStartPreOrder: () => void;
  onOpenTracking: () => void;
}

export function HeroSection({
  restaurantInfo,
  heroContent = DEFAULT_SITE_CONTENT.hero,
  deliveryZones,
  liveStatus,
  selectedZone,
  onSelectZone,
  onStartPreOrder,
  onOpenTracking,
}: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[#111815] pt-24 pb-16 sm:pt-32 sm:pb-24"
    >
      {/* Background Hero Feast Image + Measured Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroContent.heroImageUrl || DEFAULT_SITE_CONTENT.hero.heroImageUrl}
          alt={heroContent.headline}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-60"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#111815] via-[#111815]/84 to-[#111815]/45"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#111815] via-transparent to-[#111815]/45"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
          {/* Left Hero Story & Primary CTA */}
          <div className="lg:col-span-7">
            <div className="mb-5 space-y-1.5 text-xs font-medium tracking-wide sm:text-sm">
              <div
                data-testid="live-status-badge"
                className="inline-flex items-center gap-2 text-[#C5A059]"
              >
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{liveStatus.badgeText}</span>
              </div>
              <p className="text-[#FAF6F0]/80">{restaurantInfo.heritageOrigin}</p>
            </div>

            <h1
              className="font-serif text-3xl font-semibold leading-[1.2] tracking-tight text-[#FAF6F0] sm:text-5xl lg:text-[3.35rem]"
              style={{ textWrap: 'balance' }}
            >
              {heroContent.headline}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#FAF6F0]/85 sm:text-lg">
              {heroContent.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#menu"
                className="inline-flex min-h-[48px] items-center gap-2.5 rounded-md bg-[#C5A059] px-7 py-3 text-sm font-semibold text-[#111815] transition-colors hover:bg-[#D4B26E] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF6F0]"
              >
                <span>{heroContent.primaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>

              <a
                href="#catering"
                className="inline-flex min-h-[48px] items-center rounded-md border border-[#C5A059]/45 px-6 py-3 text-sm font-medium text-[#FAF6F0] transition-colors hover:border-[#C5A059] hover:bg-[#C5A059]/10 whitespace-nowrap shrink-0"
              >
                {heroContent.secondaryCtaLabel}
              </a>

              <button
                type="button"
                onClick={onOpenTracking}
                data-testid="hero-track-order-button"
                className="inline-flex min-h-[48px] items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium text-[#C5A059] transition-colors hover:border-[#C5A059] hover:bg-white/5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {heroContent.trackCtaLabel}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Delivery Zone Checker */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[#C5A059]/30 bg-[#18221D]/95 p-6 shadow-2xl backdrop-blur-md sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-[#FAF6F0]">
                    {heroContent.zoneCheckerTitle}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#FAF6F0]/75">
                    {liveStatus.detailText}
                  </p>
                </div>
                <MapPin className="h-5 w-5 shrink-0 text-[#C5A059]" aria-hidden="true" />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="hero-delivery-zone"
                  className="block text-xs font-semibold tracking-wide text-[#C5A059]"
                >
                  {heroContent.zoneSelectLabel}
                </label>
                <select
                  id="hero-delivery-zone"
                  value={selectedZone.id}
                  onChange={(e) => onSelectZone(e.target.value)}
                  className="mt-2 block w-full min-h-[46px] rounded-lg border border-[#C5A059]/35 bg-[#111815] px-3.5 py-2.5 text-sm font-medium text-[#FAF6F0] focus:border-[#C5A059] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                >
                  {deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                      {zone.isOutOfArea
                        ? ' (দোকান থেকে পিকআপ / প্রি-অর্ডার)'
                        : ` — ${formatBDT(zone.fee)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Zone Output */}
              {selectedZone.isOutOfArea ? (
                <div
                  data-testid="zone-status-panel"
                  className="mt-5 rounded-lg border border-[#C5A059]/40 bg-[#C5A059]/10 p-4"
                >
                  <p className="text-sm font-semibold text-[#C5A059]">
                    নির্ধারিত ডেলিভারি এলাকার বাইরে
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#FAF6F0]/85">
                    {selectedZone.note ||
                      'এই এলাকায় তাৎক্ষণিক ডেলিভারি নেই, তবে দোকান থেকে সরাসরি পিকআপ অথবা অনুষ্ঠানের জন্য প্রি-অর্ডার করতে পারবেন।'}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#C5A059]/20 pt-2.5">
                    <span className="text-xs text-[#FAF6F0]/75 tabular-nums">
                      পিকআপ চার্জ: <strong className="text-[#FAF6F0]">৳ ০</strong>
                    </span>
                    <button
                      type="button"
                      onClick={onStartPreOrder}
                      className="text-xs font-semibold text-[#C5A059] underline underline-offset-4 hover:text-[#D4B26E] cursor-pointer"
                    >
                      পিকআপ / প্রি-অর্ডার করুন
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="zone-status-panel"
                  className="mt-5 rounded-lg border border-white/10 bg-[#111815]/80 p-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-[#FAF6F0]/65">ডেলিভারি চার্জ</span>
                      <span
                        data-testid="hero-zone-fee"
                        className="mt-1 block text-lg font-semibold text-[#C5A059] tabular-nums"
                      >
                        {formatBDT(selectedZone.fee)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[#FAF6F0]/65">আনুমানিক সময়</span>
                      <span
                        data-testid="hero-zone-eta"
                        className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-[#FAF6F0] tabular-nums"
                      >
                        <Truck className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                        <span>{selectedZone.eta}</span>
                      </span>
                    </div>
                  </div>
                  {selectedZone.note && (
                    <p className="mt-3 border-t border-white/10 pt-2.5 text-xs text-[#FAF6F0]/70">
                      {selectedZone.note}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
