import type { Metadata } from "next";
import { HomePage } from "../home";

// The December layer, any day of the year, so it can be looked at before the
// 1st. Not indexed: the canonical page is the home page, which switches by date.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function December() {
  return <HomePage december />;
}
