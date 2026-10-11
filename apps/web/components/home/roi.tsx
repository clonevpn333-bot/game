import { site } from '@/site.config';
import { Band, SectionHeading } from '../rails';
import { RoiCalculator } from './roi-calculator';

export function Roi() {
  return (
    <Band labelledBy="roi-title">
      <div className="grid gap-12 px-5 py-16 md:px-10 md:py-24">
        <SectionHeading
          id="roi-title"
          eyebrow="04 — The math"
          title="Pay once. Keep the difference."
          lede="Per-return organizing services charge you every return, every season. Compare it with your own numbers."
          className="reveal"
        />
        <div className="reveal">
          <RoiCalculator price={site.pricing.solo.price} productName={site.productName} />
        </div>
      </div>
    </Band>
  );
}
