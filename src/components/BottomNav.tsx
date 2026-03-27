import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, BarChart3, Target, Plus } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: BookOpen, label: "Journal", path: "/journal" },
  { icon: null, label: "", path: "" }, // center placeholder
  { icon: BarChart3, label: "Insights", path: "/insights" },
  { icon: Target, label: "Goals", path: "/goals" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: "var(--mindark-nav-bg)",
        borderTop: "1px solid var(--mindark-card-border)",
      }}
    >
      <div className="flex items-end justify-around px-2 pb-5 pt-2">
        {navItems.map((item, i) => {
          if (i === 2) {
            // Center + button
            return (
              <button
                key="add"
                onClick={() => navigate("/journal/new")}
                className="relative -mt-6 flex flex-col items-center"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                  style={{
                    borderColor: "var(--mindark-card-border)",
                    background: "var(--mindark-bg)",
                  }}
                >
                  <Plus className="w-7 h-7 text-foreground" />
                </div>
              </button>
            );
          }

          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon!;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 min-w-[56px]"
            >
              <Icon
                className="w-6 h-6"
                style={{
                  color: isActive ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.4)",
                }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: isActive ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.4)",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
