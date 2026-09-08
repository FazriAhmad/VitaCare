import { PrismaClient } from '@prisma/client'
import { jalankanSeed } from '../src/lib/seedData.js'

const prisma = new PrismaClient()

jalankanSeed(prisma)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
