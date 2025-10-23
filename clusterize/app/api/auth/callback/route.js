import { handleCallback } from "@auth0/nextjs-auth0";

export const GET = handleCallback({
  afterCallback: async (req, session, state) => {
    console.log("User just logged in:", session.user);

    // try {
    //   const response = await fetch(
    //     `${process.env.NEXT_PUBLIC_BASE_URL}/api/proxy/login`,
    //     {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify({
    //         event: "login",
    //         timestamp: new Date().toISOString(),
    //       }),
    //     }
    //   );

    //   if (!response.ok) {
    //     console.error("Failed to log the login event");
    //   } else {
    //     console.log("Login event logged successfully");
    //   }
    // } catch (error) {
    //   console.error("Error while sending API request:", error);
    // }

    return session;
  },
});
