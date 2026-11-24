import { Clock, ExternalLink, Mail, MapPin, Phone, Star } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';
import { toBengaliDigits } from '../utils/orderLogic';

interface ReviewsAndFooterProps {
  restaurantInfo: RestaurantInfo;
  reviewsContent?: SiteContent['reviews'];
  footerContent?: SiteContent['footer'];
  onOpenTracking: () => void;
}

export function ReviewsAndFooter({
  restaurantInfo,
  reviewsContent = DEFAULT_SITE_CONTENT.reviews,
  footerContent = DEFAULT_SITE_CONTENT.footer,
  onOpenTracking,
}: ReviewsAndFooterProps) {
  return (
    <>
      {/* Customer Reviews Section */}
      <section id="reviews" className="bg-[#FAF6F0] py-16 text-[#161E1A] sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-[#111815]/12 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8A6924]">
                {reviewsContent.eyebrow}
              </p>
              <h2
                className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#111815] sm:text-4xl"
                style={{ textWrap: 'balance' }}
              >
                {reviewsContent.heading}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-sm text-[#111815]">
              <div
                className="flex items-center gap-0.5 text-[#C5A059]"
                aria-label={`রেটিং ${reviewsContent.ratingBadgeText}`}
              >
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <span className="font-semibold tabular-nums">{reviewsContent.ratingBadgeText}</span>
              <span aria-hidden="true" className="text-[#525B56]">
                ·
              </span>
              <span className="text-xs text-[#525B56]">{reviewsContent.verifiedLabel}</span>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-3">
            {reviewsContent.items.map((review) => (
              <article
                key={review.id}
                className="flex flex-col justify-between rounded-xl border border-[#111815]/12 bg-[#FFFDF9] p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-0.5 text-[#C5A059]"
                      aria-label={`৫ এর মধ্যে ${toBengaliDigits(review.rating)} স্টার`}
                    >
                      {Array.from({ length: Math.max(1, Math.min(5, review.rating || 5)) }).map(
                        (_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        )
                      )}
                    </div>
                    <span className="text-xs text-[#525B56]">{review.dateLabel}</span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#2C3530]">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 border-t border-[#111815]/10 pt-4">
                  <p className="font-serif text-base font-semibold text-[#111815]">
                    {review.author}
                  </p>
                  <p className="mt-0.5 text-xs text-[#525B56]">
                    {review.location} · অর্ডার: {review.dishOrdered}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-[#C5A059]/20 bg-[#111815] text-[#FAF6F0]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Brand & Contact */}
            <div className="lg:col-span-4">
              <p className="font-serif text-2xl font-semibold text-[#FAF6F0]">
                {restaurantInfo.brandName}
              </p>
              <p className="mt-2 text-xs text-[#C5A059]">{restaurantInfo.heritageOrigin}</p>
              <p className="mt-4 text-sm leading-relaxed text-[#FAF6F0]/75">
                {footerContent.aboutDescription}
              </p>

              <div className="mt-6 space-y-3 text-sm text-[#FAF6F0]/85">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                  <span>{restaurantInfo.address}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                  <span>{restaurantInfo.hoursDisplay}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                  <a
                    href={`tel:${restaurantInfo.whatsappNumber}`}
                    className="hover:text-[#C5A059] transition-colors tabular-nums"
                  >
                    {restaurantInfo.displayPhone}
                  </a>
                </div>
                {restaurantInfo.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                    <a
                      href={`mailto:${restaurantInfo.email}`}
                      className="hover:text-[#C5A059] transition-colors break-all"
                    >
                      {restaurantInfo.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold tracking-wider text-[#C5A059]">
                {footerContent.quickLinksHeading}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#FAF6F0]/80">
                <li>
                  <a href="#heritage" className="hover:text-[#C5A059] transition-colors">
                    বাবুর্চির স্পেশাল পদ
                  </a>
                </li>
                <li>
                  <a href="#menu" className="hover:text-[#C5A059] transition-colors">
                    পূর্ণাঙ্গ খাবারের মেনু
                  </a>
                </li>
                <li>
                  <a href="#catering" className="hover:text-[#C5A059] transition-colors">
                    বড় দাওয়াত ও প্রি-অর্ডার
                  </a>
                </li>
                <li>
                  <a href="#reviews" className="hover:text-[#C5A059] transition-colors">
                    গ্রাহকদের মতামত
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenTracking}
                    className="hover:text-[#C5A059] transition-colors cursor-pointer"
                  >
                    অর্ডার ট্র্যাক করুন
                  </button>
                </li>
              </ul>

              <h3 className="mt-8 text-xs font-semibold tracking-wider text-[#C5A059]">
                {footerContent.socialHeading}
              </h3>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#FAF6F0]/80">
                <a
                  href={`https://wa.me/${restaurantInfo.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A059] underline underline-offset-4"
                >
                  হোয়াটসঅ্যাপ
                </a>
                {restaurantInfo.facebookUrl && (
                  <a
                    href={restaurantInfo.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#C5A059] underline underline-offset-4"
                  >
                    ফেসবুক
                  </a>
                )}
                {restaurantInfo.instagramUrl && (
                  <a
                    href={restaurantInfo.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#C5A059] underline underline-offset-4"
                  >
                    ইনস্টাগ্রাম
                  </a>
                )}
              </div>
            </div>

            {/* Google Maps Card */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-xl border border-[#C5A059]/25 bg-[#18221D]">
                <div className="relative flex h-56 w-full flex-col justify-between bg-[#15201B] p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(197,160,89,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(197,160,89,0.28) 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-wide text-[#C5A059]">
                      {footerContent.mapHeaderLabel}
                    </span>
                    <span className="text-xs text-[#FAF6F0]/65 tabular-nums">
                      {restaurantInfo.mapsCoordinates}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C5A059]/60 bg-[#111815] text-[#C5A059]">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-serif text-base font-semibold text-[#FAF6F0]">
                        {restaurantInfo.brandName}
                      </p>
                      <p className="text-xs text-[#FAF6F0]/75">
                        {footerContent.mapLocationNote}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-xs text-[#FAF6F0]/65">
                      {footerContent.mapFooterLabel}
                    </span>
                    <a
                      href={restaurantInfo.mapsUrl || 'https://maps.google.com/?q=23.6214,91.1142'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A059] hover:text-[#D4B26E]"
                    >
                      <span>{footerContent.mapButtonLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#FAF6F0]/60 sm:flex-row sm:items-center">
            <p>
              &copy; {toBengaliDigits(new Date().getFullYear())} {restaurantInfo.brandName}।{' '}
              {footerContent.copyrightText}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span>{footerContent.bottomNote}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
