import "./globals.css";
import { SiteStateProvider } from "../components/site-state";
import { AppFrame } from "../components/app-frame";

export const metadata = {
  title: "AgriTech",
  description: "AgriTech is a multilingual crop-insurance platform for guided claims, verification visibility, and payout tracking."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SiteStateProvider>
          <AppFrame>{children}</AppFrame>
        </SiteStateProvider>
      </body>
    </html>
  );
}
