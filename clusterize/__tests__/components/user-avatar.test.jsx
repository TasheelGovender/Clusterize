import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserAvatar } from "@/components/user-avatar";

// Mock useUser from Auth0
jest.mock("@auth0/nextjs-auth0/client", () => ({
  useUser: jest.fn(),
}));

describe("UserAvatar", () => {
  const mockUser = {
    name: "Jane Doe",
    email: "jane@example.com",
    picture: "https://example.com/avatar.jpg",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing if user is not present", () => {
    require("@auth0/nextjs-auth0/client").useUser.mockReturnValue({ user: null });
    const { container } = render(<UserAvatar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders avatar and user info when user is present", () => {
    require("@auth0/nextjs-auth0/client").useUser.mockReturnValue({ user: mockUser });
    render(<UserAvatar />);
    // Avatar initials fallback
    expect(screen.getByText("JD")).toBeInTheDocument();
    // Dropdown trigger (button)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

//   it("shows dropdown with user name and email when triggered", () => {
//     require("@auth0/nextjs-auth0/client").useUser.mockReturnValue({ user: mockUser });
//     render(<UserAvatar />);
//     // Open dropdown
//     fireEvent.click(screen.getByRole("button"));
//     expect(screen.getByText("Profile")).toBeInTheDocument();
//     expect(screen.getByText("Log out")).toBeInTheDocument();
//   });

//   it("navigates to profile when Profile is clicked", () => {
//     require("@auth0/nextjs-auth0/client").useUser.mockReturnValue({ user: mockUser });
//     render(<UserAvatar />);
//     fireEvent.click(screen.getByRole("button"));
//     // Mock window.location.href
//     delete window.location;
//     window.location = { href: "" };
//     fireEvent.click(screen.getByText("Profile"));
//     expect(window.location.href).toBe("/user-profile");
//   });

//   it("navigates to logout when Log out is clicked", () => {
//     require("@auth0/nextjs-auth0/client").useUser.mockReturnValue({ user: mockUser });
//     render(<UserAvatar />);
//     fireEvent.click(screen.getByRole("button"));
//     // Mock window.location.href
//     delete window.location;
//     window.location = { href: "" };
//     fireEvent.click(screen.getByText("Log out"));
//     expect(window.location.href).toBe("/api/auth/logout");
//   });
});