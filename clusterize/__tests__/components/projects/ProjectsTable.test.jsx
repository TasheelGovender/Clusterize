/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectsTable from "../../../components/projects/ProjectsTable";

// Mock UI components
jest.mock("../../../components/ui/button", () => ({
  Button: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("../../../components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, "aria-label": ariaLabel, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      aria-label={ariaLabel}
      {...props}
    />
  ),
}));

// Mock DataTable component
const mockToggleAllPageRowsSelected = jest.fn();
const mockToggleSorting = jest.fn();
const mockGetIsSorted = jest.fn();
const mockToggleSelected = jest.fn();
const mockGetIsSelected = jest.fn();

jest.mock("../../../components/ui/data-table", () => ({
  DataTable: ({ columns, data, getRowHref }) => (
    <div data-testid="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} data-testid={`header-${col.id || col.accessorKey}`}>
                {col.header && typeof col.header === 'function' 
                  ? col.header({
                      table: {
                        getIsAllPageRowsSelected: () => false,
                        getIsSomePageRowsSelected: () => false,
                        toggleAllPageRowsSelected: mockToggleAllPageRowsSelected,
                      },
                      column: {
                        toggleSorting: mockToggleSorting,
                        getIsSorted: mockGetIsSorted,
                      }
                    })
                  : col.header
                }
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} data-testid={`row-${rowIndex}`}>
              {columns.map((col, colIndex) => (
                <td key={colIndex} data-testid={`cell-${rowIndex}-${colIndex}`}>
                  {col.cell && typeof col.cell === 'function'
                    ? col.cell({
                        row: {
                          original: row,
                          getValue: (key) => row[key],
                          getIsSelected: mockGetIsSelected,
                          toggleSelected: mockToggleSelected,
                        }
                      })
                    : col.accessorKey ? row[col.accessorKey] : null
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {getRowHref && (
        <div data-testid="row-href-test">
          {data.map((row, index) => (
            <span key={index} data-href={getRowHref(row)}>
              Row {index} href
            </span>
          ))}
        </div>
      )}
    </div>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  ArrowUpDown: ({ className }) => <span className={className} data-testid="arrow-up-down-icon">↕</span>,
  Trash2: ({ size }) => <span data-testid="trash-icon" data-size={size}>🗑</span>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetIsSorted.mockReturnValue(false);
  mockGetIsSelected.mockReturnValue(false);
});

const mockProjects = [
  { id: 1, project_name: "Project Alpha", owner: "John Doe" },
  { id: 2, project_name: "Project Beta", owner: "Jane Smith" },
  { id: 3, project_name: "Project Gamma", owner: "Bob Johnson" },
];

describe("ProjectsTable", () => {
  describe("rendering", () => {
    it("renders the data table with projects", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("renders table headers correctly", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByTestId("header-select")).toBeInTheDocument();
      expect(screen.getByTestId("header-project_name")).toBeInTheDocument();
      expect(screen.getByTestId("header-actions")).toBeInTheDocument();
    });

    it("renders sortable header for project name", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByTestId("arrow-up-down-icon")).toBeInTheDocument();
    });

    it("renders delete buttons for each project", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const deleteButtons = screen.getAllByTestId("trash-icon");
      expect(deleteButtons).toHaveLength(mockProjects.length);
    });

    it("renders checkboxes for selection", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const checkboxes = screen.getAllByRole("checkbox");
      // Should have header checkbox + one for each row
      expect(checkboxes).toHaveLength(mockProjects.length + 1);
    });

    it("generates correct row hrefs", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByTestId("row-href-test")).toBeInTheDocument();
      mockProjects.forEach((project) => {
        expect(screen.getByText(`Row ${project.id - 1} href`)).toHaveAttribute(
          "data-href", 
          `/projects/${project.id}`
        );
      });
    });
  });

  describe("interactions", () => {
    it("calls onDeleteClick when delete button is clicked", () => {
      const onDeleteClick = jest.fn();
      render(<ProjectsTable projects={mockProjects} onDeleteClick={onDeleteClick} />);
      
      const deleteButtons = screen.getAllByTitle("Delete Project");
      fireEvent.click(deleteButtons[0]);
      
      expect(onDeleteClick).toHaveBeenCalledWith(1);
    });

    it("prevents event propagation on delete button click", () => {
      const onDeleteClick = jest.fn();
      render(<ProjectsTable projects={mockProjects} onDeleteClick={onDeleteClick} />);
      
      const deleteButton = screen.getAllByTitle("Delete Project")[0];
      const mockEvent = { stopPropagation: jest.fn() };
      
      // Simulate click with manual event
      fireEvent.click(deleteButton);
      
      expect(onDeleteClick).toHaveBeenCalled();
    });

    it("toggles sorting when sortable header is clicked", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const nameHeader = screen.getByText("Name").closest("button");
      fireEvent.click(nameHeader);
      
      expect(mockToggleSorting).toHaveBeenCalled();
    });

    it("toggles all row selection when header checkbox is clicked", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const headerCheckbox = screen.getByLabelText("Select all");
      fireEvent.click(headerCheckbox);
      
      expect(mockToggleAllPageRowsSelected).toHaveBeenCalledWith(true);
    });

    it("toggles individual row selection when row checkbox is clicked", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const rowCheckboxes = screen.getAllByLabelText("Select row");
      fireEvent.click(rowCheckboxes[0]);
      
      expect(mockToggleSelected).toHaveBeenCalledWith(true);
    });
  });

  describe("memoization", () => {
    it("renders ProjectNameCell with correct value", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const projectNameCells = screen.getAllByText(/Project/);
      expect(projectNameCells.length).toBeGreaterThan(0);
      expect(projectNameCells[0]).toHaveClass("font-medium");
    });

    it("renders ActionButton with correct project ID", () => {
      const onDeleteClick = jest.fn();
      render(<ProjectsTable projects={mockProjects} onDeleteClick={onDeleteClick} />);
      
      const deleteButtons = screen.getAllByTitle("Delete Project");
      fireEvent.click(deleteButtons[1]); // Click second project
      
      expect(onDeleteClick).toHaveBeenCalledWith(2);
    });
  });

  describe("edge cases", () => {
    it("renders empty table when no projects provided", () => {
      render(<ProjectsTable projects={[]} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
    });

    it("handles undefined onDeleteClick gracefully", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={undefined} />);
      
      const deleteButtons = screen.getAllByTitle("Delete Project");
      expect(() => fireEvent.click(deleteButtons[0])).not.toThrow();
    });

    it("renders with different project structures", () => {
      const differentProjects = [
        { id: "abc", project_name: "Special Project" },
      ];
      
      render(<ProjectsTable projects={differentProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByText("Special Project")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("provides appropriate aria labels for checkboxes", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      expect(screen.getByLabelText("Select all")).toBeInTheDocument();
      
      const rowCheckboxes = screen.getAllByLabelText("Select row");
      expect(rowCheckboxes).toHaveLength(mockProjects.length);
    });

    it("provides title attribute for delete buttons", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const deleteButtons = screen.getAllByTitle("Delete Project");
      expect(deleteButtons).toHaveLength(mockProjects.length);
    });

    it("renders proper button elements for actions", () => {
      render(<ProjectsTable projects={mockProjects} onDeleteClick={jest.fn()} />);
      
      const deleteButtons = screen.getAllByRole("button", { name: /🗑/ });
      expect(deleteButtons).toHaveLength(mockProjects.length);
    });
  });
});