import { useState, useRef } from "react";
import Papa from "papaparse";

/**
 * Custom hook for managing CSV file uploads and parsing
 * @param {string} projectId - The project ID to upload to
 * @returns {Object} - CSV upload state and handlers
 */
export function useCSVUpload(projectId) {
  const [csvFiles, setCsvFiles] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const csvInputRef = useRef(null);

  const handleCSVButtonClick = () => {
    csvInputRef.current.click();
  };

  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      console.log(e.target.files[0]);
      setCsvFiles((prevFiles) => [...prevFiles, e.target.files[0]]);
      
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function (results, file) {
          console.log("Parsing complete:", results, file);

          // Map each row to your desired object shape
          const parsedData = results.data.map((row) => ({
            name: row["iauname"],
            cluster: row["cluster"],
          }));

          console.log("Parsed data as objects:", parsedData);
          setClusterData(parsedData);
        },
      });
    }
  };

  const uploadCSV = async () => {
    try {
      setUploading(true);
      console.log("Uploading CSV data:", clusterData);
      
      const response = await fetch("/api/proxy/clusters/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clusterData, proj_id: projectId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to upload CSV: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error uploading CSV:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCSV = async () => {
    if (clusterData.length > 0) {
      const result = await uploadCSV();
      return result;
    } else {
      console.error("No parsed data to upload.");
      return null;
    }
  };

  const resetCSV = () => {
    setCsvFiles([]);
    setClusterData([]);
  };

  return {
    csvFiles,
    clusterData,
    uploading,
    csvInputRef,
    handleCSVButtonClick,
    handleFile,
    handleCSV,
    resetCSV,
  };
}
