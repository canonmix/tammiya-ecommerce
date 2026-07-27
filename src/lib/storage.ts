import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const endpoint = process.env.DIGITALOCEAN_SPACES_ENDPOINT!;
const bucket = process.env.DIGITALOCEAN_SPACES_BUCKET!;
const namespace = process.env.NODE_ENV === "production" ? process.env.DIGITALOCEAN_SPACES_PROD_NAMESPACE! : process.env.DIGITALOCEAN_SPACES_DEV_NAMESPACE!;
const client = new S3Client({ region: "sgp1", endpoint, credentials: { accessKeyId: process.env.DIGITALOCEAN_SPACES_ACCESS_KEY_ID!, secretAccessKey: process.env.DIGITALOCEAN_SPACES_SECRET_ACCESS_KEY! } });

export async function uploadProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image uploads are allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or smaller");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `${namespace}/products/${randomUUID()}.${extension}`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, ACL: "public-read" }));
  return `https://${bucket}.sgp1.digitaloceanspaces.com/${key}`;
}
