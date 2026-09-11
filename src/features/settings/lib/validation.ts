import { z } from "zod";

export const updateDefaultHourlyRateInputSchema = z.object({
  defaultHourlyRate: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid, non-negative rate with up to 2 decimal places."),
});

export type UpdateDefaultHourlyRateInput = z.infer<typeof updateDefaultHourlyRateInputSchema>;
