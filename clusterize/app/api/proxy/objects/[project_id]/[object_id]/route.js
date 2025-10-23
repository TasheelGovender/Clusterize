export async function PUT(req, context) {
  const params = await context.params;
  const { project_id, object_id } = params;
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
    const { tags, new_cluster } = await req.json();
    console.log("Received tags:", tags);
    console.log("Received new_cluster:", new_cluster);

    // Get auth data from headers set by middleware
    const accessToken = req.headers.get("x-access-token");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const response = await fetch(
      `${serverBaseUrl}/api/storage/${project_id}/${object_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "PUT",
        body: JSON.stringify({
          tags,
          new_cluster,
        }),
      }
    );
    console.log(response);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Response data:", data);
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during PUT request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to Add tag" }),
      { status: 500 }
    );
  }
}
