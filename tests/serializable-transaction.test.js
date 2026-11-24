import { describe, expect, it, vi } from "vitest";

import createSerializableTransactionRunner from "../src/lib/serializable-transaction.js";

describe("Serializable Transaction Runner", () => {
  it("executes the transaction successfully on the first attempt", async () => {
    const tx = {
      test: true,
    };

    const transaction = vi.fn(async (callback) => callback(tx));

    const sleepFn = vi.fn();

    const runTransaction = createSerializableTransactionRunner({
      transaction,
      maxAttempts: 3,
      sleepFn,
    });

    const callback = vi.fn(async (transactionClient) => {
      return transactionClient.test;
    });

    const result = await runTransaction(callback);

    expect(result).toBe(true);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();

    expect(transaction).toHaveBeenCalledWith(callback, {
      isolationLevel: "Serializable",
    });
  });

  it("retries when Prisma returns P2034", async () => {
    const serializationError = Object.assign(
      new Error("Serialization failure"),
      {
        code: "P2034",
      },
    );

    const tx = {
      success: true,
    };

    const transaction = vi
      .fn()
      .mockRejectedValueOnce(serializationError)
      .mockRejectedValueOnce(serializationError)
      .mockImplementation(async (callback) => callback(tx));

    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const runTransaction = createSerializableTransactionRunner({
      transaction,
      maxAttempts: 3,
      baseDelayMs: 25,
      sleepFn,
    });

    const callback = vi.fn(async (transactionClient) => {
      return transactionClient.success;
    });

    const result = await runTransaction(callback);

    expect(result).toBe(true);

    expect(transaction).toHaveBeenCalledTimes(3);

    // The callback runs only when the transaction succeeds.
    expect(callback).toHaveBeenCalledTimes(1);

    // Exponential backoff: 25ms, 50ms.
    expect(sleepFn).toHaveBeenNthCalledWith(1, 25);
    expect(sleepFn).toHaveBeenNthCalledWith(2, 50);
  });

  it("does not retry errors other than P2034", async () => {
    const databaseError = Object.assign(
      new Error("Database connection failed"),
      {
        code: "P1001",
      },
    );

    const transaction = vi.fn().mockRejectedValue(databaseError);

    const sleepFn = vi.fn();

    const runTransaction = createSerializableTransactionRunner({
      transaction,
      maxAttempts: 3,
      sleepFn,
    });

    await expect(runTransaction(async () => "success")).rejects.toBe(
      databaseError,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("throws a 409 error after exhausting all retry attempts", async () => {
    const serializationError = Object.assign(
      new Error("Serialization failure"),
      {
        code: "P2034",
      },
    );

    const transaction = vi.fn().mockRejectedValue(serializationError);

    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const runTransaction = createSerializableTransactionRunner({
      transaction,
      maxAttempts: 3,
      baseDelayMs: 25,
      sleepFn,
    });

    const callback = vi.fn();

    let thrownError;

    try {
      await runTransaction(callback);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);

    expect(thrownError.statusCode).toBe(409);

    expect(thrownError.message).toBe(
      "Transaction failed because of concurrent updates. Please try again.",
    );

    expect(thrownError.cause).toBe(serializationError);

    expect(transaction).toHaveBeenCalledTimes(3);

    expect(sleepFn).toHaveBeenCalledTimes(2);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not wait after the final failed attempt", async () => {
    const serializationError = Object.assign(
      new Error("Serialization failure"),
      {
        code: "P2034",
      },
    );

    const transaction = vi.fn().mockRejectedValue(serializationError);

    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const runTransaction = createSerializableTransactionRunner({
      transaction,
      maxAttempts: 1,
      sleepFn,
    });

    await expect(runTransaction(async () => "success")).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
