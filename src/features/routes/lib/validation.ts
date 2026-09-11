import { z } from "zod";

/** Date-only (`YYYY-MM-DD`, as produced by an `<input type="date">`) — no time component. */
const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Enter a valid date." });

const optionalDateOnlySchema = dateOnlySchema
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createRouteInputSchema = z.object({
  clientId: z.string().min(1, "Select a client."),
  pickupAddress: z.string().trim().min(1, "Pickup address is required."),
  deliveryAddress: z.string().trim().min(1, "Delivery address is required."),
  pickupAt: dateOnlySchema,
  deliveryAt: optionalDateOnlySchema,
  driverId: optionalTextSchema,
  referenceNumber: optionalTextSchema,
  notes: optionalTextSchema,
});

export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;

export const updateRouteInputSchema = z.object({
  routeId: z.string().min(1),
  clientId: z.string().min(1, "Select a client."),
  pickupAddress: z.string().trim().min(1, "Pickup address is required."),
  deliveryAddress: z.string().trim().min(1, "Delivery address is required."),
  pickupAt: dateOnlySchema,
  deliveryAt: optionalDateOnlySchema,
  referenceNumber: optionalTextSchema,
  notes: optionalTextSchema,
});

export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;

export const assignDriverInputSchema = z.object({
  routeId: z.string().min(1),
  driverId: z.string().min(1, "Select a driver."),
});

export type AssignDriverInput = z.infer<typeof assignDriverInputSchema>;

export const setRouteStatusInputSchema = z.object({
  routeId: z.string().min(1),
  status: z.enum(["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]),
});

export type SetRouteStatusInput = z.infer<typeof setRouteStatusInputSchema>;
