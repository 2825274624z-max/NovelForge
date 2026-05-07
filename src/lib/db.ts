import { PrismaClient } from "@/generated/prisma";
import { PrismaSqlite } from "prisma-adapter-sqlite";
import * as path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const dbPath = path.resolve(
    process.cwd(),
    "prisma",
    "dev.db"
  );
  const adapter = new PrismaSqlite({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
