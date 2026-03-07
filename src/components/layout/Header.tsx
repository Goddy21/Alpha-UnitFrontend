// src/components/Header.tsx
import { useEffect, useState, useCallback } from "react";
import {
  Bell, Search, User, ChevronDown, LogOut, Menu, X, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// ── Role accent colours (border + avatar gradient) ────────────────────────────
const ROLE_COLOURS: Record<string, { border: string; gradient: string; text: string }> = {
  "Admin":               { border: "border-destructive/40",  gradient: "from-destructive/20 to-destructive/10",  text: "text-destructive" },
  "Managing Director":   { border: "border-purple-500/40",   gradient: "from-purple-500/20 to-purple-500/10",    text: "text-purple-400" },
  "Director Logistics":  { border: "border-primary/40",      gradient: "from-primary/20 to-accent/20",          text: "text-primary" },
  "HR Manager":          { border: "border-pink-500/40",     gradient: "from-pink-500/20 to-pink-500/10",        text: "text-pink-400" },
  "Finance Manager":     { border: "border-amber-500/40",    gradient: "from-amber-500/20 to-amber-500/10",      text: "text-amber-400" },
  "Operations Manager":  { border: "border-blue-500/40",     gradient: "from-blue-500/20 to-blue-500/10",        text: "text-blue-400" },
  "Supervisor":          { border: "border-success/40",      gradient: "from-success/20 to-success/10",          text: "text-success" },
  "Guard":               { border: "border-border",          gradient: "from-secondary to-muted",                text: "text-muted-foreground" },
};

const DEFAULT_COLOUR = ROLE_COLOURS["Guard"];

// ── Props ─────────────────────────────────────────────────────────────────────
interface HeaderProps {
  onMobileMenuOpen?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const Header = ({ onMobileMenuOpen }: HeaderProps) => {
  const navigate = useNavigate();
  const { role, user } = usePermissions();

  const userName   = user?.name  ?? "User";
  const userRole   = role        ?? "Guard";
  const colours    = ROLE_COLOURS[userRole] ?? DEFAULT_COLOUR;

  // Initials from name (up to 2 chars)
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchOpen,  setSearchOpen]  = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/notifications/stats");
      setUnreadCount(Number(res.data.data?.unread ?? 0));
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="h-16 bg-card/50 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 relative">

      {/* ── Left: hamburger + brand ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onMobileMenuOpen} aria-label="Open navigation menu">
          <Menu className="w-5 h-5" />
        </Button>
        {!searchOpen && (
          <span className="lg:hidden font-bold text-foreground text-sm select-none">ISMS</span>
        )}
      </div>

      {/* ── Center: search ── */}
      <div className={cn(
        // mobile overlay when open
        searchOpen
          ? "absolute inset-0 z-20 flex items-center gap-2 px-4 bg-card/95 backdrop-blur-xl lg:static lg:bg-transparent lg:backdrop-blur-none lg:px-0 lg:inset-auto"
          : "hidden",
        // always visible lg+
        "lg:flex flex-1 max-w-sm md:max-w-md lg:max-w-lg"
      )}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search incidents, personnel, sites…"
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 w-full"
            autoFocus={searchOpen}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0"
          onClick={() => setSearchOpen(false)} aria-label="Close search">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">

        {/* Search icon — mobile only */}
        {!searchOpen && (
          <Button variant="ghost" size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search className="w-5 h-5" />
          </Button>
        )}

        {/* System status — hidden on xs */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-success whitespace-nowrap">System Online</span>
        </div>

        {/* Notifications bell */}
        <Button variant="ghost" size="icon" className="relative"
          onClick={() => navigate("/notifications")} title="View notifications">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-border outline-none group">
              {/* Avatar — shows initials, coloured by role */}
              <div className={cn(
                "w-9 h-9 rounded-lg bg-gradient-to-br border flex items-center justify-center flex-shrink-0 transition-opacity group-hover:opacity-80",
                colours.gradient, colours.border
              )}>
                <span className={cn("text-xs font-bold", colours.text)}>{initials}</span>
              </div>

              {/* Name + role — hidden below md */}
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                <p className={cn("text-xs font-medium leading-tight", colours.text)}>{userRole}</p>
              </div>

              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="pb-2">
              {/* Role badge inside dropdown */}
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-8 h-8 rounded-md bg-gradient-to-br border flex items-center justify-center flex-shrink-0",
                  colours.gradient, colours.border
                )}>
                  <span className={cn("text-xs font-bold", colours.text)}>{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{userName}</p>
                  <p className={cn("text-xs font-medium truncate", colours.text)}>{userRole}</p>
                </div>
              </div>
              {user?.department && (
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  {user.department}
                </p>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout}
              className="text-destructive focus:text-destructive gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};