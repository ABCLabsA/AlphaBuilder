import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { MetaMaskProvider } from "@metamask/sdk-react";
import "./index.css";
import "./styles/spring-bouquet.css";
import router from "./routes/router";
import { EmailAuthProvider } from "@/hooks/useEmailAuth";
import { MetaMaskAuthProvider } from "@/hooks/useMetaMaskAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: "Alpha Builder",
          url: window.location.origin,
        },
      }}
    >
      <EmailAuthProvider>
        <MetaMaskAuthProvider>
          <RouterProvider router={router} />
        </MetaMaskAuthProvider>
      </EmailAuthProvider>
    </MetaMaskProvider>
  </StrictMode>
);
