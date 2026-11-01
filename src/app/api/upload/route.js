import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

const maxBytes = 5 * 1024 * 1024;
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  if (Number(req.headers?.get("content-length")) > maxBytes + 65536) {
    return Response.json({ error: "Carga demasiado grande" }, { status: 413 });
  }
  const data = await req.formData();
  const file = data.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return Response.json({ error: "Falta la imagen" }, { status: 400 });
  if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: "La imagen debe pesar menos de 5 MB" }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? ["image/png", "png"]
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? ["image/jpeg", "jpg"]
    : buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? ["image/webp", "webp"] : null;
  if (!type || file.type !== type[0]) return Response.json({ error: "Solo se permiten imágenes PNG, JPEG o WebP válidas" }, { status: 400 });
  const bucket = process.env.AWS_S3_BUCKET || "garnachapp";
  const key = randomUUID() + "." + type[1];
  const client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: { accessKeyId: process.env.MY_AWS_ACCESS_KEY, secretAccessKey: process.env.MY_AWS_SECRET_KEY },
  });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, ACL: "public-read", ContentType: type[0], Body: buffer }));
  return Response.json("https://" + bucket + ".s3.amazonaws.com/" + key);
}
