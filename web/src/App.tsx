import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Shell } from "@/components/layout/shell";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Pipeline from "@/pages/pipeline";
import LeadScoring from "@/pages/lead-scoring";
import Health from "@/pages/health";
import Placeholder from "@/pages/placeholder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="action-plans" element={<Placeholder title="Action Plan Studio" />} />
          <Route path="lead-scoring" element={<LeadScoring />} />
          <Route path="channels" element={<Placeholder title="Channel Performance" />} />
          <Route path="retargeting" element={<Placeholder title="Retargeting" />} />
          <Route path="conversion-paths" element={<Placeholder title="Conversion Paths" />} />
          <Route path="revenue-goals" element={<Placeholder title="Revenue Goals" />} />
          <Route path="funnel" element={<Placeholder title="Funnel Analytics" />} />
          <Route path="outcomes" element={<Placeholder title="Outcomes" />} />
          <Route path="brand-audit" element={<Placeholder title="Brand Audit" />} />
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<Placeholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
