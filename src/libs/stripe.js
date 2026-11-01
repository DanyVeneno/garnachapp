import Stripe from "stripe";

let client;
export function getStripe() {
  if (!process.env.STRIPE_SK) throw new Error("Missing STRIPE_SK");
  // Preserve the API contract used by the previous Stripe 14 integration.
  return client ??= new Stripe(process.env.STRIPE_SK, { apiVersion: "2023-10-16" });
}
