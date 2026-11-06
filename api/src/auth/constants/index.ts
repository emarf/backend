export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// a valid "salt:hash" that matches no password; only there to burn the same time
export const DUMMY_HASH = '00000000000000000000000000000000:' + '0'.repeat(128);
