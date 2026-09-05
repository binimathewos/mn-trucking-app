"use client";

import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { navItems } from "./nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavProps {
  user: {
    initials: string;
  };
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const currentPage =
    navItems.find(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
    )?.label ?? "Dashboard";

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3.5 md:px-8">
      <h1 className="text-base font-semibold text-foreground">{currentPage}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Open user menu"
        >
          <Avatar>
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
