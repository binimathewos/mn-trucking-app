"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ClientsSearchBarProps {
  currentSearch?: string;
}

export function ClientsSearchBar({ currentSearch }: ClientsSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch ?? "");

  function applySearch() {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            applySearch();
          }
        }}
        onBlur={applySearch}
        placeholder="Search clients"
        className="w-full pl-8 sm:w-56"
      />
    </div>
  );
}
