/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import UploadDialog from "../../../components/dialogs/UploadDialog";

// Mock hooks
const mockFileUpload = {
  files: [],
  counter: 0,
  uploading: false,
  handleButtonClick: jest.fn(),
  handleFileChange: jest.fn(),
  handleUploadImages: jest.fn(),
  resetFiles: jest.fn(),
  fileInputRef: { current: null },
};

const mockCSVUpload = {
  csvFiles: [],
  clusterData: [],
  uploading: false,
  handleCSVButtonClick: jest.fn(),
  handleFile: jest.fn(),
  handleCSV: jest.fn(),
  resetCSV: jest.fn(),
  csvInputRef: { current: null },
};

jest.mock("../../../hooks", () => ({
  useFileUpload: () => mockFileUpload,
  useCSVUpload: () => mockCSVUpload,
}));

// Mock UI components to avoid portal behavior
jest.mock("../../../components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h1>{children}</h1>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

jest.mock("../../../components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, ...props }) => (
    <button data-testid={`tab-trigger-${value}`} {...props}>{children}</button>
  ),
  TabsContent: ({ children, value }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Reset mock hook states
  mockFileUpload.files = [];
  mockFileUpload.counter = 0;
  mockFileUpload.uploading = false;
  mockCSVUpload.csvFiles = [];
  mockCSVUpload.clusterData = [];
  mockCSVUpload.uploading = false;
});

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  projectId: 123,
};

describe("UploadDialog", () => {
  describe("rendering", () => {
    it("renders dialog with tabs when open", () => {
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByTestId("tab-trigger-csv")).toBeInTheDocument();
      expect(screen.getByTestId("tab-trigger-images")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<UploadDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("sets images as default tab", () => {
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByTestId("tabs")).toHaveAttribute("data-default-value", "images");
    });
  });

  describe("Images tab", () => {
    it("renders images upload interface", () => {
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByText("Upload Images")).toBeInTheDocument();
      expect(screen.getByText("Upload images for your project analysis.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Select Files" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    });

    it("shows no files selected initially", () => {
      render(<UploadDialog isOpen={true} onClose={jest.fn()} projectId={1} />);
      
      const imagesTab = screen.getByTestId("tab-content-images");
      expect(within(imagesTab).getByText("No files selected")).toBeInTheDocument();
    });

    it("shows file count when files are selected", () => {
      mockFileUpload.files = ["file1.jpg", "file2.jpg"]; 
      mockFileUpload.counter = 2;                         

      render(<UploadDialog isOpen={true} onClose={jest.fn()} projectId={1} />);
      
      const imagesTab = screen.getByTestId("tab-content-images"); 
      expect(within(imagesTab).getByText("You have selected 2 files")).toBeInTheDocument();
    });

    it("calls handleButtonClick when Select Files is clicked", () => {
      render(<UploadDialog {...defaultProps} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Select Files" }));
      
      expect(mockFileUpload.handleButtonClick).toHaveBeenCalled();
    });

    it("calls handleUploadImages and closes dialog on successful upload", async () => {
      mockFileUpload.handleUploadImages.mockResolvedValue(true);
      const onClose = jest.fn();
      
      render(<UploadDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Upload" }));
      
      await waitFor(() => {
        expect(mockFileUpload.handleUploadImages).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledWith(false);
      });
    });

    it("does not close dialog on failed upload", async () => {
      mockFileUpload.handleUploadImages.mockResolvedValue(false);
      const onClose = jest.fn();
      
      render(<UploadDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Upload" }));
      
      await waitFor(() => {
        expect(mockFileUpload.handleUploadImages).toHaveBeenCalled();
      });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it("shows uploading spinner when uploading", () => {
      mockFileUpload.uploading = true;
      
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });
  });

  describe("CSV tab", () => {
    it("renders CSV upload interface", () => {
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByText("Upload CSV")).toBeInTheDocument();
      expect(screen.getByText("Upload CSV files for your project analysis.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Select CSV Files" })).toBeInTheDocument();
    });

    it("shows no files selected initially for CSV", () => {
      render(<UploadDialog {...defaultProps} />);
      
      const csvTab = screen.getByTestId("tab-content-csv");
      expect(within(csvTab).getByText("No files selected")).toBeInTheDocument();
    });

    it("shows file selected when CSV file is selected", () => {
      mockCSVUpload.csvFiles = ["data.csv"];
      
      render(<UploadDialog {...defaultProps} />);
      
      const csvTab = screen.getByTestId("tab-content-csv");
      expect(within(csvTab).getByText("You have selected a file")).toBeInTheDocument();
    });

    it("calls handleCSVButtonClick when Select CSV Files is clicked", () => {
      render(<UploadDialog {...defaultProps} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Select CSV Files" }));
      
      expect(mockCSVUpload.handleCSVButtonClick).toHaveBeenCalled();
    });

    it("shows Upload CSV button only when cluster data exists", () => {
      mockCSVUpload.clusterData = [{ cluster: "A" }];
      
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByRole("button", { name: "Upload CSV" })).toBeInTheDocument();
    });

    it("does not show Upload CSV button when no cluster data", () => {
      mockCSVUpload.clusterData = [];
      
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.queryByRole("button", { name: "Upload CSV" })).not.toBeInTheDocument();
    });

    it("calls handleCSV and closes dialog on successful CSV upload", async () => {
      mockCSVUpload.clusterData = [{ cluster: "A" }];
      mockCSVUpload.handleCSV.mockResolvedValue(true);
      const onClose = jest.fn();
      
      render(<UploadDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Upload CSV" }));
      
      await waitFor(() => {
        expect(mockCSVUpload.handleCSV).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledWith(false);
      });
    });

    it("does not close dialog on failed CSV upload", async () => {
      mockCSVUpload.clusterData = [{ cluster: "A" }];
      mockCSVUpload.handleCSV.mockResolvedValue(false);
      const onClose = jest.fn();
      
      render(<UploadDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Upload CSV" }));
      
      await waitFor(() => {
        expect(mockCSVUpload.handleCSV).toHaveBeenCalled();
      });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it("shows uploading spinner when CSV uploading", () => {
      mockCSVUpload.uploading = true;
      
      render(<UploadDialog {...defaultProps} />);
      
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });
  });

});