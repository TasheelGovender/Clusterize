export async function GET(req, context) {
  const params = await context.params;
  const { projectId } = params;
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

    const response = await fetch(
      `${serverBaseUrl}/api/projects/${projectId}?include_stats=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const response_data = await response.json();
    const data = response_data["data"];
    const stats = response_data["statistics"];
    console.log("Response data:", data);
    console.log("Response stats:", stats);

    // Add headers for GET requests - no caching since statistics change frequently
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    // Disable caching since project statistics change frequently with batch updates
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify({ data, stats }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error during GET request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch project" }),
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  const params = await context.params;
  const { projectId } = params;
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
    console.log("Project ID:", projectId);
    const response = await fetch(`${serverBaseUrl}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // const data = await response.json();
    // console.log("Response data:", data);
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
        }),
        { status: response.status }
      );
    }

    // For DELETE requests (data modification), don't cache the response
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    // Simple no-cache directive (most important one)
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error during DELETE request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to delete project" }),
      { status: 500 }
    );
  }
}
