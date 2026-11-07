import { prisma } from '../src/lib/db'
import { seedInitialData } from '../src/lib/seed'
import { GUEST_USER_ID, ensureGuestUser } from '../src/lib/guest-user'

async function main() {
  console.log('Seeding ScholarOS database...')
  await ensureGuestUser()
  await seedInitialData(GUEST_USER_ID)
  console.log('✅ ScholarOS database seeded successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

