/**
 * Names the session this device has logged sets for that haven't synced yet.
 * The server reads it so it doesn't close that session as idle before they
 * arrive, since it can't see what's queued on the phone.
 */
export const pendingSyncCookie = "overmastery-pending-sync";
