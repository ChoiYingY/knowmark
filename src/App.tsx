import { Routes, Route } from "react-router";
import HomePage from "./pages/home";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      {/* CRITICAL: ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
