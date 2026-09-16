/** Partner support + Play Store legal links (partner.akansho.com). */
export const SUPPORT_PHONE = '+918986849919';
export const SUPPORT_PHONE_TEL = 'tel:+918986849919';
export const SUPPORT_EMAIL = 'support@akansho.com';
export const SUPPORT_EMAIL_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const PARTNER_ORIGIN = 'https://partner.akansho.com';
export const PRIVACY_POLICY_PATH = '/privacy';
export const TERMS_OF_SERVICE_PATH = '/terms';
/** Play Console + in-app Privacy Policy */
export const PRIVACY_POLICY_URL = `${PARTNER_ORIGIN}${PRIVACY_POLICY_PATH}`;
/** Play Console + in-app Terms */
export const TERMS_OF_SERVICE_URL = `${PARTNER_ORIGIN}${TERMS_OF_SERVICE_PATH}`;
export const TERMS_URL = TERMS_OF_SERVICE_URL;
/**
 * Optional Play Console “Account deletion” web URL.
 * In-app deletion lives under Settings → Account; this page documents the right.
 */
export const ACCOUNT_DELETION_INFO_URL = PRIVACY_POLICY_URL;

export const LEGAL_ENTITY = 'Akansho';
export const PRODUCT_NAME = 'Akansho Partner';
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}`;
