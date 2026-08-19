import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { SubmitButton } from "@/components/SubmitButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitUp",
  description: "A lightweight shared-expense tracker for small groups.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/groups" className="text-lg font-semibold text-gray-900">
              SplitUp
            </Link>
            {session?.user && (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-gray-500">
                  Signed in as {session.user.name}
                </span>
                <SubmitButton
                  pendingLabel="Signing out…"
                  className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  spinnerClassName="h-4 w-4 border-gray-300 border-t-gray-700"
                >
                  Sign out
                </SubmitButton>
              </form>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
