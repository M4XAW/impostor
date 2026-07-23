import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_TRANSACTION_ATTEMPTS = 4;

export type GameTransaction = Prisma.TransactionClient;

export async function runGameTransaction<T>(
  operation: (transaction: GameTransaction) => Promise<T>,
) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < MAX_TRANSACTION_ATTEMPTS - 1;

      if (!shouldRetry) throw error;
    }
  }

  throw new Error("Transaction retry limit reached.");
}
