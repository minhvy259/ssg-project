import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudyRoom from "./pages/StudyRoom";
import ChatDemo from "./pages/ChatDemo";
import Forum from "./pages/Forum";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";
import DirectMessagesPage from "./pages/DirectMessages";
import CommunityPage from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study-room" element={<ErrorBoundary><StudyRoom /></ErrorBoundary>} />
            <Route path="/study-room/:roomId" element={<ErrorBoundary><StudyRoom /></ErrorBoundary>} />
            
            {/* Routes đã được hợp nhất */}
            <Route path="/chat" element={<ChatDemo />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/forum/post/:postId" element={<PostDetail />} />
            {/* Community & Direct Messages */}
            <Route path="/dm" element={<DirectMessagesPage />} />
            <Route path="/dm/:conversationId" element={<DirectMessagesPage />} />
            <Route path="/c" element={<CommunityPage />} />
            <Route path="/c/:communityId" element={<CommunityPage />} />
            <Route path="/c/:communityId/ch/:channelId" element={<CommunityPage />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;