import orderData from "../data/order.data.js";

const INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 100;

let timer = null;
let isRunning = false;

const runOrderExpiration = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    let expiredCount;

    do {
      expiredCount = await orderData.expirePendingOrders({
        now: new Date(),
        batchSize: BATCH_SIZE,
      });

      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} pending order(s)`);
      }
    } while (expiredCount === BATCH_SIZE);
  } catch (error) {
    console.error("Order expiration worker failed:", error);
  } finally {
    isRunning = false;
  }
};

const startOrderExpirationWorker = () => {
  if (timer) {
    return;
  }

  void runOrderExpiration();

  timer = setInterval(() => {
    void runOrderExpiration();
  }, INTERVAL_MS);

  timer.unref?.();
};

const stopOrderExpirationWorker = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

export {
  startOrderExpirationWorker,
  stopOrderExpirationWorker,
  runOrderExpiration,
};
