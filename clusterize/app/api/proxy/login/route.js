export const POST = async (req) => {
  const { event, timestamp, sub, email } = await req.json();
  console.log(
    `Event: ${event}, Timestamp: ${timestamp}, Sub: ${sub}, Email: ${email}`
  );

  // Fetch the SERVER_PUBLIC_BASE_URL from the environment variables
  const serverBaseUrl = process.env.SERVER_PUBLIC_BASE_URL;

  if (!serverBaseUrl) {
    console.error("SERVER_PUBLIC_BASE_URL is not defined in .env.local");
    return new Response(
      JSON.stringify({ success: false, error: "Server URL not configured" }),
      { status: 500 }
    );
  }

  try {
    // Get auth data from headers set by middleware
    const accessToken = req.headers.get("x-access-token");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    console.log(`${serverBaseUrl}/api/auth/sign-in/POST`);
    const response = await fetch(`${serverBaseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, timestamp, sub, email }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during GET request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch data" }),
      { status: 500 }
    );
  }
};
