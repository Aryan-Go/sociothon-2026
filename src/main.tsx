import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages-user.css";
import "./styles/pages-admin.css";
import "./styles/pages-collector.css";
import "./styles/pages-settings.css";
import "./styles/pages-login.css";
import "./styles/help.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
