const PAYMENT_CHECK_COOLDOWN_MS = 5000;
const MAX_TRACKED_CHECKS = 10000;
const lastChecks = new Map();

function pruneExpired(now) {
  if (lastChecks.size < MAX_TRACKED_CHECKS) return;

  for (const [key, checkedAt] of lastChecks) {
    if (now - checkedAt >= PAYMENT_CHECK_COOLDOWN_MS) {
      lastChecks.delete(key);
    }
  }
}

function consumePaymentCheckSlot(userId, orderId, now = Date.now()) {
  const key = `${userId}:${orderId}`;
  const lastCheckedAt = lastChecks.get(key);

  if (lastCheckedAt !== undefined) {
    const retryAfterMs = PAYMENT_CHECK_COOLDOWN_MS - (now - lastCheckedAt);
    if (retryAfterMs > 0) {
      return { allowed: false, retryAfterMs };
    }
  }

  pruneExpired(now);
  lastChecks.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}

function resetPaymentCheckLimiter() {
  lastChecks.clear();
}

module.exports = {
  PAYMENT_CHECK_COOLDOWN_MS,
  consumePaymentCheckSlot,
  resetPaymentCheckLimiter
};
