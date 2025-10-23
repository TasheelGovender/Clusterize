import { useState } from "react";

/**
 * Custom hook for managing image search functionality
 * @returns {Object} - Search state and handlers
 */
export function useImageSearch() {
  const [clusters, setClusters] = useState([]);
  const [labels, setLabels] = useState([]);
  const [tags, setTags] = useState([]);
  const [relocatedImages, setRelocatedImages] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const handleSearch = () => {
    if (clusters.length === 0 && labels.length === 0 && tags.length === 0 && !relocatedImages) {
      console.error("Search input is empty.");
      return;
    }
    setSearchTriggered(true); // Trigger the search
  };

  const clearSearch = () => {
    setClusters([]);
    setLabels([]);
    setTags([]);
    setRelocatedImages(false);
    setSearchTriggered(false);
  };

  return {
    // Filter states
    clusters,
    setClusters,
    labels,
    setLabels,
    tags,
    setTags,
    relocatedImages,
    setRelocatedImages,

    // Search controls
    searchTriggered,
    setSearchTriggered,
    handleSearch,
    clearSearch,
  };
}
