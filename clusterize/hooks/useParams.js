import { useState, useEffect } from "react";

/**
 * Custom hook for managing URL parameters extraction
 * @param {Promise} params - The params promise from Next.js
 * @returns {Object} - { projectId, loading }
 */
export function useParams(params) {
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    async function unwrapParams() {
      try {
        const resolvedParams = await params;
        setProjectId(resolvedParams.projectId);
      } catch (error) {
        console.error("Error unwrapping params:", error);
      } finally {
        setLoading(false);
      }
    }

    unwrapParams();
  }, [params]);

  return {
    projectId,
    loading,
  };
}
