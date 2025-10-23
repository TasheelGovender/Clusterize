/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeleteConfirmDialog from "../../../components/dialogs/DeleteConfirmDialog";

// Mock dialog primitives to avoid portal behavior
jest.mock("../../../components/ui/dialog", () => ({
  Dialog: ({ children, open }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h1>{children}</h1>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  projectName: "Test Project",
  error: null,
  setError: jest.fn(),
};

describe("DeleteConfirmDialog", () => {
  describe("rendering", () => {
    it("renders dialog with title and confirmation message when open", () => {
      render(<DeleteConfirmDialog {...defaultProps} />);
      
      expect(screen.getByText("Delete Project")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "Test Project"/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<DeleteConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("displays project name in confirmation message", () => {
      render(<DeleteConfirmDialog {...defaultProps} projectName="My Special Project" />);
      
      expect(screen.getByText(/Are you sure you want to delete "My Special Project"/)).toBeInTheDocument();
    });

    it("displays error message when error prop is provided", () => {
      render(<DeleteConfirmDialog {...defaultProps} error="Test error message" />);
      
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("does not display error message when error is null", () => {
      render(<DeleteConfirmDialog {...defaultProps} error={null} />);
      
      expect(screen.queryByText(/Test error message/)).not.toBeInTheDocument();
    });
  });

  describe("confirmation flow", () => {
    it("calls onConfirm when Delete button is clicked", async () => {
      const onConfirm = jest.fn().mockResolvedValue();
      const setError = jest.fn();

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          setError={setError}
        />
      );
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith(null);
        expect(onConfirm).toHaveBeenCalled();
      });
    });

    it("shows loading state during deletion", async () => {
      const onConfirm = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("handles confirmation error", async () => {
      const onConfirm = jest.fn().mockRejectedValue(new Error("Delete failed"));
      const setError = jest.fn();

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          setError={setError}
        />
      );
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Failed to delete project. Please try again.");
      });

      // Should re-enable buttons after error
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      });
    });

    it("does not close dialog automatically after successful confirmation", async () => {
      const onConfirm = jest.fn().mockResolvedValue();
      const onClose = jest.fn();

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Should not automatically call onClose - parent handles closing
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("dialog closing", () => {
    it("calls onClose when Cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<DeleteConfirmDialog {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      
      expect(onClose).toHaveBeenCalled();
    });



    it("disables cancel button when deletion is in progress", () => {
      const onConfirm = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
        />
      );
      
      // Start deletion
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      // Cancel button should be disabled during deletion
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("button states", () => {
    it("enables both buttons initially", () => {
      render(<DeleteConfirmDialog {...defaultProps} />);
      
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    });

    it("disables both buttons during deletion", async () => {
      const onConfirm = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    });

    it("re-enables buttons after deletion completes", async () => {
      const onConfirm = jest.fn().mockResolvedValue();

      render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
      });
    });
  });

  describe("error handling", () => {
    it("clears error before starting deletion", async () => {
      const onConfirm = jest.fn().mockResolvedValue();
      const setError = jest.fn();

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          setError={setError}
          error="Previous error"
        />
      );
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      expect(setError).toHaveBeenCalledWith(null);
    });

    it("sets error message when deletion fails", async () => {
      const onConfirm = jest.fn().mockRejectedValue(new Error("Network error"));
      const setError = jest.fn();

      render(
        <DeleteConfirmDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          setError={setError}
        />
      );
      
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Failed to delete project. Please try again.");
      });
    });
  });
});