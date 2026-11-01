import { isAdmin } from "@/libs/auth";
import { User } from "@/models/User";
import { connectDatabase } from "@/libs/mongoConnect";

export async function GET() {
  await connectDatabase();
  if (await isAdmin()) {
    const users = await User.find();
    return Response.json(users);
  } else {
    return Response.json([]);
  }
}
