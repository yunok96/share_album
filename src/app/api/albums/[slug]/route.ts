import { NextRequest, NextResponse } from "next/server";
import db, { Album, Photo } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const album = db
    .prepare("SELECT * FROM albums WHERE slug = ?")
    .get(slug) as Album | undefined;

  if (!album) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다." }, { status: 404 });
  }

  const photos = db
    .prepare("SELECT * FROM photos WHERE album_id = ? ORDER BY created_at DESC")
    .all(album.id) as Photo[];

  return NextResponse.json({ album, photos });
}
