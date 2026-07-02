"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Album = { id: number; slug: string; name: string };
type Photo = {
  id: number;
  filename: string;
  thumb_filename: string;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export default function AlbumPage() {
  const { slug } = useParams<{ slug: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAlbum = useCallback(async () => {
    const res = await fetch(`/api/albums/${slug}`);
    if (res.ok) {
      const data = await res.json();
      setAlbum(data.album);
      setPhotos(data.photos);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadAlbum();
    const savedName = localStorage.getItem("uploaderName");
    if (savedName) setUploaderName(savedName);
  }, [loadAlbum]);

  useEffect(() => {
    if (uploaderName) localStorage.setItem("uploaderName", uploaderName);
  }, [uploaderName]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    list.forEach((f) => formData.append("files", f));
    if (uploaderName.trim()) formData.append("uploadedBy", uploaderName.trim());

    try {
      const res = await fetch(`/api/albums/${slug}/photos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await loadAlbum();
      }
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const res = await fetch(`/api/albums/${slug}/photos?photoId=${photo.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setLightbox(null);
    }
  }

  function copyLink() {
    const url = window.location.href;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
      return;
    }

    // HTTP(비보안) 환경의 iOS Safari 등에서는 Clipboard API를 쓸 수 없어 대체 방식 사용.
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("아래 링크를 복사하세요:", url);
    }
    document.body.removeChild(textarea);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        불러오는 중...
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        앨범을 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-50 pb-24"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
      }}
    >
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">{album.name}</h1>
            <p className="text-xs text-zinc-400">사진 {photos.length}장</p>
          </div>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            {copied ? "복사됨!" : "링크 복사"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <input
          type="text"
          placeholder="내 이름 (선택, 업로드한 사람 표시용)"
          value={uploaderName}
          onChange={(e) => setUploaderName(e.target.value)}
          className="mb-4 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`mb-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            dragOver
              ? "border-zinc-500 bg-zinc-100"
              : "border-zinc-300 bg-white hover:bg-zinc-100"
          }`}
        >
          <span className="text-3xl">{uploading ? "⏳" : "＋"}</span>
          <span className="text-sm font-medium text-zinc-600">
            {uploading ? "업로드 중..." : "탭하거나 사진을 끌어다 놓으세요"}
          </span>
        </button>

        {photos.length === 0 ? (
          <p className="mt-16 text-center text-sm text-zinc-400">
            아직 사진이 없어요. 첫 사진을 올려보세요!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/img/${slug}/${photo.thumb_filename}`}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {photo.uploaded_by && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {photo.uploaded_by}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="flex max-h-full max-w-full flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${slug}/${lightbox.filename}`}
              alt=""
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-4 flex items-center gap-3">
              {lightbox.uploaded_by && (
                <span className="text-sm text-zinc-300">
                  업로드: {lightbox.uploaded_by}
                </span>
              )}
              <a
                href={`/api/img/${slug}/${lightbox.filename}`}
                download
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900"
              >
                다운로드
              </a>
              <button
                onClick={() => deletePhoto(lightbox)}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white"
              >
                삭제
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
