import { authOptions, isAdmin } from "@/libs/auth";
import { connectDatabase } from "@/libs/mongoConnect";
import { User } from "@/models/User";
import { UserInfo } from "@/models/UserInfo";
import { getServerSession } from "next-auth";

const infoFields = ["phone", "streetAddress", "postalCode", "city", "country"];
const validId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

async function targetUser(id, session) {
  await connectDatabase();
  const user = await User.findOne(id ? { _id: id } : { email: session.user.email }).lean();
  if (!user) return { error: Response.json({ error: "Usuario no encontrado" }, { status: 404 }) };
  if (user.email !== session.user.email && !await isAdmin(session)) {
    return { error: Response.json({ error: "Acceso denegado" }, { status: 403 }) };
  }
  return { user };
}
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("_id");
  if (id && !validId(id)) return Response.json({ error: "ID inválido" }, { status: 400 });
  const { user, error } = await targetUser(id, session);
  if (error) return error;
  const info = await UserInfo.findOne({ email: user.email }).lean();
  const response = { _id: user._id, name: user.name, email: user.email, image: user.image, admin: info?.admin === true };
  for (const key of infoFields) response[key] = info?.[key] ?? "";
  return Response.json(response);
}
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  let data;
  try { data = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data) || (data._id && !validId(data._id))) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  for (const key of ["name", "image", ...infoFields]) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || data[key].length > 2048)) {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }
  }
  const { user, error } = await targetUser(data._id, session);
  if (error) return error;
  const admin = await isAdmin(session);
  if (data.admin !== undefined && !admin) return Response.json({ error: "No puedes cambiar permisos" }, { status: 403 });
  if (data.admin !== undefined && typeof data.admin !== "boolean") return Response.json({ error: "Permiso inválido" }, { status: 400 });
  const updates = Object.fromEntries(infoFields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  if (admin && data.admin !== undefined) updates.admin = data.admin;
  const basic = Object.fromEntries(["name", "image"].filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  if (Object.keys(basic).length) await User.updateOne({ _id: user._id }, { $set: basic }, { runValidators: true });
  if (Object.keys(updates).length) await UserInfo.findOneAndUpdate({ email: user.email }, { $set: updates }, { upsert: true, runValidators: true });
  return Response.json(true);
}
