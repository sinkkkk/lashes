"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Kalender", icon: "M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" },
  { href: "/admin/bookings", label: "Broneeringud", icon: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" },
  { href: "/admin/services", label: "Teenused", icon: "M4 10c4 6 12 6 16 0M7 13l-1.5 3M12 14.5V18M17 13l1.5 3" },
  { href: "/admin/reviews", label: "Arvustused", icon: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" },
  { href: "/admin/settings", label: "Seaded", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-4 md:mb-4 md:gap-1 md:rounded-full md:border md:p-1">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] md:flex-row md:justify-center md:gap-2 md:rounded-full md:text-sm ${
              active ? "text-ink md:bg-ink md:text-white" : "text-muted"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={i.icon} />
            </svg>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
