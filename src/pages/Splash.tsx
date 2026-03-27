import { useNavigate } from "react-router-dom";
import Arkie from "@/components/Arkie";

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-center px-8">
      <div className="star-bg" />
      <div className="relative z-10 flex flex-col items-center w-full">
        <h1 className="text-4xl font-light tracking-wide mb-8">MindArk</h1>

        <Arkie size={100} />

        {/* Purple wave decoration */}
        <div className="w-full h-20 my-6 relative overflow-hidden">
          <svg viewBox="0 0 430 80" className="w-full" preserveAspectRatio="none">
            <path d="M0 40 C100 10, 200 70, 430 30 L430 80 L0 80Z" fill="var(--mindark-primary-start)" opacity="0.6" />
            <path d="M0 50 C150 20, 280 60, 430 40 L430 80 L0 80Z" fill="var(--mindark-primary-end)" opacity="0.4" />
          </svg>
        </div>

        <p className="text-muted-foreground text-center text-lg mb-16">
          Dein sicherer Raum für Gedanken,
          <br />
          Gefühle und Wachstum.
        </p>

        <div className="w-full space-y-4">
          <button onClick={() => navigate("/login")} className="btn-pill">
            LOGIN
          </button>
          <button onClick={() => navigate("/signup")} className="btn-pill" style={{ opacity: 0.85 }}>
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
};

export default Splash;
