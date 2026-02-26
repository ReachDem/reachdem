import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const createPrismaClient = () =>
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: process.env.DATABASE_URL ? {
            db: {
                url: process.env.DATABASE_URL
            }
        } : undefined
    })

const hasRequiredDelegates = (client: PrismaClient) =>
    Boolean((client as any).group && (client as any).contact && (client as any).organization)

const existingClient = globalForPrisma.prisma

export const prisma =
    existingClient && hasRequiredDelegates(existingClient)
        ? existingClient
        : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'
