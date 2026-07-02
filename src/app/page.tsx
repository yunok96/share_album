"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      router.push(`/album/${data.album.slug}`);
    } catch {
      setError("앨범을 만들지 못했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 text-center">
          📷 공유 앨범
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          앨범을 만들고 링크를 공유하면 누구나 사진을 올리고 볼 수 있어요.
        </p>

        <form onSubmit={createAlbum} className="mt-8 flex flex-col gap-3">
          <input
            type="text"
            placeholder="앨범 이름 (예: 제주도 여행)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "만드는 중..." : "새 앨범 만들기"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
