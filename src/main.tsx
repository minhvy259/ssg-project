import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Trình duyệt không tự khôi phục vị trí cuộn (tránh reload bị nhảy xuống giữa trang)
if (typeof window !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(<App />);
