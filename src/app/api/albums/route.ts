import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import db, { Album } from "@/lib/db";

const generateSlug = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  8
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "새 앨범";

  let slug = generateSlug();
  const insert = db.prepare(
    "INSERT INTO albums (slug, name) VALUES (?, ?)"
  );

  // Extremely unlikely collision, but retry a few times just in case.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      insert.run(slug, name);
      break;
    } catch {
      slug = generateSlug();
      if (attempt === 4) {
        return NextResponse.json({ error: "앨범 생성에 실패했습니다." }, { status: 500 });
      }
    }
  }

  const album = db
    .prepare("SELECT * FROM albums WHERE slug = ?")
    .get(slug) as Album;

  return NextResponse.json({ album });
}
