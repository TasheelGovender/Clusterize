import { useState, useRef } from "react";

/**
 * Custom hook for managing file uploads (images)
 * @param {string} projectId - The project ID to upload to
 * @returns {Object} - Upload state and handlers
 */
export function useFileUpload(projectId) {
  const [files, setFiles] = useState([]);
  const [counter, setCounter] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    console.log("Selected files:", selectedFiles);
    setFiles(selectedFiles);
    
    // Count files
    let fileCount = 0;
    selectedFiles.forEach((file) => {
      console.log("File:", file.name);
      fileCount++;
    });
    setCounter(fileCount);
  };

  const uploadFiles = async () => {
    if (!files.length || !projectId) {
      console.error("No files selected or project ID missing.");
      return null;
    }
    
    try {
      setUploading(true);
      
      // Prepare the payload for the API route
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      formData.append("proj_id", projectId);

      const response = await fetch("/api/proxy/objects", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload files: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error uploading files:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async () => {
    if (files.length === 0) {
      return;
    }
    
    const result = await uploadFiles();
    if (result) {
      console.log("Files uploaded successfully:", result);
    }
    return result;
  };

  const resetFiles = () => {
    setFiles([]);
    setCounter(0);
  };

  return {
    files,
    counter,
    uploading,
    fileInputRef,
    handleButtonClick,
    handleFileChange,
    handleUploadImages,
    resetFiles,
  };
}
