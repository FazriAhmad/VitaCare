import { prisma } from '../src/lib/prisma.js'
import { jalankanSeed } from '../src/lib/seedData.js'

jalankanSeed(prisma)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
