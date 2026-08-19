import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Required by output: "export" — tells Next this route is generated at build
// time rather than per request.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
