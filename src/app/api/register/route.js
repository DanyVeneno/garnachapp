import { User } from "@/models/User";
import { connectDatabase } from "@/libs/mongoConnect";
import bcrypt from "bcrypt";

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) {
    return Response.json({ error: "Usa un correo válido y una contraseña de al menos 8 caracteres (máximo 72 bytes)" }, { status: 400 });
  }
  await connectDatabase();
  try {
    const user = await User.create({ email, password: await bcrypt.hash(password, 12) });
    return Response.json({ _id: user._id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) return Response.json({ error: "No se pudo registrar el correo" }, { status: 409 });
    throw error;
  }
}
