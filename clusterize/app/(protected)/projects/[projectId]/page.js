"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClusterAnalytics, TagAnalytics } from "@/components/analytics/analytics";
import { ImageDisplay } from "@/components/ui/image-display";
import FilterSidebar from "@/components/workspace/FilterSidebar";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Import project-related hooks only
import { useParams, useProject, useImages, useImageSearch, useImageEditor } from "@/hooks";

// Lazy load upload dialog component
const UploadDialog = dynamic(
  () => import("@/components/dialogs/UploadDialog"),
  {
    ssr: false,
  }
);

// Lazy load upload dialog component
const CreateClusterDialog = dynamic(
  () => import("@/components/dialogs/CreateClusterDialog"),
  {
    ssr: false,
  }
);

// Lazy load cluster info dialog component
const ClusterInfoDialog = dynamic(
  () => import("@/components/dialogs/ClusterInfoDialog"),
  {
    ssr: false,
  }
);

const clusterData = [
  { word: "faces", frequency: 156 },
  { word: "landscapes", frequency: 89 },
  { word: "animals", frequency: 67 },
  { word: "buildings", frequency: 45 },
  { word: "vehicles", frequency: 34 },
  { word: "flowers", frequency: 28 },
  { word: "food", frequency: 23 },
  { word: "sports", frequency: 19 },
  { word: "technology", frequency: 15 },
  { word: "art", frequency: 12 },
];

