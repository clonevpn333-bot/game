import { PRODUCT_NAME, site } from '@/site.config';

/** Short exports for MDX, where `{P}` reads better than `{site.productName}`. */
export const P = PRODUCT_NAME;
export const TRIAL = site.pricing.trialBinders;
export const SOLO = site.pricing.solo;
export const FIRM = site.pricing.firm;
export const REFUND_DAYS = site.pricing.refundDays;
export const LICENSE_HOST = site.network.licenseHost;
export const UPDATE_HOST = site.network.updateHost;
