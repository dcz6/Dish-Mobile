import { useLocation, Link } from "wouter";
import { Camera, Image, Receipt, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", label: "Capture", icon: Camera },
  { path: "/dishes", label: "Dishes", icon: Image },
  { path: "/receipts", label: "Receipts", icon: Receipt },
  { path: "/stats", label: "Stats", icon: BarChart3 },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
