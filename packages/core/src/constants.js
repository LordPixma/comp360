export const COMPLIANCE_PACKS = {
    SOC2_LITE: 'soc2_lite',
    ISO_CORE: 'iso_core',
    GDPR_BASELINE: 'gdpr_baseline'
};
export const EVIDENCE_TTL = {
    SHORT: 7 * 24 * 60 * 60 * 1000, // 7 days
    MEDIUM: 30 * 24 * 60 * 60 * 1000, // 30 days
    LONG: 90 * 24 * 60 * 60 * 1000 // 90 days
};
export const JWT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_TTL = 15 * 60; // 15 minutes in seconds
export const PRESIGNED_URL_TTL = 15 * 60; // 15 minutes in seconds
