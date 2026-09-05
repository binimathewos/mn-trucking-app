"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getNavItemsForRole } from "./nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    fullName: string;
    role: "administrator" | "driver";
    initials: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = getNavItemsForRole(user.role);

  return (
    <>
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="MN Trucking" width={28} height={28} />
          <span className="text-sm font-bold tracking-tight text-white">
            MN TRUCKING
          </span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-900 transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden items-center gap-2.5 px-5 py-6 md:flex">
          <Image
            src="/images/logo.png"
            alt="MN Trucking"
            width={36}
            height={36}
            className="shrink-0"
          />
          <div>
            <p className="text-sm leading-tight font-bold text-white">
              MN TRUCKING
            </p>
            <p className="text-[11px] tracking-widest text-slate-400">
              OPERATIONS
            </p>
          </div>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:py-0"
          aria-label="Primary"
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-slate-400 capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
