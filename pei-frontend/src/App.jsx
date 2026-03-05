import { useState } from "react";
import { T } from "./constants/tokens";
import { useHashRouter } from "./hooks/useHashRouter";
import { useAuth } from "./hooks/useAuth";
import { savePersonalSubmission } from "./lib/supabase";

// Shared components
import GrainOverlay    from "./components/shared/ui/GrainOverlay";
import Navigation      from "./components/shared/Navigation";
import Footer          from "./components/shared/Footer";
import PageWrapper     from "./components/shared/PageWrapper";
import SubmissionModal from "./components/shared/SubmissionModal";
import AuthModal       from "./components/shared/AuthModal";
import PersonalPrompt  from "./components/shared/PersonalPrompt";
import PricingModal    from "./components/shared/PricingModal";

// Pages — national index
import HomePage      from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import MapPage       from "./pages/MapPage";
import { TrendsPage, SeasonalPage, EthicsPage, MethodologyPage } from "./pages/ContentPages";

// Pages — legal
import {
  PrivacyPolicyPage,
  AnonymityFrameworkPage,
  DataMethodologyPage,
  ResearchAccessPage,
  ContactPage,
} from "./pages/legal/LegalPages";

// Pages — personal
import PersonalDashboard from "./pages/personal/PersonalDashboard";
import AccountPage       from "./pages/personal/AccountPage";
import PricingOverlay    from "./components/shared/PricingOverlay";

const VALID_PAGES = [
  "home","dashboard","map","trends","seasonal","ethics","methodology",
  "privacy","anonymity","data-methodology","research-access","contact",
  "personal","account",
];

export default function App() {
  const { page, navigate } = useHashRouter();
  const { user, profile, hasAccess } = useAuth();

  const [modalOpen,   setModalOpen]   = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [promptOpen,  setPromptOpen]  = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [lastEmotion, setLastEmotion] = useState(null);

  const openModal = () => setModalOpen(true);

  // Override navigate so "pricing" opens modal instead of routing
  const handleNavigate = (dest) => {
    if (dest === "pricing") { setPricingOpen(true); return; }
    navigate(dest);
  };

  const handleSubmitSuccess = ({ emotion, intensity, lgu_id }) => {
    setLastEmotion(emotion);
    if (user && hasAccess) {
      savePersonalSubmission({ user_id: user.id, emotion, intensity, lgu_id }).catch(() => {});
    }
    if (!user) setTimeout(() => setPromptOpen(true), 400);
  };

  const isExpired = user && !hasAccess;
  const currentPage = VALID_PAGES.includes(page) ? page : "home";

  const pages = {
    home:               <HomePage      navigate={handleNavigate} openModal={openModal} />,
    dashboard:          <DashboardPage navigate={handleNavigate} />,
    map:                <MapPage       openModal={openModal} />,
    trends:             <TrendsPage />,
    seasonal:           <SeasonalPage />,
    ethics:             <EthicsPage />,
    methodology:        <MethodologyPage />,
    privacy:            <PrivacyPolicyPage />,
    anonymity:          <AnonymityFrameworkPage />,
    "data-methodology": <DataMethodologyPage />,
    "research-access":  <ResearchAccessPage />,
    contact:            <ContactPage />,
    personal: user
      ? <>
          <div style={{ position:"relative",
            filter:isExpired?"blur(4px) brightness(0.4)":"none",
            pointerEvents:isExpired?"none":"auto", transition:"filter 0.3s" }}>
            <PersonalDashboard user={user} profile={profile} navigate={handleNavigate} />
          </div>
          {isExpired && <PricingOverlay plan={profile?.plan||"trial"} navigate={handleNavigate} />}
        </>
      : <RedirectToAuth onAuth={() => setAuthOpen(true)} />,
    account: user
      ? <AccountPage user={user} profile={profile} navigate={handleNavigate} />
      : <RedirectToAuth onAuth={() => setAuthOpen(true)} />,
  };

  return (
    <div style={{ background:T.bg, color:T.text, minHeight:"100vh", fontFamily:"DM Mono,monospace" }}>
      <GrainOverlay />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#07090f}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#07090f}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08)}
        select option{background:#0c1018}
        textarea,input{font-family:'DM Mono',monospace!important}
        input::placeholder{color:#5a6070}
        textarea::placeholder{color:#5a6070}
      `}</style>

      <Navigation
        navigate={handleNavigate}
        currentPage={currentPage}
        openModal={openModal}
        user={user}
        onAccountClick={() => user ? handleNavigate("account") : setAuthOpen(true)}
      />

      <PageWrapper page={currentPage}>
        {pages[currentPage]}
        <Footer navigate={handleNavigate} openModal={openModal} />
      </PageWrapper>

      <SubmissionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSubmitSuccess} />
      <AuthModal       open={authOpen}  onClose={() => setAuthOpen(false)} />
      <PersonalPrompt  open={promptOpen} emotion={lastEmotion}
        onSignUp={() => { setPromptOpen(false); setAuthOpen(true); }}
        onDismiss={() => setPromptOpen(false)} />
      <PricingModal    open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}

function RedirectToAuth({ onAuth }) {
  return (
    <div style={{ padding:"4rem 0", textAlign:"center" }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
        fontWeight:900, marginBottom:"0.75rem" }}>Your Personal Index</div>
      <p style={{ fontFamily:"DM Mono", fontSize:"0.64rem", color:T.muted,
        lineHeight:1.7, marginBottom:"1.5rem" }}>
        Sign in or create an account to access your personal emotional index.
      </p>
      <button onClick={onAuth}
        style={{ background:T.amber, color:"#000", border:"none",
          padding:"0.6rem 1.5rem", fontFamily:"DM Mono", fontSize:"0.62rem",
          fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" }}>
        Sign In / Sign Up →
      </button>
    </div>
  );
}
