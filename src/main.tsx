import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SolanaProvider } from "./solana/SolanaProvider";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SolanaProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </SolanaProvider>
  </React.StrictMode>
);
