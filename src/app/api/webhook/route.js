import { Order } from "@/models/Order";
import { connectDatabase } from "@/libs/mongoConnect";
import { getStripe } from "@/libs/stripe";

export async function POST(req) {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature"), process.env.STRIPE_SIGN_SECRET);
  } catch {
    return Response.json({ error: "Firma inválida" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const payment = event.data.object;
    const orderId = payment.metadata?.orderId;
    if (!/^[a-f\d]{24}$/i.test(orderId || "")) return Response.json({ error: "Pedido inválido" }, { status: 400 });
    await connectDatabase();
    const order = await Order.findById(orderId);
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
    if ((order.amountTotal != null && order.amountTotal !== payment.amount_total) ||
        (order.currency && order.currency !== payment.currency) ||
        (order.stripeSessionId && order.stripeSessionId !== payment.id)) {
      return Response.json({ error: "El pago no corresponde al pedido" }, { status: 400 });
    }
    await Order.updateOne({ _id: orderId }, { paid: true });
  }
  return Response.json("ok");
}
