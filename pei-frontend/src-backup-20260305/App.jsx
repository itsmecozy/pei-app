import { useState } from "react";
import { useHashRouter }         from "./hooks/useHashRouter";
import { useAuth }               from "./hooks/useAuth";
import { useTheme }              from "./hooks/useTheme";
import { ThemeContext }          from "./context/ThemeContext";
import { savePersonalSubmission } from "./lib/supabase";

import GrainOverlay    from "./components/shared/ui/GrainOverlay";
import Navigation      from "./components/shared/Navigation";
import Footer          from "./components/shared/Footer";
import PageWrapper     from "./components/shared/PageWrapper";
import SubmissionModal from "./components/shared/SubmissionModal";
import AuthModal       from "./components/shared/AuthModal";
import PersonalPrompt  from "./components/shared/PersonalPrompt";
import PricingModal    from "./components/shared/PricingModal";
import PricingOverlay  from "./components/shared/PricingOverlay";

import HomePage      from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import MapPage       from "./pages/MapPage";
import { TrendsPage, SeasonalPage, EthicsPage, MethodologyPage } from "./pages/ContentPages";
import { PrivacyPolicyPage, AnonymityFrameworkPage, DataMethodologyPage, ResearchAccessPage, ContactPage } from "./pages/legal/LegalPages";
import PersonalDashboard from "./pages/personal/PersonalDashboard";
import AccountPage       from "./pages/personal/AccountPage";
import SettingsPage      from "./pages/personal/SettingsPage";

const VALID_PAGES = [
  "home","dashboard","map","trends","seasonal","ethics","methodology",
  "privacy","anonymity","data-methodology","research-access","contact",
  "personal","account","settings",
];

export default function App() {
  const { page, navigate }           = useHashRouter();
  const { user, profile, hasAccess } = useAuth();
  const { themeId, tokens, setTheme } = useTheme();
  const T = tokens;

  const [modalOpen,   setModalOpen]   = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [promptOpen,  setPromptOpen]  = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [lastEmotion, setLastEmotion] = useState(null);

  const openModal   = () => setModalOpen(true);
  const handleNavigate = (dest) => {
    if (dest === "pricing") { setPricingOpen(true); return; }
    navigate(dest);
  };

  const handleSubmitSuccess = ({ emotion, intensity, lgu_id }) => {
    setLastEmotion(emotion);
    if (user && hasAccess) {
      savePersonalSubmission({ user_id:user.id, emotion, intensity, lgu_id }).catch(()=>{});
    }
    if (!user) setTimeout(() => setPromptOpen(true), 400);
  };

  const isExpired   = user && !hasAccess;
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
          <div style={{ filter:isExpired?"blur(4px) brightness(0.4)":"none",
            pointerEvents:isExpired?"none":"auto", transition:"filter 0.3s" }}>
            <PersonalDashboard user={user} profile={profile} navigate={handleNavigate} />
          </div>
          {isExpired && <PricingOverlay plan={profile?.plan||"trial"} navigate={handleNavigate} />}
        </>
      : <RedirectToAuth T={T} onAuth={() => setAuthOpen(true)} />,
    account:  user
      ? <AccountPage  user={user} profile={profile} navigate={handleNavigate} />
      : <RedirectToAuth T={T} onAuth={() => setAuthOpen(true)} />,
    settings: <SettingsPage themeId={themeId} setTheme={setTheme} />,
  };

  return (
    <ThemeContext.Provider value={T}>
      <div style={{ background:T.bg, color:T.text, minHeight:"100vh", fontFamily:"DM Mono,monospace" }}>
        <GrainOverlay />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@300;400;500&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:${T.bg};color:${T.text};transition:background 0.3s,color 0.3s}
          ::-webkit-scrollbar{width:4px}
          ::-webkit-scrollbar-track{background:${T.bg}}
          ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2)}
          select option{background:${T.surface}}
          textarea,input{font-family:'DM Mono',monospace!important}
          input::placeholder{color:${T.muted}!important}
          textarea::placeholder{color:${T.muted}!important}
        `}</style>

        <Navigation
          navigate={handleNavigate}
          currentPage={currentPage}
          openModal={openModal}
          user={user}
          onAuthClick={() => setAuthOpen(true)}
        />

        <PageWrapper page={currentPage}>
          {pages[currentPage]}
          <Footer navigate={handleNavigate} openModal={openModal} />
        </PageWrapper>

        <SubmissionModal open={modalOpen}   onClose={()=>setModalOpen(false)}   onSuccess={handleSubmitSuccess} />
        <AuthModal       open={authOpen}    onClose={()=>setAuthOpen(false)} />
        <PersonalPrompt  open={promptOpen}  emotion={lastEmotion}
          onSignUp={()=>{ setPromptOpen(false); setAuthOpen(true); }}
          onDismiss={()=>setPromptOpen(false)} />
        <PricingModal    open={pricingOpen} onClose={()=>setPricingOpen(false)} />
      </div>
    </ThemeContext.Provider>
  );
}

function RedirectToAuth({ T, onAuth }) {
  return (
    <div style={{ padding:"4rem 0", textAlign:"center" }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem",
        fontWeight:900, marginBottom:"0.75rem", color:T.text }}>Your Personal Index</div>
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
