import photos from "@/lib/photos.json";

export type PhotoSlug = keyof typeof photos;
type Meta = { alt: string; caption: string; width: number; height: number; aspect: number; widths: number[]; blur: string; from: string };
export const photoData = photos as Record<string, Meta>;

/**
 * Renders one art-directed crop from the build-time photo set.
 *
 * These derivatives are produced by `scripts/build-photos.mjs` — AVIF, WebP and
 * a mozjpeg fallback at four widths, plus an inline blur placeholder. They are
 * deliberately served as a plain <picture> rather than through next/image:
 * the encodes are already optimal, Next 16 clamps `images.qualities` to [75],
 * and this way there is no image-optimizer request on the critical path.
 */
export function Photo({
  slug,
  sizes,
  priority = false,
  className = "",
  imgClassName = "",
  style,
}: {
  slug: PhotoSlug | string;
  /** Real layout width at each breakpoint — wrong values here cost bandwidth. */
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
}) {
  const p = photoData[slug];
  if (!p) throw new Error(`Photo "${slug}" is not in photos.json — run scripts/build-photos.mjs`);

  const srcset = (ext: string) => p.widths.map((w) => `/gallery/${slug}-${w}.${ext} ${w}w`).join(", ");
  const largest = p.widths[0];

  return (
    <picture className={className} style={style}>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
      <img
        src={`/gallery/${slug}-${largest}.jpg`}
        srcSet={srcset("jpg")}
        sizes={sizes}
        alt={p.alt}
        width={p.width}
        height={p.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={imgClassName}
        style={{
          backgroundImage: `url("${p.blur}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </picture>
  );
}
