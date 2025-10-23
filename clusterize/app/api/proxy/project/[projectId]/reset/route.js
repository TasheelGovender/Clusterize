export async function POST(req, context) {
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
    console.log("Project ID for reset:", projectId);
    const response = await fetch(
      `${serverBaseUrl}/api/storage/${projectId}/reset`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Reset request failed with status ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Reset failed with status ${response.status}`,
        }),
        { status: response.status }
      );
    }

    // For POST requests (data modification), don't cache the response
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");

    const responseData = await response.json();
    console.log("Reset response:", responseData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: responseData.message,
      data: responseData.data
    }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error during reset request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to reset project" }),
      { status: 500 }
    );
  }
}
