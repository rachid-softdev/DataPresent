// ==========================================
// Sector constants & validation
// Derived from Prisma's Sector enum at runtime.
// Any change to prisma/schema.prisma → enum Sector
// automatically propagates here with zero manual steps.
// ==========================================
import { Sector } from '@prisma/client'

/**
 * All valid sector values as a readonly array.
 * Derived from the Prisma-generated Sector const-object.
 * Use for runtime validation: Array.includes() checks.
 */
export const VALID_SECTORS: readonly string[] = Object.values(Sector)

/**
 * Type guard: narrows a string to the Sector union type.
 *
 * @example
 *   if (isValidSector(someString)) {
 *     prisma.report.create({ data: { sector: someString } }) // someString is now Sector
 *   }
 */
export function isValidSector(s: string | null | undefined): s is Sector {
  return typeof s === 'string' && VALID_SECTORS.includes(s)
}
