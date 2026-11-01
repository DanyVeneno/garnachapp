import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDatabase, getMongoClient } from "@/libs/mongoConnect";
import { User } from "@/models/User";
import { UserInfo } from "@/models/UserInfo";

export const authOptions = {
  secret: process.env.SECRET,
  adapter: MongoDBAdapter(getMongoClient),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        if (!email || typeof password !== "string") return null;
        await connectDatabase();
        const user = await User.findOne({ email }).select("+password");
        if (!user?.password || !await bcrypt.compare(password, user.password)) return null;
        return { id: user._id.toString(), name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
};
export async function isAdmin(session) {
  const currentSession = session ?? await getServerSession(authOptions);
  if (!currentSession?.user?.email) return false;
  await connectDatabase();
  const info = await UserInfo.findOne({ email: currentSession.user.email }).lean();
  return info?.admin === true;
}
