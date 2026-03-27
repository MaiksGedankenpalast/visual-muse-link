import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import Arkie from "./Arkie";

const AppLayout = () => {
  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto">
      <div className="star-bg" />
      <div className="relative z-10 pb-24">
        <Outlet />
      </div>
      {/* Arkie floating button */}
      <div className="fixed bottom-24 right-4 z-40 max-w-[430px]" style={{ right: 'max(16px, calc(50% - 215px + 16px))' }}>
        <div className="flex flex-col items-center">
          <Arkie size={50} />
          <span className="text-[10px] text-muted-foreground mt-1">Arkie</span>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
