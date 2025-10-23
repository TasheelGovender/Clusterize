"use client";

import { UserProvider } from "@auth0/nextjs-auth0/client";

export default function ClientLayout({ children }) {
  return <UserProvider>{children}</UserProvider>;
}
// Delete ??
