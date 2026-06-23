import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./layout/simple-page-spa.css";
import "./components/onedev/select2-spa.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
