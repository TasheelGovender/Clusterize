import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing image fetching and URL expiry
 * @param {Object} project - The project object
 * @param {string|Array} clusters - Current clusters filter (single string, comma-separated string, or array)
 * @param {string|Array} labels - Current cluster label names filter (single string, comma-separated string, or array)
 * @param {string|Array} tags - Current tags filter (single string, comma-separated string, or array)
 * @param {boolean} relocatedImages - Whether to include relocated images in the filter
 * @returns {Object} - { images, loadingImages, fetchImages, setImages }
 */
export function useImages(project, clusters, labels, tags, relocatedImages) {
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const urlExpiryRef = useRef(null);

  const fetchImages = useCallback(async () => {
    if (!project) return;
    if (!clusters && !labels && !tags && !relocatedImages) return;

    try {
      setLoadingImages(true);

      // Construct the base URL
      let url = `/api/proxy/objects/${project.id}`;

      // Add query parameters if filters are set
      const queryParams = new URLSearchParams();

      // Handle clusters (normalize to comma-separated string)
      if (clusters) {
        const clustersStr = Array.isArray(clusters)
          ? clusters.join(",")
          : clusters;
        if (clustersStr.trim()) {
          queryParams.append("clusters", clustersStr);
        }
      }

      // Handle labels (normalize to comma-separated string) - these are cluster label names
      if (labels) {
        const labelsStr = Array.isArray(labels) ? labels.join(",") : labels;
        if (labelsStr.trim()) {
          queryParams.append("label_names", labelsStr);
        }
      }

      // Handle tags (normalize to comma-separated string)
      if (tags) {
        const tagsStr = Array.isArray(tags) ? tags.join(",") : tags;
        if (tagsStr.trim()) {
          queryParams.append("tags_list", tagsStr);
        }
      }

      if (relocatedImages) {
        queryParams.append("relocated_images", "true");
      }

      // Check if all parameters are empty after processing
      if (!queryParams.toString()) {
        setLoadingImages(false);
        return;
      }

      // Append query parameters to the URL
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const response_data = await response.json();
      setImages(response_data.data.data);

      // Store expiry in the ref instead of state
      const expiryTime =
        Date.now() + response_data.expiration_seconds * 1000 - 30000;
      urlExpiryRef.current = expiryTime;
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoadingImages(false);
    }
  }, [project, clusters, labels, tags, relocatedImages]);

  // Set up URL refresh interval
  useEffect(() => {
    if (!project?.id || (!clusters && !labels && !tags && !relocatedImages)) {
      return;
    }

    setImages([]);
    setLoadingImages(true);
    urlExpiryRef.current = null;

    // Initial fetch of images
    fetchImages();

    // Set up refresh interval
    const checkInterval = setInterval(() => {
      if (urlExpiryRef.current && Date.now() > urlExpiryRef.current) {
        setLoadingImages(true);
        fetchImages();
      }
    }, 15000);

    return () => clearInterval(checkInterval);
  }, [clusters, labels, tags, project?.id, fetchImages, relocatedImages]);

  return {
    images,
    setImages,
    loadingImages,
    fetchImages,
  };
}
