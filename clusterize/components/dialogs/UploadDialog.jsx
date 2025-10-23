"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFileUpload, useCSVUpload } from "@/hooks";

export default function UploadDialog({ isOpen, onClose, projectId }) {
  const fileUpload = useFileUpload(projectId);
  const csvUpload = useCSVUpload(projectId);

  // Handle dialog close and reset files
  const handleDialogChange = (open) => {
    onClose(open);
    if (!open) {
      fileUpload.resetFiles();
      csvUpload.resetCSV();
    }
  };

  const handleFileUploadComplete = async () => {
    const result = await fileUpload.handleUploadImages();
    if (result) {
      onClose(false);
    }
  };

  const handleCSVUploadComplete = async () => {
    const result = await csvUpload.handleCSV();
    if (result) {
      onClose(false);
    }
  };

  function UploadingSpinner() {
    return (
      <div className="flex flex-col items-center">
        <svg
          className="animate-spin h-10 w-10 text-emerald-400"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        <span className="mt-2 text-emerald-400 font-semibold">
          Uploading...
        </span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 shadow-2xl">
        <Tabs defaultValue="images" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-600">
            <TabsTrigger
              value="csv"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              CSV
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              Images
            </TabsTrigger>
          </TabsList>
          <TabsContent value="images" className="mt-6 space-y-6" data-testid="images-tab">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-white">
                Upload Images
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Upload images for your project analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={fileUpload.handleButtonClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                Select Files
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileUpload.fileInputRef}
                onChange={fileUpload.handleFileChange}
                style={{ display: "none" }}
              />
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                {fileUpload.files.length > 0 ? (
                  <p className="text-slate-300">
                    You have selected {fileUpload.counter} files
                  </p>
                ) : (
                  <p className="text-slate-400">No files selected</p>
                )}
              </div>
               {fileUpload.files.length > 0 && (
                <Button
                  onClick={handleFileUploadComplete}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
                >
                  Upload
                </Button>
              )}
            </div>
            {fileUpload.uploading && <UploadingSpinner />}
          </TabsContent>
          <TabsContent value="csv" className="mt-6 space-y-6" data-testid="csv-tab">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-white">
                Upload CSV
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Upload CSV files for your project analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={csvUpload.handleCSVButtonClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                Select CSV Files
              </Button>
              <input
                type="file"
                accept=".csv"
                ref={csvUpload.csvInputRef}
                onChange={csvUpload.handleFile}
                style={{ display: "none" }}
              />
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                {csvUpload.csvFiles.length > 0 ? (
                  <p className="text-slate-300">You have selected a file</p>
                ) : (
                  <p className="text-slate-400">No files selected</p>
                )}
              </div>
              {csvUpload.clusterData.length > 0 && (
                <Button
                  onClick={handleCSVUploadComplete}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
                >
                  Upload CSV
                </Button>
              )}
            </div>
            {csvUpload.uploading && <UploadingSpinner />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
