import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudyRoom from "./pages/StudyRoom";
<<<<<<< HEAD
import ChatDemo from "./pages/ChatDemo";
=======
import Forum from "./pages/Forum";
import PostDetail from "./pages/PostDetail";
>>>>>>> 54631020dd68ac7149c40ef77fe39674e0808965
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study-room" element={<StudyRoom />} />
            <Route path="/study-room/:roomId" element={<StudyRoom />} />
<<<<<<< HEAD
            <Route path="/chat" element={<ChatDemo />} />
=======
            <Route path="/forum" element={<Forum />} />
            <Route path="/forum/post/:postId" element={<PostDetail />} />
>>>>>>> 54631020dd68ac7149c40ef77fe39674e0808965
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
