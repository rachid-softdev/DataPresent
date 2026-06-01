import { z } from "zod";
import { isPasswordValid } from "@/lib/password";

// =========================
// SHARE SCHEMAS
// =========================

export const ShareCreateSchema = z.object({
  isPublic: z.boolean(),
});

export const ShareUpdateSchema = z.object({
  allowComments: z.boolean().optional(),
  allowEmbed: z.boolean().optional(),
  expiresAt: z.enum(["7d", "30d", "90d", "never"]).optional(),
  password: z
    .string()
    .refine((val) => val === "" || isPasswordValid(val), {
      message: "Password does not meet complexity requirements",
    })
    .optional()
    .or(z.literal("")),
});

// =========================
// INVITE SCHEMA
// =========================

export const InviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["MEMBER", "ADMIN", "OWNER"]).optional().default("MEMBER"),
});

// =========================
// PASSWORD RESET SCHEMA
// =========================

export const PasswordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().refine((val) => isPasswordValid(val), {
    message: "Password does not meet complexity requirements",
  }),
});
