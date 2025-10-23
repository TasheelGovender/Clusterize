import { getSession } from "@auth0/nextjs-auth0";

const BACKEND_URL =
  process.env.SERVER_PUBLIC_BASE_URL || "http://localhost:5000";

export async function POST(request) {
  console.log("=== PROXY CLUSTERS POST DEBUG ===");

  try {
    const session = await getSession();
    console.log("Session exists:", !!session);
    console.log("Session user:", session?.user?.sub);

    if (!session) {
      console.log("No session - returning 401");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const projectId = searchParams.get("project_id");
    const clusterName = searchParams.get("cluster_name");
    const clusterLabel = searchParams.get("cluster_label");

    console.log("Query params:", { projectId, clusterName, clusterLabel });

    if (!projectId) {
      console.log("Missing project_id - returning 400");
      return Response.json(
        { error: "Missing project_id parameter" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);

    // Prioritize request body data, fallback to query parameters
    const requestBody = {
      clusterName: body.clusterName || clusterName || null,
      clusterLabel: body.clusterLabel || clusterLabel || null,
    };

    console.log("Final request body to backend:", requestBody);

    const backendUrl = `${BACKEND_URL}/api/clusters/${projectId}/new-cluster`;
    console.log("Backend URL:", backendUrl);
    console.log("Access token exists:", !!session.accessToken);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Backend response status:", response.status);
    console.log("Backend response ok:", response.ok);

    const data = await response.json();
    console.log("Backend response data:", data);

    if (!response.ok) {
      console.error("Backend error:", data);
      return Response.json(data, { status: response.status });
    }

    console.log("Proxy success - returning:", data);
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error("Proxy error:", error);
    console.error("Error stack:", error.stack);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const projectId = searchParams.get("project_id");
    const clusterNumber = searchParams.get("cluster_number");

    if (!projectId || !clusterNumber) {
      return Response.json(
        {
          error: "Missing required parameters: project_id and cluster_number",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Update cluster - body:", body);

    // Use the label_name from the request body (sent by useCluster hook)
    const requestBody = {
      label_name: body.label_name, // Backend expects "label_name"
    };

    console.log("Update cluster request body to backend:", requestBody);

    const response = await fetch(
      `${BACKEND_URL}/api/clusters/${projectId}/${clusterNumber}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
