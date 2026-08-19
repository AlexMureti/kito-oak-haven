import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  pool: (
    <>
      <path d="M3 16c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" />
      <path d="M3 20c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" />
      <path d="M8 14V5a2 2 0 0 1 4 0M14 14V5" />
    </>
  ),
  wifi: (
    <>
      <path d="M4.5 12a10.5 10.5 0 0 1 15 0" />
      <path d="M8 15.3a5.6 5.6 0 0 1 8 0" />
      <circle cx="12" cy="18.8" r="1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.6" />
      <path d="M8.5 21h7" />
    </>
  ),
  kitchen: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <circle cx="8" cy="11" r="1.7" />
      <circle cx="16" cy="11" r="1.7" />
    </>
  ),
  drop: <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />,
  washer: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="13" r="4.4" />
      <circle cx="8" cy="6.5" r=".6" />
      <circle cx="11" cy="6.5" r=".6" />
    </>
  ),
  bed: (
    <>
      <path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <path d="M3 15h18" />
      <path d="M3 19v1.5M21 19v1.5" />
      <path d="M7 11V9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  star: <path d="M12 3l2.6 5.6 6 .7-4.4 4.2 1.2 6L12 16.9 6.6 19.5l1.2-6L3.4 9.5l6-.9z" />,
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M12 3a8.7 8.7 0 0 0-7.5 13.1L3.2 21l5-1.3A8.7 8.7 0 1 0 12 3z" />
      <path d="M9 8.4c-.3 0-.6.1-.8.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.8 4.3 3.8 2.1.8 2.6.7 3 .6.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.4-.3-.2-1.5-.8-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8.9-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.5H9z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 5.5L20 7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.6 19.5a5.4 5.4 0 0 1 10.8 0" />
      <path d="M15.5 5.3a3.1 3.1 0 0 1 0 5.4M16.6 19.5a5.4 5.4 0 0 0-1.8-4" />
    </>
  ),
  check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}
