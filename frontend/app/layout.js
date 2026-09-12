import { ClerkProvider } from "@clerk/nextjs";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Enterprise Documented Workflow",
  description: "Enterprise Documented Workflow",
};

export default function RootLayout({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const hasClerk = publishableKey.startsWith("pk_");

  const content = children;

  return (
    <html lang="en" className={`${sourceSerif.variable} ${plexSans.variable}`}>
      <body className="font-sans">
        {hasClerk ? <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
