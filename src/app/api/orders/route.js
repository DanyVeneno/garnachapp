import { authOptions, isAdmin } from "@/libs/auth";
import { connectDatabase } from "@/libs/mongoConnect";
import { Order } from "@/models/Order";
import { getServerSession } from "next-auth";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("_id");
  if (id && !/^[a-f\d]{24}$/i.test(id)) return Response.json({ error: "ID inválido" }, { status: 400 });
  await connectDatabase();
  const admin = await isAdmin(session);
  if (id) {
    const order = await Order.findOne({ _id: id, ...(admin ? {} : { userEmail: session.user.email }) });
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
    return Response.json(order);
  }
  return Response.json(await Order.find(admin ? {} : { userEmail: session.user.email }));
}
