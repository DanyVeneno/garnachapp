import { authOptions } from "@/libs/auth";
import { connectDatabase } from "@/libs/mongoConnect";
import { getStripe } from "@/libs/stripe";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { getServerSession } from "next-auth";

const validId = id => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const cents = value => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100000) throw new Error("Precio inválido");
  return Math.round(value * 100);
};
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Inicia sesión para pagar" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!Array.isArray(body?.cartProducts) || body.cartProducts.length < 1 || body.cartProducts.length > 100) {
    return Response.json({ error: "Carrito inválido" }, { status: 400 });
  }
  const address = {};
  for (const field of ["phone", "streetAddress", "postalCode", "city", "country"]) {
    const value = body.address?.[field];
    if (typeof value !== "string" || !value.trim() || value.length > 300) return Response.json({ error: "Dirección incompleta" }, { status: 400 });
    address[field] = value.trim();
  }
  await connectDatabase();
  const cartProducts = [];
  const lineItems = [];
  let amountTotal = 500;
  try {
    for (const input of body.cartProducts) {
      if (!input || !validId(input._id)) throw new Error("Producto inválido");
      const product = await MenuItem.findById(input._id).lean();
      if (!product) throw new Error("Producto no disponible");
      let amount = cents(product.basePrice);
      let size = null;
      if (input.size) {
        const selected = product.sizes?.find(option => option._id.toString() === input.size._id);
        if (!selected) throw new Error("Tamaño inválido");
        amount += cents(selected.price);
        size = { _id: selected._id.toString(), name: selected.name, price: cents(selected.price) / 100 };
      }
      if (input.extras !== undefined && (!Array.isArray(input.extras) || input.extras.length > 30)) throw new Error("Extras inválidos");
      const extras = [];
      const seen = new Set();
      for (const extra of input.extras || []) {
        if (!extra || seen.has(extra._id)) throw new Error("Extra inválido o repetido");
        seen.add(extra._id);
        const selected = product.extraIngredientPrices?.find(option => option._id.toString() === extra._id);
        if (!selected) throw new Error("Extra no disponible");
        amount += cents(selected.price);
        extras.push({ _id: selected._id.toString(), name: selected.name, price: cents(selected.price) / 100 });
      }
      cartProducts.push({ _id: product._id.toString(), name: product.name, image: product.image, basePrice: cents(product.basePrice) / 100, size, extras });
      lineItems.push({ quantity: 1, price_data: { currency: "usd", product_data: { name: product.name }, unit_amount: amount } });
      amountTotal += amount;
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  const baseUrl = new URL(process.env.NEXTAUTH_URL);
  const stripe = getStripe();
  const order = await Order.create({ ...address, userEmail: session.user.email, cartProducts, paid: false, amountTotal, currency: "usd" });
  const stripeSession = await stripe.checkout.sessions.create({
    line_items: lineItems, mode: "payment", customer_email: session.user.email,
    success_url: new URL("orders/" + order._id + "?clear-cart=1", baseUrl.href.endsWith("/") ? baseUrl : baseUrl.href + "/").href,
    cancel_url: new URL("cart?canceled=1", baseUrl.href.endsWith("/") ? baseUrl : baseUrl.href + "/").href,
    metadata: { orderId: order._id.toString() },
    payment_intent_data: { metadata: { orderId: order._id.toString() } },
    shipping_options: [{ shipping_rate_data: { display_name: "Delivery fee", type: "fixed_amount", fixed_amount: { amount: 500, currency: "usd" } } }],
  }, { idempotencyKey: "checkout-" + order._id.toString() });
  await Order.updateOne({ _id: order._id }, { stripeSessionId: stripeSession.id });
  return Response.json(stripeSession.url);
}
