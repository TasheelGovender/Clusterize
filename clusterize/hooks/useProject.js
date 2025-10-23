import { useState, useEffect } from "react";

/**
 * Custom hook for managing project data
 * @param {string} projectId - The project ID to fetch
 * @returns {Object} - { project, loading, error, refetch }
 */
export function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async (silent = false) => {
    if (!projectId) return;

    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/proxy/project/${projectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched project data:", data);
      setProject(data.data);
      setStatistics(data.stats);
    } catch (err) {
      console.error("Error fetching project:", err);
      if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const resetProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/proxy/project/${projectId}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to reset project: ${response.status}`);
      }

      const data = await response.json();
      console.log("Project reset successfully:", data);
      await fetchProject(); // Refetch project after reset
    } catch (err) {
      console.error("Error resetting project:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const silentRefetch = async () => {
    await fetchProject(true);
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  return {
    project,
    statistics,
    setStatistics,
    loading,
    error,
    refetch: fetchProject,
    silentRefetch,
    resetProject,
  };
}
