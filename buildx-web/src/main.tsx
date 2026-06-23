import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./layout/simple-page-spa.css";
import "./components/onedev/select2-spa.css";

// Expose mock controls for dev tooling (browser console).
import { setMockEmptyProject } from "./mocks/fixtures/blob";
(window as any).__buildxSetMockEmptyProject = setMockEmptyProject;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
