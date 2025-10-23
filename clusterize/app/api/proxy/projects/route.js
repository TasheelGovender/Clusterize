export async function GET(req) {
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
    // Get user info from headers set by middleware
    const userId = req.headers.get("x-user-id");
    const accessToken = req.headers.get("x-access-token");

    if (!userId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const response = await fetch(`${serverBaseUrl}/api/projects/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error during GET request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch projects" }),
      { status: 500 }
    );
  }
}

export async function POST(req) {
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
    // Get user info from headers set by middleware
    const userId = req.headers.get("x-user-id");
    const accessToken = req.headers.get("x-access-token");

    if (!userId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const body = await req.json(); // Parse the request body

    // Validate the request body
    if (!body || Object.keys(body).length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Request body is empty or invalid",
        }),
        { status: 400 }
      );
    }

    const response = await fetch(`${serverBaseUrl}/api/projects/${userId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), // Send the request body to the backend
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Backend error:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error || "Failed to create project",
        }),
        { status: response.status }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during POST request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to create project" }),
      { status: 500 }
    );
  }
}
