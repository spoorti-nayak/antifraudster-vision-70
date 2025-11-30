import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SimulationProvider } from "./contexts/SimulationContext";

createRoot(document.getElementById("root")!).render(
  <SimulationProvider>
    <App />
  </SimulationProvider>
);
