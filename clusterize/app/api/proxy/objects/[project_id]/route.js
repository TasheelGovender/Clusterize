export async function GET(req, context) {
  const params = await context.params;
  const { project_id } = params;
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

    // Parse the request URL to extract query parameters (comma-separated format)
    const url = new URL(req.url);

    const clusters = url.searchParams.get("clusters");
    const label_names = url.searchParams.get("label_names");
    const tags_list = url.searchParams.get("tags_list");
    const relocated_images = url.searchParams.get("relocated_images");

    console.log("Query Parameters:", {
      clusters,
      label_names,
      tags_list,
      relocated_images,
    });

    // Construct the API URL with query parameters
    let apiUrl = `${serverBaseUrl}/api/storage/${project_id}/get_images`;
    const queryParams = new URLSearchParams();

    if (clusters) queryParams.append("clusters", clusters);
    if (label_names) queryParams.append("label_names", label_names);
    if (tags_list) queryParams.append("tags_list", tags_list);
    if (relocated_images) queryParams.append("relocated_images", relocated_images);

    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Handle 404 "No objects found" gracefully
      if (response.status === 404) {
        console.log("No objects found - returning empty result");
        return new Response(JSON.stringify({ data: { data: [] } }), {
          status: 200,
        });
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Response data:", data);
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during GET request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch images" }),
      { status: 500 }
    );
  }
}

export async function POST(req, context) {
  const params = await context.params;
  const { project_id } = params;
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

    // Parse the request body to get batch update parameters
    const body = await req.json();
    const { object_ids, operation_type, operation_values } = body;

    console.log("Batch update parameters:", {
      object_ids,
      operation_type,
      operation_values,
    });

    // Validate required parameters
    if (!object_ids || !Array.isArray(object_ids) || object_ids.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "object_ids must be a non-empty array",
        }),
        { status: 400 }
      );
    }

    if (!operation_type || !operation_values) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "operation_type and operation_values are required",
        }),
        { status: 400 }
      );
    }

    // Validate operation type
    const validOperations = ["add_tags", "new_cluster"];
    if (!validOperations.includes(operation_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid operation_type. Must be one of: ${validOperations.join(
            ", "
          )}`,
        }),
        { status: 400 }
      );
    }

    // Structure the operations based on type
    let operations = {};

    if (operation_type === "add_tags") {
      // For add_tags, operation_values should be an array
      if (!Array.isArray(operation_values)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "For add_tags operation, operation_values must be an array",
          }),
          { status: 400 }
        );
      }
      if (operation_values.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "For add_tags operation, operation_values cannot be empty",
          }),
          { status: 400 }
        );
      }
      operations.add_tags = operation_values;
    } else if (operation_type === "new_cluster") {
      // For new_cluster, operation_values should be a single string
      if (Array.isArray(operation_values)) {
        if (operation_values.length !== 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "For new_cluster operation, operation_values must contain exactly one value",
            }),
            { status: 400 }
          );
        }
        operations.new_cluster = operation_values[0];
      } else if (typeof operation_values === "string") {
        operations.new_cluster = operation_values;
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "For new_cluster operation, operation_values must be a string",
          }),
          { status: 400 }
        );
      }
    }

    // Construct the batch update request body
    const batchUpdateBody = {
      object_ids: object_ids,
      operations: operations,
    };

    // Construct the API URL for batch update
    const apiUrl = `${serverBaseUrl}/api/storage/${project_id}/batch_update`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batchUpdateBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Request failed with status ${response.status}: ${
          errorData.error || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    console.log("Batch update response:", data);

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error during batch update:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to update objects",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
