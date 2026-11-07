import { prisma } from './db'
import { seedInitialData } from './seed'

const GUEST_USER_ID = 'guest-user-scholar-os'
const GUEST_USER_EMAIL = 'guest@scholar-os.local'

/**
 * Ensures the single guest user exists in the database and returns their ID.
 * Since ScholarOS is a personal app, we use one fixed guest user for all data.
 * If fresh database, automatically seeds initial academic structure and records.
 */
export async function ensureGuestUser(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: GUEST_USER_ID },
    select: { id: true },
  })

  if (!existing) {
    // Create the guest user for the first time
    await prisma.user.create({
      data: {
        id: GUEST_USER_ID,
        name: 'Scholar',
        email: GUEST_USER_EMAIL,
        timezone: 'Asia/Karachi',
      },
    })
  }

  // Ensure initial academic data exists in database
  const subjectCount = await prisma.subject.count({ where: { userId: GUEST_USER_ID } })
  if (subjectCount === 0) {
    try {
      await seedInitialData(GUEST_USER_ID)
    } catch (err) {
      console.error('Error auto-seeding initial academic data:', err)
    }
  }

  return GUEST_USER_ID
}

export { GUEST_USER_ID }
