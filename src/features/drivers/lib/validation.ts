import { z } from "zod";

/** Fixed, small set of classification labels (spec.md Assumptions) — not a user-managed list. */
export const DRIVER_CLASS_OPTIONS = ["Class A Driver", "Class B Driver"] as const;

const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;

const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_RE, "Enter a valid phone number.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const truckNumberSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const driverClassSchema = z.enum(DRIVER_CLASS_OPTIONS).optional().or(z.literal("").transform(() => undefined));

export const addDriverInputSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters."),
  phone: phoneSchema,
  driverClass: driverClassSchema,
  truckNumber: truckNumberSchema,
});

export type AddDriverInput = z.infer<typeof addDriverInputSchema>;

export const updateDriverInputSchema = z.object({
  driverId: z.string().min(1),
  fullName: z.string().trim().min(1, "Full name is required."),
  phone: phoneSchema,
  driverClass: driverClassSchema,
  truckNumber: truckNumberSchema,
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
});

export type UpdateDriverInput = z.infer<typeof updateDriverInputSchema>;

export const setDriverStatusInputSchema = z.object({
  driverId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type SetDriverStatusInput = z.infer<typeof setDriverStatusInputSchema>;
