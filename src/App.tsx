import { Routes, Route } from "react-router";
import Dashboard from "./pages/home";
import Library from "./pages/library";
import ReadingQueue from "./pages/reading-queue";
import SaveLink from "./pages/save-link";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="library" element={<Library />} />
      <Route path="reading-queue" element={<ReadingQueue />} />
      <Route path="save" element={<SaveLink />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
