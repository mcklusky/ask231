import { SITE_NAME } from '@/config/site'
/**
 * Facts used by the Terms of Use and Privacy Policy pages.
 * Fill these in, have both pages reviewed by a qualified Liberian lawyer, then set DRAFT to false
 * to remove the "Draft" banner.
 */
export const LEGAL = {
  DRAFT: true,
  /** Registered name of the business that operates the site. */
  operator: SITE_NAME, // TODO: replace with the registered business name once the company is registered
  /** Where people send questions, data requests and complaints. */
  contactEmail: 'support@[your-domain]',
  /** Postal address of the operator (optional but recommended). */
  address: 'Monrovia, Republic of Liberia',
  effectiveDate: '17 November 2026',
  governingLaw: 'the laws of the Republic of Liberia',
}
