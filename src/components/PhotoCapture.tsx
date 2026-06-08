import { useRef, useState } from "react";
import { Camera, Image, X, Loader2 } from "lucide-react";
import { fileToDataUrl, generateThumbnail, savePhoto } from "@/lib/photoStore";
import type { PhotoRecord } from "@/types";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  surveyId?: string;
  speciesId?: string;
  onPhotoAdded: (photo: PhotoRecord) => void;
  className?: string;
  compact?: boolean;
}

export default function PhotoCapture({
  surveyId,
  speciesId,
  onPhotoAdded,
  className,
  compact = false,
}: PhotoCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        const [dataUrl, thumbnailUrl] = await Promise.all([
          fileToDataUrl(file),
          generateThumbnail(file, 300),
        ]);

        const photo = await savePhoto({
          surveyId,
          speciesId,
          dataUrl,
          thumbnailUrl,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        });

        onPhotoAdded(photo);
      }
    } catch (err) {
      console.error("Failed to process photos:", err);
      alert("照片处理失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerAlbum = () => {
    albumInputRef.current?.click();
  };

  if (uploading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 text-ocean-300",
          compact ? "p-2" : "p-4 card-glass border-dashed border-2",
          className
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">正在处理照片...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex gap-1", className)}>
        <button
          onClick={triggerCamera}
          className="p-2 rounded-lg bg-ocean-700/40 hover:bg-ocean-600/50 text-ocean-200 transition-colors"
          title="拍照"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          onClick={triggerAlbum}
          className="p-2 rounded-lg bg-ocean-700/40 hover:bg-ocean-600/50 text-ocean-200 transition-colors"
          title="从相册选择"
        >
          <Image className="w-4 h-4" />
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "card-glass border-dashed border-2 p-6 text-center",
        className
      )}
    >
      <div className="text-ocean-300 mb-4">添加现场照片</div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={triggerCamera}
          className="btn-primary flex-1 max-w-[180px]"
        >
          <Camera className="w-5 h-5" />
          拍照
        </button>
        <button
          onClick={triggerAlbum}
          className="btn-secondary flex-1 max-w-[180px]"
        >
          <Image className="w-5 h-5" />
          相册
        </button>
      </div>
      <p className="text-xs text-ocean-500 mt-3">
        照片将存储在本地设备中
      </p>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
