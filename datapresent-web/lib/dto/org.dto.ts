export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a Prisma Organization model to an OrganizationDTO.
 * Strips internal fields (domainVerifiedAt).
 */
export function toOrgDTO(org: {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  domainVerifiedAt: Date | null;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OrganizationDTO {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    customDomain: org.customDomain,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}