export default function ProjectPage({ params }) {
  // Dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createClusterDialogOpen, setCreateClusterDialogOpen] = useState(false);
  const [clusterInfoDialogOpen, setClusterInfoDialogOpen] = useState(false);
  const [resetProjectDialogOpen, setResetProjectDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [uniqueLabels, setUniqueLabels] = useState([]);

  // const [projectId, setProjectId] = useState(null);
  // const [project, setProject] = useState(null);
  // const [statistics, setStatistics] = useState({ clusters: [], tags: [] });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // State to control when to actually apply filters to useImages
  const [appliedClusters, setAppliedClusters] = useState([]);
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [appliedTags, setAppliedTags] = useState([]);
  const [appliedRelocatedImages, setAppliedRelocatedImages] = useState(false);

  // Router for navigation
  const router = useRouter();

  // Initialize custom hooks - only project related
  const { projectId } = useParams(params);
  const { project, statistics, setStatistics, loading, error, silentRefetch, resetProject } =
    useProject(projectId);

  const handleClusterCreated = async () => {
    await silentRefetch();
  };

  // Initialize image-related hooks
  const {
    clusters,
    setClusters,
    labels,
    setLabels,
    tags,
    setTags,
    relocatedImages,
    setRelocatedImages,
    searchTriggered,
    setSearchTriggered,
    handleSearch,
  } = useImageSearch();

  const { images, setImages, loadingImages, fetchImages } = useImages(
    project,
    appliedClusters,
    appliedLabels,
    appliedTags,
    appliedRelocatedImages
  );

  // Extract unique labels, filtering out null values
  const extractUniqueLabels = (clusters) => {
    // Use Set to automatically handle duplicates
    const uniqueLabels = new Set();
    
    // Add non-null labels to the set
    clusters.forEach(cluster => {
      if (cluster.label) {
        uniqueLabels.add(cluster.label);
      }
    });
    
    // Convert Set back to array
    return Array.from(uniqueLabels);
  };

  useEffect(() => {
    const uniqueLabels = extractUniqueLabels(statistics?.clusters || []);
    setUniqueLabels(uniqueLabels);
  }, [statistics]);

  // Function to refresh project statistics in background
  const refreshProjectStatistics = async () => {
    if (!projectId) return;

    try {
      console.log("Refreshing project statistics in background...");
      const response = await fetch(`/api/proxy/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.stats) {
          console.log("Old statistics:", statistics);
          console.log("New statistics from API:", data.stats);
          setStatistics(data.stats);
          console.log("Project statistics state updated");
        }
      } else {
        console.error("Failed to fetch statistics:", response.status);
      }
    } catch (error) {
      console.error("Failed to refresh project statistics:", error);
    }
  };

  const imageEditor = useImageEditor(
    project,
    appliedClusters.length > 0 ? appliedClusters[0] : null, // Pass first cluster for compatibility
    images,
    setImages,
    refreshProjectStatistics // Pass refresh function to image editor
  );

  useEffect(() => {
    if (searchTriggered) {
      // Apply current filter selections to trigger useImages
      setAppliedClusters(clusters);
      setAppliedLabels(labels);
      setAppliedTags(tags);
      setAppliedRelocatedImages(relocatedImages);
      setSearchTriggered(false); // Reset the trigger
    }
  }, [searchTriggered, clusters, labels, tags, relocatedImages, setSearchTriggered]);


  const handleClusterClick = (cluster) => {
    // Create a more complete cluster object for the dialog
    const clusterData = {
      cluster_name: cluster.name,
      label_name: cluster.label || null,
      image_count: cluster.frequency,
    };

    setSelectedCluster(clusterData);
    setClusterInfoDialogOpen(true);
  };

  // Calculate the highest cluster number for new cluster creation
  const getNextClusterNumber = () => {
    if (!statistics?.clusters || statistics.clusters.length === 0) {
      return "1";
    }

    const clusterNumbers = statistics.clusters
      .map((cluster) => parseInt(cluster.name))
      .filter((num) => !isNaN(num));

    if (clusterNumbers.length === 0) {
      return "1";
    }

    const maxNumber = Math.max(...clusterNumbers);
    return (maxNumber + 1).toString();
  };

  const handleResetProject = async () => {
    try {
      await resetProject();
      toast.success("Project reset successfully!");
      setResetProjectDialogOpen(false);
      await silentRefetch();
    } catch (error) {
      console.error("Failed to reset project:", error);
      toast.error("Failed to reset project");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {loading ? (
        <div className="w-full p-4">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Skeleton */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-xl bg-gray-700" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-64 bg-gray-700" />
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-96 bg-gray-700" />
                    <Skeleton className="h-5 w-80 bg-gray-700" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-12 w-40 rounded-xl bg-gray-700" />
                  <Skeleton className="h-12 w-40 rounded-xl bg-gray-700" />
                </div>
              </div>

              {/* Stats Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-6 border-t border-gray-700">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20 bg-gray-600" />
                        <Skeleton className="h-8 w-12 bg-gray-600" />
                      </div>
                      <Skeleton className="h-10 w-10 rounded-lg bg-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics Cards Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl"
                >
                  <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-40 bg-gray-600" />
                        <Skeleton className="h-4 w-32 bg-gray-600" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-xl bg-gray-600" />
                    </div>
                  </div>
                  <div className="p-6">
                    <Skeleton className="h-80 w-full rounded-xl bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 m-4">
            {project && (
              <div className="flex-1">
                {/* Header with title and buttons aligned horizontally */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex-1 max-w-2xl" data-testid="project-header">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {project.project_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                          {project.project_name}
                        </h1>
                        {/* <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm font-medium">
                            Active Project
                          </span>
                        </div> */}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-gray-300 text-lg leading-relaxed">
                        Project management dashboard with advanced image
                        clustering and tagging capabilities
                      </p>
                      <p className="text-gray-400 text-base leading-relaxed">
                        Upload your images and use the workspace to organize,
                        filter, and manage your content with intelligent
                        clustering.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Professional Design */}
                  <div className="flex flex-col gap-3 ml-8">
                    {/* Upload Button */}
                    <Button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 min-w-[160px]"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      <span>Upload Images</span>
                    </Button>
                    {/* Reset Project Button */}
                    <Button
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 min-w-[160px]"
                      onClick={() => setResetProjectDialogOpen(true)}
                    >
                      <RefreshCw className="mr-2 h-5 w-5" />
                      <span>Reset Project</span>
                    </Button>

                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-700">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div data-testid="total-clusters-count">
                        <p className="text-gray-400 text-sm font-medium">
                          Total Clusters
                        </p>
                        <p className="text-white text-2xl font-bold">
                          {statistics.clusters.length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-blue-400 text-xl">📊</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div data-testid="total-tags-count">
                        <p className="text-gray-400 text-sm font-medium">
                          Total Tags
                        </p>
                        <p className="text-white text-2xl font-bold">
                          {statistics.tags.length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-purple-400 text-xl">🏷️</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div data-testid="total-images-count">
                        <p className="text-gray-400 text-sm font-medium">
                          Total Images
                        </p>
                        <p className="text-white text-2xl font-bold">
                          {statistics.clusters.reduce(
                            (sum, cluster) => sum + cluster.frequency,
                            0
                          )}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 text-xl">🖼️</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lazy-loaded Upload Dialog */}
          <UploadDialog
            isOpen={uploadDialogOpen}
            onClose={setUploadDialogOpen}
            projectId={projectId}
          />

          {/* Lazy-loaded Create Cluster Dialog */}
          <CreateClusterDialog
            isOpen={createClusterDialogOpen}
            onClose={setCreateClusterDialogOpen}
            projectId={projectId}
            nextClusterNumber={getNextClusterNumber()}
            onClusterCreated={handleClusterCreated}
            labels={uniqueLabels}
          />

          {/* Lazy-loaded Cluster Info Dialog */}
          <ClusterInfoDialog
            isOpen={clusterInfoDialogOpen}
            onClose={() => setClusterInfoDialogOpen(false)}
            cluster={selectedCluster}
            projectId={projectId}
            onClusterUpdated={handleClusterCreated}
            labels={uniqueLabels}
            silentRefetch={silentRefetch}
          />

          {/* Reset Project Dialog */}
          <AlertDialog
            open={resetProjectDialogOpen}
            onOpenChange={setResetProjectDialogOpen}
          >
            <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 text-white sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Reset Project</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Are you sure you want to reset the project? This will set all images to their original clusters. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end space-x-2 mt-4">
                <AlertDialogCancel 
                  className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-gray-500"
                  onClick={() => setResetProjectDialogOpen(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleResetProject}
                >
                  Reset Project
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Analytics Dashboard - Professional Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
            {/* Cluster Analytics Component */}
            <ClusterAnalytics 
              statistics={statistics} 
              onCreateCluster={() => setCreateClusterDialogOpen(true)}
              onClusterClick={handleClusterClick}
            />

            {/* Tag Analytics Component */}
            <TagAnalytics statistics={statistics} />
          </div>

          <div className="relative w-full h-screen flex">

            {/* Filter Sidebar Component */}
            <FilterSidebar
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              statistics={statistics}
              clusters={clusters}
              setClusters={setClusters}
              labels={labels}
              setLabels={setLabels}
              tags={tags}
              setTags={setTags}
              relocatedImages={relocatedImages}
              setRelocatedImages={setRelocatedImages}
              appliedClusters={appliedClusters}
              setAppliedClusters={setAppliedClusters}
              appliedLabels={appliedLabels}
              setAppliedLabels={setAppliedLabels}
              appliedTags={appliedTags}
              setAppliedTags={setAppliedTags}
              appliedRelocatedImages={appliedRelocatedImages}
              setAppliedRelocatedImages={setAppliedRelocatedImages}
              handleSearch={handleSearch}
              currentProject={project}
            />

            {/* Main workspace content */}
            <div className="flex-1 flex flex-col bg-gray-900/50">
              <div className="flex flex-col gap-6 min-h-screen p-8">
                {/* Project header */}
                {project && (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {project.project_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-white mb-1">
                          {project.project_name} - Workspace
                        </h1>
                        <p className="text-gray-400">
                          Manage and view your project with advanced filtering and
                          batch operations
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Display Area */}
                <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar">
                  <div className="h-full">
                    {loadingImages ? (
                      <div className="flex justify-center items-center min-h-[400px]">
                        <div className="flex space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse delay-100"></div>
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-600 rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                    ) : images && images.length > 0 ? (
                      <ImageDisplay
                        data={images}
                        setSelectedImage={imageEditor.setSelectedImage}
                        tagValue={imageEditor.tagValue}
                        handleChanges={imageEditor.handleChanges}
                        setTagValue={imageEditor.setTagValue}
                        newCluster={imageEditor.newCluster}
                        setNewCluster={imageEditor.setNewCluster}
                        removeTag={imageEditor.removeTag}
                        error={imageEditor.error}
                        setError={imageEditor.setError}
                        // Batch editing props
                        selectedImages={imageEditor.selectedImages}
                        batchMode={imageEditor.batchMode}
                        setBatchMode={imageEditor.setBatchMode}
                        batchTagValue={imageEditor.batchTagValue}
                        setBatchTagValue={imageEditor.setBatchTagValue}
                        batchNewCluster={imageEditor.batchNewCluster}
                        setBatchNewCluster={imageEditor.setBatchNewCluster}
                        handleBatchChanges={imageEditor.handleBatchChanges}
                        toggleImageSelection={imageEditor.toggleImageSelection}
                        clearBatchSelection={imageEditor.clearBatchSelection}
                        tags={statistics.tags || []}
                      />
                    ) : (
                      <div className="flex items-center justify-center min-h-[400px] p-8">
                        <div className="text-center max-w-md">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <span className="text-gray-400 text-3xl">🖼️</span>
                          </div>
                          <h3 className="text-gray-300 text-xl font-semibold mb-3">
                            No images available
                          </h3>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            Use the search filters in the sidebar to find images, or
                            upload some images from the project page to get started.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
