import { useEffect, useState, useCallback } from "react";
import { Bell, Search, User, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface HeaderProps {
  onMobileMenuOpen?: () => void;
}

export const Header = ({ onMobileMenuOpen }: HeaderProps) => {
  const navigate = useNavigate();

  const storedUser = getStoredUser();
  const userName = storedUser?.name ?? "Admin User";
  const userRole = storedUser?.role ?? "Operations Manager";

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/notifications/stats");
      setUnreadCount(Number(res.data.data?.unread ?? 0));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="h-16 bg-card/50 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 relative">

      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onMobileMenuOpen}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Brand label — mobile only, hidden when search overlay is open */}
        {!searchOpen && (
          <span className="lg:hidden font-bold text-foreground text-sm select-none">
            ISMS
          </span>
        )}
      </div>

      {/* Center: Search bar
          - Desktop (lg+): always visible, grows naturally
          - Mobile: hidden behind icon; tapping expands a full-width overlay  */}
      <div
        className={[
          // Mobile overlay when open
          searchOpen
            ? "absolute inset-0 z-20 flex items-center gap-2 px-4 bg-card/95 backdrop-blur-xl lg:static lg:bg-transparent lg:backdrop-blur-none lg:px-0 lg:inset-auto"
            : "hidden",
          // Always visible on lg+
          "lg:flex flex-1 max-w-sm md:max-w-md lg:max-w-lg",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search incidents, personnel, sites..."
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 w-full"
            autoFocus={searchOpen}
            onBlur={() => {
              // small delay so clicking the ✕ button still fires
              setTimeout(() => setSearchOpen(false), 150);
            }}
          />
        </div>
        {/* Close button — only in mobile overlay */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
        {/* Search icon — mobile only, hidden when overlay is open */}
        {!searchOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}

        {/* Live status badge — hidden on xs */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-success whitespace-nowrap">System Online</span>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/notifications")}
          title="View notifications"
        >
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
            <button className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-border outline-none">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              {/* Name + role — hidden below md */}
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground font-normal capitalize">{userRole}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};