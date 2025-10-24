'use client';

import Link from "next/link";
import Logo from "@/components/icons/Logo";
import Nav from "@/components/layout/Nav";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User as UserIcon, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

const Header = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  }
  
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
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/outfits" className="flex items-center gap-2 group">
            <Logo className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <h1 className="text-2xl font-bold font-headline text-primary">
              StylGPT Wardrobe
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Nav />
            {loading ? (
                <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
            ) : user ? (
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/account">
                            <UserIcon />
                            <span className="sr-only">Account</span>
                        </Link>
                    </Button>
                     <Button onClick={handleSignOut} variant="outline" className="hidden sm:flex">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            ) : (
                 <Button asChild variant="outline">
                    <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Login
                    </Link>
                </Button>
            )}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <nav className="grid gap-4 py-6">
                    {visibleItems.map((item) => (
                      <Link key={item.href} href={item.href} className="text-lg font-medium">
                        {item.label}
                      </Link>
                    ))}
                    {user && (
                       <Button onClick={handleSignOut} variant="outline" className="w-full mt-4">
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
