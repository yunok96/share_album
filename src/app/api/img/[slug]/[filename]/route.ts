import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { uploadsRoot } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> }
) {
  const { slug, filename } = await params;

  // Prevent path traversal — only allow simple filenames we generated ourselves.
  if (!/^[a-zA-Z0-9-]+\.jpg$/.test(filename) || !/^[a-zA-Z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const filePath = path.join(uploadsRoot, slug, filename);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
