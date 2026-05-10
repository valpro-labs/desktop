import * as React from "react";
import { createRoot } from "react-dom/client";
import { Uniwind } from "uniwind";

import { App } from "./App";
import "./styles.css";

Uniwind.setTheme("dark");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
