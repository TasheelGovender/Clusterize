import { handleLogin } from "@auth0/nextjs-auth0";

export const GET = async (req, res) => {
  console.log("User is attempting to log in");

  return handleLogin({
    returnTo: "/projects",
  })(req, res);
};
