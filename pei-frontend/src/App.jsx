import { useState } from "react";
import { T } from "./constants/tokens";
import { useHashRouter } from "./hooks/useHashRouter";

// Shared components
import GrainOverlay    from "./components/shared/ui/GrainOverlay";
import Navigation      from "./components/shared/Navigation";
import Footer          from "./components/shared/Footer";
import PageWrapper     from "./components/shared/PageWrapper";
import SubmissionModal from "./components/shared/SubmissionModal";

// Pages — national index (main product)
import HomePage      from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import MapPage       from "./pages/MapPage";
import { TrendsPage, SeasonalPage, EthicsPage, MethodologyPage } from "./pages/ContentPages";

// Pages — legal & docs
import {
  PrivacyPolicyPage,
  AnonymityFrameworkPage,
  DataMethodologyPage,
  ResearchAccessPage,
  ContactPage,
} from "./pages/legal/LegalPages";

const VALID_PAGES = [
  "home","dashboard","map","trends","seasonal","ethics","methodology",
  "privacy","anonymity","data-methodology","research-access","contact",
];

export default function App() {
  const { page, navigate } = useHashRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const openModal  = () => setModalOpen(true);
  const currentPage = VALID_PAGES.includes(page) ? page : "home";

  const pages = {
    home:             <HomePage      navigate={navigate} openModal={openModal} />,
    dashboard:        <DashboardPage navigate={navigate} />,
    map:              <MapPage       openModal={openModal} />,
    trends:           <TrendsPage />,
    seasonal:         <SeasonalPage />,
    ethics:           <EthicsPage />,
    methodology:      <MethodologyPage />,
    privacy:          <PrivacyPolicyPage />,
    anonymity:        <AnonymityFrameworkPage />,
    "data-methodology": <DataMethodologyPage />,
    "research-access":  <ResearchAccessPage />,
    contact:          <ContactPage />,
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

      <Navigation navigate={navigate} currentPage={currentPage} openModal={openModal} />

      <PageWrapper page={currentPage}>
        {pages[currentPage]}
        <Footer navigate={navigate} openModal={openModal} />
      </PageWrapper>

      <SubmissionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
