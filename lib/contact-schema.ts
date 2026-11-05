import { z } from "zod";
// Shared by the browser form and the Worker API (server is the authority).
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email").max(120),
  subject: z.string().trim().max(120, "Subject is too long").optional().default(""),
  message: z.string().trim().min(10, "Tell me a little more (10+ characters)").max(4000, "Message is too long"),
  website: z.string().max(0).optional().default(""), // honeypot: humans never see it
  elapsedMs: z.number().int().nonnegative().optional().default(0),
});
export type ContactInput = z.infer<typeof contactSchema>;
