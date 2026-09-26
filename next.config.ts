import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The page itself is static: prerendered to HTML, no server actions. Three
  // route handlers run on the server, which is why this is not
  // output:"export": /api/chat (keeps the NVIDIA key out of the browser),
  // and /api/availability plus /direct-bookings.ics (keep the owner's calendar
  // links out of it; see CALENDAR.md).
  images: { unoptimized: true },
};

export default nextConfig;
