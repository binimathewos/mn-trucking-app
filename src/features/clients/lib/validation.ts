import { z } from "zod";

const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;

export const addClientInputSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  contactName: z.string().trim().min(1, "Contact name is required."),
  phone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  address: z.string().trim().min(1, "Address is required."),
});

export type AddClientInput = z.infer<typeof addClientInputSchema>;

export const updateClientInputSchema = addClientInputSchema.extend({
  clientId: z.string().min(1),
});

export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;

export const setClientStatusInputSchema = z.object({
  clientId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type SetClientStatusInput = z.infer<typeof setClientStatusInputSchema>;
