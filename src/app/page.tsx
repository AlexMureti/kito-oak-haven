import { HomePage } from "./home";
import { isDecemberSeason } from "@/lib/season";

// Rendered again at most once an hour, so the December layer (src/lib/season.ts)
// switches itself on and off by date without a deploy. The page is otherwise
// exactly as static as before.
export const revalidate = 3600;

export default function Home() {
  return <HomePage december={isDecemberSeason()} />;
}
