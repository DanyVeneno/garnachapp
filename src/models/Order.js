import { model, models, Schema } from "mongoose";

const OrderSchema = new Schema(
  {
    userEmail: String,
    phone: String,
    streetAddress: String,
    postalCode: String,
    city: String,
    country: String,
    cartProducts: Object,
    amountTotal: Number,
    currency: String,
    stripeSessionId: String,
    paid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Order = models?.Order || model("Order", OrderSchema);
