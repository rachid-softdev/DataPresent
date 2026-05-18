import { prisma } from '@/lib/prisma'

export async function ensureUserHasOrganization(userId: string, email: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId }
  })

  if (membership) {
    return membership.orgId
  }

  const nameFromEmail = email.split('@')[0]
  const baseSlug = nameFromEmail.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  let slug = baseSlug
  let counter = 0
  while (await prisma.organization.findUnique({ where: { slug } })) {
    counter++
    slug = `${baseSlug}-${counter}`
  }

  const org = await prisma.organization.create({
    data: {
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      slug,
      members: {
        create: {
          userId,
          role: 'OWNER'
        }
      }
    }
  })

  return org.id
}

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      org: {
        include: {
          subscription: true,
          _count: { select: { reports: true, members: true } }
        }
      }
    }
  })

  return memberships.map(m => ({
    id: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    role: m.role,
    plan: m.org.subscription?.plan || 'FREE',
    reportCount: m.org._count.reports,
    memberCount: m.org._count.members
  }))
}