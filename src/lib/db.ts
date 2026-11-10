import { PrismaClient } from '@prisma/client'


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient
try {
  prisma = globalForPrisma.prisma ?? new PrismaClient()
} catch {
  console.warn('[AI Studio] Database initialization error — activating mock fallback')
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    count: async () => 0,
    upsert: async (d: any) => d?.create ?? {},
  }
  prisma = new Proxy({} as any, { get: () => noOp })
}

export { prisma }
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma

