'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";


const Nav = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: "/outfits", label: "Outfits", auth: true },
    { href: "/wardrobe", label: "Wardrobe", auth: true },
    { href: "/add-item", label: "Add Item", auth: true },
    { href: "/planner", label: "Planner", auth: true },
    { href: "/remove-background", label: "Remove Background", auth: true },
    { href: "/stats", label: "Stats", auth: true },
    { href: "/profile", label: "Profile", auth: true },
    { href: "/account", label: "Account", auth: true },
  ];

  const visibleItems = user ? navItems.filter(item => item.auth) : [];


  return (
    <nav className="hidden md:flex items-center gap-2">
      {visibleItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? "secondary" : "ghost"}
          className={cn(
            "font-headline",
            pathname === item.href && "font-bold text-primary"
          )}
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  );
};

export default Nav;
