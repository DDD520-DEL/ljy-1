import { useState } from "react";
import { X, Trash2, ZoomIn } from "lucide-react";
import type { PhotoRecord } from "@/types";
import { cn } from "@/lib/utils";

interface PhotoGridProps {
  photos: PhotoRecord[];
  onDelete?: (photoId: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showDelete?: boolean;
}

export default function PhotoGrid({
  photos,
  onDelete,
  className,
  size = "md",
  showDelete = true,
}: PhotoGridProps) {
  const [viewerPhoto, setViewerPhoto] = useState<PhotoRecord | null>(null);

  if (photos.length === 0) return null;

  const sizeClass = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }[size];

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={cn(
              "relative group rounded-lg overflow-hidden border border-ocean-700/40 bg-ocean-900/50",
              sizeClass
            )}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption || photo.fileName}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setViewerPhoto(photo)}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setViewerPhoto(photo)}
                className="p-1.5 rounded-lg bg-ocean-700/80 text-white hover:bg-ocean-600 transition-colors"
                title="查看大图"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {showDelete && onDelete && (
                <button
                  onClick={() => {
                    if (confirm("确定删除这张照片吗？")) {
                      onDelete(photo.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-500 transition-colors"
                  title="删除照片"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {viewerPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewerPhoto(null)}
        >
          <button
            onClick={() => setViewerPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={viewerPhoto.dataUrl}
            alt={viewerPhoto.caption || viewerPhoto.fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {viewerPhoto.caption && (
            <div className="absolute bottom-8 left-0 right-0 text-center text-white text-sm">
              {viewerPhoto.caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}
