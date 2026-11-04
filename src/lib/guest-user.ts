import { prisma } from './db'

const GUEST_USER_ID = 'guest-user-scholar-os'
const GUEST_USER_EMAIL = 'guest@scholar-os.local'

/**
 * Ensures the single guest user exists in the database and returns their ID.
 * Since ScholarOS is a personal app, we use one fixed guest user for all data.
 */
export async function ensureGuestUser(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: GUEST_USER_ID },
    select: { id: true },
  })

  if (existing) return existing.id

  // Create the guest user for the first time
  await prisma.user.create({
    data: {
      id: GUEST_USER_ID,
      name: 'Scholar',
      email: GUEST_USER_EMAIL,
      timezone: 'Asia/Karachi',
    },
  })

  return GUEST_USER_ID
}

export { GUEST_USER_ID }
