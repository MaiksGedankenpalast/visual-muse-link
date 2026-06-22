import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, BookOpen, BarChart3, FlaskConical, Plus, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { haptic } from "@/lib/haptics";

const NAV_KEYS: { icon: any; labelKey: string; path: string }[] = [
  { icon: Home, labelKey: "Home", path: "/home" },
  { icon: BookOpen, labelKey: "Journal", path: "/journal" },
  { icon: null, labelKey: "", path: "" },
  { icon: BarChart3, labelKey: "Insights", path: "/insights" },
  { icon: FlaskConical, labelKey: "Experiment", path: "/experiment" },
];

const BottomNav = () => {
  const { t } = useTranslation();
  const navItems = NAV_KEYS;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const quickActions = [
    { label: t("📝 Tagebuch schreiben"), path: "/journal/new" },
    { label: t("💜 Mood eintragen"), path: "/moodtracker" },
  ];

  // Update indicator position when route changes
  useLayoutEffect(() => {
    const activeIndex = navItems.findIndex(
      (item, i) => i !== 2 && item.path && location.pathname.startsWith(item.path),
    );
    if (activeIndex === -1) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }
    const el = itemRefs.current[activeIndex];
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const elRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const indicatorWidth = 22;
    const left = elRect.left - parentRect.left + elRect.width / 2 - indicatorWidth / 2;
    setIndicator({ left, width: indicatorWidth, visible: true });
  }, [location.pathname]);

  // Recalculate on resize
  useEffect(() => {
    const handler = () => {
      const activeIndex = navItems.findIndex(
        (item, i) => i !== 2 && item.path && location.pathname.startsWith(item.path),
      );
      if (activeIndex === -1) return;
      const el = itemRefs.current[activeIndex];
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const indicatorWidth = 22;
      const left = elRect.left - parentRect.left + elRect.width / 2 - indicatorWidth / 2;
      setIndicator({ left, width: indicatorWidth, visible: true });
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [location.pathname]);

  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
        style={{
          background: "var(--mindark-nav-bg)",
          borderTop: "1px solid var(--mindark-card-border)",
        }}
      >
        <div
          className="relative flex items-end justify-around px-2 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
        >
          {indicator.visible && (
            <span
              aria-hidden="true"
              className="nav-indicator"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
          {navItems.map((item, i) => {
            if (i === 2) {
              return (
                <button
                  key="add"
                  onClick={() => { haptic("selection"); setOpen(true); }}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center gradient-primary"
                    style={{ boxShadow: "0 0 20px rgba(180,127,232,0.4)" }}
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
                ref={(el) => (itemRefs.current[i] = el)}
                onClick={() => { haptic("selection"); navigate(item.path); }}
                className="relative flex flex-col items-center gap-1 min-w-[56px] tap-feedback"
              >
                <div className="relative flex items-center justify-center w-6 h-6">
                  {isActive && <span className="nav-aura" aria-hidden="true" />}
                  <Icon
                    className="w-6 h-6 relative"
                    style={{
                      color: isActive ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.4)",
                      filter: isActive ? "drop-shadow(0 0 6px rgba(180,127,232,0.6))" : "none",
                    }}
                  />
                </div>
                <span
                  className="text-[10px]"
                  style={{
                    color: isActive ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="border-t-0" style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-foreground">{t("Was möchtest du tun?")}</DrawerTitle>
            <DrawerClose asChild>
              <button className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.path}
                onClick={() => { setOpen(false); navigate(a.path); }}
                className="w-full py-3 px-4 rounded-full text-sm font-medium text-foreground text-left"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 text-sm text-muted-foreground text-center mt-2"
            >
              {t("Abbrechen")}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default BottomNav;
