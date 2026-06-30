const sessionLocks = new Map();

/**
 * Executes an operation within an in-memory queue chain for a specific phone number.
 * @param {string} lockKey - Unique identifier (tenant_id + mobile)
 * @param {Function} operation - Async function to run
 * @returns {Promise<any>}
 */
function acquireLock(lockKey, operation) {
  if (!sessionLocks.has(lockKey)) {
    sessionLocks.set(lockKey, Promise.resolve());
  }

  const existingChain = sessionLocks.get(lockKey);
  
  const nextChain = existingChain
    .then(async () => {
      try {
        return await operation();
      } catch (err) {
        console.error(`[ConcurrencyLock] Execution failed for Key ${lockKey}:`, err);
        throw err;
      }
    })
    .finally(() => {
      // Clean up the map if no other threads are waiting behind this execution
      if (sessionLocks.get(lockKey) === nextChain) {
        sessionLocks.delete(lockKey);
      }
    });

  sessionLocks.set(lockKey, nextChain);
  return nextChain;
}

module.exports = { acquireLock };
