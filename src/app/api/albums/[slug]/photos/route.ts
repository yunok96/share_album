import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { customAlphabet } from "nanoid";
import sharp from "sharp";
import db, { Album } from "@/lib/db";
import { albumDir } from "@/lib/storage";

const generateId = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  12
);

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const album = db
    .prepare("SELECT * FROM albums WHERE slug = ?")
    .get(slug) as Album | undefined;

  if (!album) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다." }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const uploadedBy = formData.get("uploadedBy");

  if (files.length === 0) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  const dir = albumDir(slug);
  const insert = db.prepare(
    `INSERT INTO photos (album_id, filename, thumb_filename, width, height, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const created = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) continue;
    if (file.size > 30 * 1024 * 1024) continue; // 30MB 제한

    const id = generateId();
    const buffer = Buffer.from(await file.arrayBuffer());

    let image = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await image.metadata();

    const origFilename = `${id}.jpg`;
    const thumbFilename = `${id}-thumb.jpg`;

    await image
      .jpeg({ quality: 88 })
      .toFile(path.join(dir, origFilename));

    await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(path.join(dir, thumbFilename));

    const result = insert.run(
      album.id,
      origFilename,
      thumbFilename,
      metadata.width ?? null,
      metadata.height ?? null,
      typeof uploadedBy === "string" && uploadedBy.trim() ? uploadedBy.trim() : null
    );

    created.push(
      db.prepare("SELECT * FROM photos WHERE id = ?").get(result.lastInsertRowid)
    );
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "지원하지 않는 파일 형식이거나 크기가 너무 큽니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({ photos: created });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  const album = db
    .prepare("SELECT * FROM albums WHERE slug = ?")
    .get(slug) as Album | undefined;

  if (!album || !photoId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const photo = db
    .prepare("SELECT * FROM photos WHERE id = ? AND album_id = ?")
    .get(photoId, album.id) as { filename: string; thumb_filename: string } | undefined;

  if (!photo) {
    return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });
  }

  const dir = albumDir(slug);
  await fs.rm(path.join(dir, photo.filename), { force: true });
  await fs.rm(path.join(dir, photo.thumb_filename), { force: true });
  db.prepare("DELETE FROM photos WHERE id = ?").run(photoId);

  return NextResponse.json({ ok: true });
}
