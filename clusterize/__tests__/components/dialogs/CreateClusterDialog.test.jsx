/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CreateClusterDialog from "../../../components/dialogs/CreateClusterDialog";

// Mocks for useCluster hook
const createClusterMock = jest.fn();

// Mutable flags for per-test control
let mockLoading = false;
let mockError = null;

jest.mock("../../../hooks", () => ({
  useCluster: () => ({
    createCluster: createClusterMock,
    loading: mockLoading,
    error: mockError,
  }),
}));

// Mock dialog primitives to avoid portal behavior
jest.mock("../../../components/ui/dialog", () => ({
    Dialog: ({ children }) => <div>{children}</div>,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <div>{children}</div>,
    DialogDescription: ({ children }) => <div>{children}</div>,
}));

// Mock sonner toast
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (...a) => toastSuccessMock(...a), error: (...a) => toastErrorMock(...a) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoading = false;
  mockError = null;
});

// Helpers
const renderDialog = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    projectId: 123,
    nextClusterNumber: "10",
    onClusterCreated: jest.fn(),
    labels: ["LabelA", "LabelB", "LabelC"],
  };
  return render(<CreateClusterDialog {...defaultProps} {...props} />);
};

describe("CreateClusterDialog - basics", () => {
  it("prefills cluster number from nextClusterNumber when opened", () => {
    renderDialog({ nextClusterNumber: "42" });
    const numberInput = screen.getByLabelText("Cluster Number *");
    expect(numberInput).toHaveValue("42");
    expect(numberInput).toHaveAttribute("readonly");
  });

  it("disables Create button when no cluster number (nextClusterNumber missing)", () => {
    renderDialog({ nextClusterNumber: undefined });
    const createBtn = screen.getByRole("button", { name: /create cluster/i });
    expect(createBtn).toBeDisabled();
  });

  it("shows loading state when loading is true", () => {
    mockLoading = true;
    renderDialog();
    const createBtn = screen.getByRole("button", { name: /creating/i });
    expect(createBtn).toBeDisabled();
  });

  it("clicking Cancel calls onClose(false)", () => {
    const onClose = jest.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledWith(false);
  });
});

describe("CreateClusterDialog - create flow", () => {
  it("calls createCluster with correct args, closes dialog, and triggers onClusterCreated + toast", async () => {
    createClusterMock.mockResolvedValueOnce({ ok: true });
    const onClose = jest.fn();
    const onClusterCreated = jest.fn();

    renderDialog({ onClose, onClusterCreated, nextClusterNumber: "7" });

    // Type a label (optional)
    const labelInput = screen.getByLabelText("Label (Optional)");
    fireEvent.change(labelInput, { target: { value: "Landscapes" } });

    // Click Create
    fireEvent.click(screen.getByRole("button", { name: /create cluster/i }));

    await waitFor(() => {
      expect(createClusterMock).toHaveBeenCalledWith(123, "7", "Landscapes");
    });

    // onClose(false) called via handleClose, toast shown, and onClusterCreated executed
    expect(onClose).toHaveBeenCalledWith(false);
    expect(onClusterCreated).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});

describe("CreateClusterDialog - fuzzy search", () => {
  it("shows suggestions for string label list and lets user select one", async () => {
    renderDialog({
      labels: ["LabelA", "LabelB", "LabelC"],
      nextClusterNumber: "9",
    });

    const labelInput = screen.getByLabelText("Label (Optional)");
    fireEvent.change(labelInput, { target: { value: "Lab" } });

    // Expect a suggestion to appear
    const suggestion = await screen.findByText("LabelB");
    expect(suggestion).toBeInTheDocument();

    // Click suggestion -> input updates and suggestions disappear
    fireEvent.click(suggestion);
    expect(labelInput).toHaveValue("LabelB");

    await waitFor(() => {
      expect(screen.queryByText("LabelB")).toBeNull();
    });
  });

  it("supports labels as objects with name property", async () => {
    renderDialog({
      labels: [{ name: "LabelA" }, { name: "LabelB" }, { name: "LabelC" }],
      nextClusterNumber: "11",
    });

    const labelInput = screen.getByLabelText("Label (Optional)");
    fireEvent.change(labelInput, { target: { value: "Lab" } });

    const suggestion = await screen.findByText("LabelC");
    expect(suggestion).toBeInTheDocument();

    fireEvent.click(suggestion);
    expect(labelInput).toHaveValue("LabelC");

    await waitFor(() => {
      expect(screen.queryByText("LabelC")).toBeNull();
    });
  });

  it("clear button resets search and label when visible", async () => {
    renderDialog();

    const labelInput = screen.getByLabelText("Label (Optional)");
    fireEvent.change(labelInput, { target: { value: "Lab" } });

    // Clear button appears when there is a searchQuery
    // There are multiple buttons; pick the clear one adjacent to the input
    const container = labelInput.closest(".relative");
    const clearBtn = within(container).getByRole("button");
    fireEvent.click(clearBtn);

    expect(labelInput).toHaveValue("");
    // Suggestions should be gone
    await waitFor(() => {
      expect(screen.queryByText("LabelA")).toBeNull();
      expect(screen.queryByText("LabelB")).toBeNull();
      expect(screen.queryByText("LabelC")).toBeNull();
    });
  });
});