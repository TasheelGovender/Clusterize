import { useState } from "react";

export function useCluster() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCluster = async (projectId, clusterName, clusterLabel) => {
    setLoading(true);
    setError(null);

    console.log("=== useCluster.createCluster DEBUG ===");
    console.log("Parameters:", { projectId, clusterName, clusterLabel });

    try {
      const url = `/api/proxy/clusters?project_id=${projectId}`;
      const requestBody = {
        clusterName,
        clusterLabel,
      };

      console.log("Request URL:", url);
      console.log("Request body:", requestBody);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        console.error("API Error Response:", data);
        throw new Error(data.error || "Failed to create cluster");
      }

      console.log("Create cluster successful:", data);
      return data;
    } catch (err) {
      console.error("useCluster.createCluster error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCluster = async (projectId, clusterNumber, labelName) => {
    setLoading(true);
    setError(null);
    console.log("=== useCluster.updateCluster DEBUG ===");
    console.log("Parameters:", { labelName });
    try {
      const response = await fetch(
        `/api/proxy/clusters?project_id=${projectId}&cluster_number=${clusterNumber}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label_name: labelName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update cluster");
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetCluster = async (projectId, clusterNumber) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/proxy/clusters/reset?projectId=${projectId}&cluster_number=${clusterNumber}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset cluster");
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createClusterWithParams = async (
    projectId,
    clusterName,
    clusterLabel
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        project_id: projectId,
        cluster_name: clusterName,
        cluster_label: clusterLabel || "",
      });

      const response = await fetch(`/api/proxy/clusters?${params}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create cluster");
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateClusterWithParams = async (
    projectId,
    clusterNumber,
    labelName
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        project_id: projectId,
        cluster_number: clusterNumber,
        cluster_label: labelName || "",
      });

      const response = await fetch(`/api/proxy/clusters?${params}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update cluster");
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    createCluster,
    updateCluster,
    createClusterWithParams,
    updateClusterWithParams,
    resetCluster,
  };
}
