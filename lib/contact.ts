import { BUSINESS_INFO } from "@/lib/site";

/** Contact details shown in the footer and the homepage ContactSection.
 *  Derived from lib/site.ts (the single source of truth for business
 *  facts) so the two never drift out of sync. */
export const CONTACT_INFO = {
  phoneDisplay: BUSINESS_INFO.phoneDisplay,
  phoneHref: BUSINESS_INFO.phoneHref,
  email: BUSINESS_INFO.email,
  address: BUSINESS_INFO.addressDisplay,
};
