import { useState } from "react";

/**
 * Custom hook for managing image editing (tags and clusters)
 * @param {Object} project - The project object
 * @param {string} cluster - Current cluster
 * @param {Array} images - Current images array
 * @param {Function} setImages - Function to update images
 * @param {Function} refreshProjectStatistics - Function to refresh project statistics
 * @returns {Object} - Image editing state and handlers
 */
export function useImageEditor(
  project,
  cluster,
  images,
  setImages,
  refreshProjectStatistics
) {
  // Individual editing state
  const [selectedImage, setSelectedImage] = useState(null);
  const [tagValue, setTagValue] = useState("");
  const [newCluster, setNewCluster] = useState("");

  // Batch editing state
  const [selectedImages, setSelectedImages] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchTagValue, setBatchTagValue] = useState("");
  const [batchNewCluster, setBatchNewCluster] = useState("");

  // Individual editing methods (existing)

  const submitChanges = async (updatedTags, imageId) => {
    try {
      console.log("cluster: ", newCluster);
      const response = await fetch(
        `/api/proxy/objects/${project.id}/${imageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags: updatedTags, new_cluster: newCluster }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to submit tags: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Refresh project statistics in background after successful update
      if (refreshProjectStatistics) {
        refreshProjectStatistics();
      }
    } catch (error) {
      console.error("Error submitting tags:", error);
    }
  };

  const handleChanges = async (e) => {
    e.preventDefault();
    if (!tagValue && !newCluster) return;

    const updatedImages = images.map((image) => {
      if (image.id === selectedImage) {
        if (newCluster && newCluster !== cluster) {
          console.log(
            `Removing image with ID ${selectedImage} from images due to cluster change.`
          );
          submitChanges(image.tags, image.id);
          return false; // Exclude this image from the updated images array
        }
        if (tagValue) {
          // Append the tagValue to the tags array
          const updatedTags = image.tags
            ? [...image.tags, tagValue]
            : [tagValue];
          console.log(updatedTags);
          submitChanges(updatedTags, image.id);
          return { ...image, tags: updatedTags };
        }
      }
      return image;
    });

    // Update the images state
    setImages(updatedImages.filter(Boolean));
    console.log("Tag submitted:", tagValue);
    console.log("New cluster submitted:", newCluster);

    setTagValue("");
    setNewCluster("");
  };

  const removeTag = (imageId, tagToRemove) => {
    const updatedImages = images.map((image) => {
      if (image.id === imageId) {
        const updatedTags = image.tags.filter((tag) => tag !== tagToRemove);
        console.log("Updated tags after removal:", updatedTags);

        // Call submitChanges with the updated tags and imageId
        submitChanges(updatedTags, imageId);

        return { ...image, tags: updatedTags };
      }
      return image;
    });

    setImages(updatedImages);
  };

  // Batch editing methods
  const submitBatchChanges = async (
    imageIds,
    operation_type,
    operation_values
  ) => {
    try {
      console.log("Batch operation:", {
        imageIds,
        operation_type,
        operation_values,
      });

      const response = await fetch(`/api/proxy/objects/${project.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_ids: imageIds,
          operation_type,
          operation_values,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to batch update: ${response.status} - ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      console.log("Batch update response:", data);

      // Refresh project statistics in background after successful batch update
      if (refreshProjectStatistics) {
        refreshProjectStatistics();
      }

      return data;
    } catch (error) {
      console.error("Error in batch update:", error);
      throw error;
    }
  };

  const batchAddTags = async (imageIds, tagsToAdd) => {
    try {
      if (!imageIds.length || !tagsToAdd.length) {
        throw new Error("Image IDs and tags are required");
      }

      await submitBatchChanges(imageIds, "add_tags", tagsToAdd);

      // Update local state for affected images
      const updatedImages = images.map((image) => {
        if (imageIds.includes(image.id)) {
          const currentTags = image.tags || [];
          const updatedTags = [...new Set([...currentTags, ...tagsToAdd])]; // Remove duplicates
          return { ...image, tags: updatedTags };
        }
        return image;
      });

      setImages(updatedImages);
      console.log(
        `Batch added tags [${tagsToAdd.join(", ")}] to ${
          imageIds.length
        } images`
      );
    } catch (error) {
      console.error("Error in batch add tags:", error);
      throw error;
    }
  };

  const batchChangeCluster = async (imageIds, newClusterName) => {
    try {
      if (!imageIds.length || !newClusterName) {
        throw new Error("Image IDs and new cluster name are required");
      }

      await submitBatchChanges(imageIds, "new_cluster", newClusterName);

      // Remove images from current view if they were moved to a different cluster
      if (newClusterName !== cluster) {
        const updatedImages = images.filter(
          (image) => !imageIds.includes(image.id)
        );
        setImages(updatedImages);
        console.log(
          `Moved ${imageIds.length} images to cluster '${newClusterName}' and removed from current view`
        );
      }
    } catch (error) {
      console.error("Error in batch change cluster:", error);
      throw error;
    }
  };

  const handleBatchChanges = async (e) => {
    e.preventDefault();

    if (!selectedImages.length) {
      console.warn("No images selected for batch operation");
      return;
    }

    try {
      if (batchTagValue && batchTagValue.trim()) {
        const tagsToAdd = batchTagValue
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        await batchAddTags(selectedImages, tagsToAdd);
      }

      if (batchNewCluster && batchNewCluster.trim()) {
        await batchChangeCluster(selectedImages, batchNewCluster.trim());
      }

      // Reset batch state
      setBatchTagValue("");
      setBatchNewCluster("");
      setSelectedImages([]);
    } catch (error) {
      console.error("Error in batch changes:", error);
      // You might want to show an error message to the user here
    }
  };

  const toggleImageSelection = (imageId) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const clearBatchSelection = () => {
    setSelectedImages([]);
    setBatchTagValue("");
    setBatchNewCluster("");
  };

  return {
    // Individual editing (existing functionality)
    selectedImage,
    setSelectedImage,
    tagValue,
    setTagValue,
    newCluster,
    setNewCluster,
    handleChanges,
    removeTag,

    // Batch editing (new functionality)
    selectedImages,
    setSelectedImages,
    batchMode,
    setBatchMode,
    batchTagValue,
    setBatchTagValue,
    batchNewCluster,
    setBatchNewCluster,
    batchAddTags,
    batchChangeCluster,
    handleBatchChanges,
    toggleImageSelection,
    clearBatchSelection,
  };
}
