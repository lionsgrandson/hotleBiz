export const POLICY_VERSION = '2026-09-26'

function clean(value: string | undefined) {
  return (value || '').trim()
}

export function publicOperator() {
  return {
    legalName: clean(process.env.NEXT_PUBLIC_LEGAL_NAME) || 'GuestAtlas',
    privacyEmail: clean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
    securityEmail: clean(process.env.NEXT_PUBLIC_SECURITY_EMAIL),
    accessibilityEmail: clean(process.env.NEXT_PUBLIC_ACCESSIBILITY_EMAIL) || clean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
    dpoEmail: clean(process.env.NEXT_PUBLIC_DPO_EMAIL),
    address: clean(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
    country: clean(process.env.NEXT_PUBLIC_LEGAL_COUNTRY) || 'Israel',
    appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000',
  }
}

export function mailto(email: string) {
  return email ? `mailto:${email}` : '#'
}
