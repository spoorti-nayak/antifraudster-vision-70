import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { VendorProvider } from './contexts/VendorContext';

createRoot(document.getElementById("root")!).render(
  <VendorProvider>
    <App />
  </VendorProvider>
);
