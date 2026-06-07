export interface UserDTO {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a Prisma User model to a UserDTO.
 * Strips sensitive fields: password hash, emailVerified timestamp.
 */
export function toUserDTO(user: {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  isVerified: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  password?: { hash: string } | null;
}): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
