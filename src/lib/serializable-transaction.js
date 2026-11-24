const defaultSleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createSerializableTransactionRunner = ({
  transaction,
  maxAttempts,
  baseDelayMs = 25,
  sleepFn = defaultSleep,
}) => {
  if (typeof transaction !== "function") {
    throw new TypeError("transaction must be a function");
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("maxAttempts must be a positive integer");
  }

  return async (callback) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await transaction(callback, {
          isolationLevel: "Serializable",
        });
      } catch (error) {
        if (error.code !== "P2034") {
          throw error;
        }

        lastError = error;

        if (attempt < maxAttempts) {
          await sleepFn(baseDelayMs * 2 ** (attempt - 1));
        }
      }
    }

    const error = new Error(
      "Transaction failed because of concurrent updates. Please try again.",
    );

    error.statusCode = 409;
    error.cause = lastError;

    throw error;
  };
};

export default createSerializableTransactionRunner;
