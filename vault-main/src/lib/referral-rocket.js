// ReferralRocket campaign id for the homepage-only click tracker
// (components/WebsiteComps/ReferralRocketTracking.jsx), which loads the
// widget script that captures ?referralCode= from the URL into the
// rr_referral_code cookie (60-day retention). Sale/payment tracking is
// handled entirely by ReferralRocket's own Razorpay webhook integration
// (configured directly in the Razorpay dashboard) - nothing on our side for
// that half. Lead tracking has to be client-side (window.Rocket) since the
// server-side REST API (POST /api/v1/addParticipant) needs a paid-plan API
// key we don't have - see components/auth/vault-door/useVaultClerk.js for
// where addParticipant is called.
export const REFERRAL_ROCKET_CAMPAIGN_ID = "B8eATbfQ";
