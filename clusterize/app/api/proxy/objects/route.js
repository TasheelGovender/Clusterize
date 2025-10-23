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
    // Get auth data from headers set by middleware
    const accessToken = req.headers.get("x-access-token");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files");
    const proj_id = formData.get("proj_id");
    console.log("Received files:", files);

    const fileData = new FormData();
    for (const file of files) {
      fileData.append("files", file); // file is a File object
    }

    const response = await fetch(`${serverBaseUrl}/api/storage/${proj_id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: fileData,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();

    return new Response(JSON.stringify({ data }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error during POST request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to upload files" }),
      { status: 500 }
    );
  }
}
