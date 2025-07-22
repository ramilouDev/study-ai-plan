import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import LandingPage from "./pages/landing-page.tsx";
import QuizPage from "./pages/quiz-page.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { UserSyncProvider } from "./components/UserSyncProvider";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <UserSyncProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/quiz/:quizId" 
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              } 
            />
            {/* Redirigir cualquier ruta no encontrada a la landing page */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </UserSyncProvider>
    </ClerkProvider>
  </StrictMode>,
);
