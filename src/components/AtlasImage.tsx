import { useState } from "react";
import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtlasImage as AtlasImageType } from "@/types";

interface AtlasImageProps {
  image?: AtlasImageType | null;
  alt: string;
  className?: string;
  phylum?: string;
  commonName?: string;
  scientificName?: string;
}

export default function AtlasImage({
  image,
  alt,
  className,
  phylum,
  commonName,
  scientificName,
}: AtlasImageProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const src = image?.src;
  const fallback = image?.fallback;

  if (!src || errored) {
    if (fallback) {
      return (
        <img
          src={fallback}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
        />
      );
    }
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center text-ocean-600 bg-ocean-950",
          className
        )}
      >
        <Waves className="w-1/3 h-1/3" />
      </div>
    );
  }

  return (
    <>
      {!loaded && fallback && (
        <img
          src={fallback}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 w-full h-full object-cover -z-0 opacity-100 transition-opacity duration-200",
            loaded && "opacity-0"
          )}
        />
      )}
      {!loaded && !fallback && (
        <div
          className={cn(
            "absolute inset-0 w-full h-full flex items-center justify-center text-ocean-600 bg-ocean-950 -z-0",
            className
          )}
        >
          <Waves className="w-1/3 h-1/3 animate-pulse" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        title={commonName ? `${commonName}${scientificName ? ` · ${scientificName}` : ""}` : alt}
        onError={() => setErrored(true)}
        onLoad={() => setLoaded(true)}
        className={cn("w-full h-full object-cover relative z-10", className)}
        loading="lazy"
      />
    </>
  );
}
