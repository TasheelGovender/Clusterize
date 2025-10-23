/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateProjectDialog from "../../../components/dialogs/CreateProjectDialog";

// Mock dialog primitives to avoid portal behavior
jest.mock("../../../components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }) => 
    open ? <div data-testid="dialog" onClick={onOpenChange}>{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h1>{children}</h1>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

// Mock sonner toast
const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({ 
  toast: { 
    success: (...args) => toastSuccessMock(...args)
  } 
}));

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

afterEach(() => {
  global.fetch.mockRestore?.();
});

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onProjectCreated: jest.fn(),
  error: null,
  setError: jest.fn(),
};

describe("CreateProjectDialog", () => {
  describe("rendering", () => {
    it("renders dialog with title and input when open", () => {
      render(<CreateProjectDialog {...defaultProps} />);
      
      expect(screen.getByText("Create New Project")).toBeInTheDocument();
      expect(screen.getByText("Enter a name for your new project.")).toBeInTheDocument();
      expect(screen.getByLabelText("Project Name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter project name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<CreateProjectDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("displays error message when error prop is provided", () => {
      render(<CreateProjectDialog {...defaultProps} error="Test error message" />);
      
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("disables Create button when input is empty", () => {
      render(<CreateProjectDialog {...defaultProps} />);
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      expect(createButton).toBeDisabled();
    });

    it("enables Create button when input has text", () => {
      render(<CreateProjectDialog {...defaultProps} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      expect(createButton).toBeEnabled();
    });
  });

  describe("form submission", () => {
    it("creates project successfully and calls callbacks", async () => {
      const mockProject = { id: 1, name: "Test Project" };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      });

      const onClose = jest.fn();
      const onProjectCreated = jest.fn();
      const setError = jest.fn();

      render(
        <CreateProjectDialog 
          {...defaultProps} 
          onClose={onClose}
          onProjectCreated={onProjectCreated}
          setError={setError}
        />
      );
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/proxy/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: "Test Project",
            project_description: "Project Test Project created by user",
          }),
        });
      });

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith(null);
        expect(onClose).toHaveBeenCalled();
        expect(onProjectCreated).toHaveBeenCalledWith(mockProject);
        expect(toastSuccessMock).toHaveBeenCalledWith("Project created successfully!");
      });
    });

    it("shows loading state during creation", async () => {
      global.fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 100))
      );

      render(<CreateProjectDialog {...defaultProps} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      fireEvent.click(createButton);

      expect(screen.getByRole("button", { name: "Creating..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
      expect(input).toBeDisabled();
    });

    it("handles API error response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Project name already exists" }),
      });

      const setError = jest.fn();
      render(<CreateProjectDialog {...defaultProps} setError={setError} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Project name already exists");
      });
    });

    it("handles API error without error message", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const setError = jest.fn();
      render(<CreateProjectDialog {...defaultProps} setError={setError} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Failed to create project: 500");
      });
    });

    it("handles network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const setError = jest.fn();
      render(<CreateProjectDialog {...defaultProps} setError={setError} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      const createButton = screen.getByRole("button", { name: "Create Project" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Failed to create project. Please try again.");
      });
    });

    it("does not submit when input is empty", () => {
      render(<CreateProjectDialog {...defaultProps} />);
      
      const form = screen.getByRole("button", { name: "Create Project" }).closest("form");
      fireEvent.submit(form);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("dialog closing", () => {
    it("calls onClose when Cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<CreateProjectDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      
      expect(onClose).toHaveBeenCalled();
    });

    it("clears input and error when dialog is closed", () => {
      const setError = jest.fn();
      render(<CreateProjectDialog {...defaultProps} setError={setError} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      fireEvent.change(input, { target: { value: "Test Project" } });
      
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      
      expect(setError).toHaveBeenCalledWith(null);
    });
  });

  describe("form validation", () => {
    it("trims whitespace and validates input", () => {
      render(<CreateProjectDialog {...defaultProps} />);
      
      const input = screen.getByPlaceholderText("Enter project name");
      const createButton = screen.getByRole("button", { name: "Create Project" });
      
      // Only whitespace should keep button disabled
      fireEvent.change(input, { target: { value: "   " } });
      expect(createButton).toBeDisabled();
      
      // Actual text should enable button
      fireEvent.change(input, { target: { value: "  Test  " } });
      expect(createButton).toBeEnabled();
    });
  });
});