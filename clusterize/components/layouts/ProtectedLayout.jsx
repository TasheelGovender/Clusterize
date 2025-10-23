"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function ProtectedLayout({ children }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on a project detail page
  const isProjectDetailPage = pathname.match(/\/projects\/[^\/]+$/);

  // Check if we're on a workspace page (hide avatar here)
  const isWorkspacePage = pathname.includes("/workspace/");

  const isUserProfilePage = pathname.includes("/user-profile");

  const handleBackClick = () => {
    router.push("/projects");
  };

  return (
    <main className="w-full h-full">
      {/* Header with back button and avatar - hidden on workspace pages */}
      {!isWorkspacePage && (
        <header className="flex items-center justify-between p-4">
          <div className="flex items-center mt-4">
            {isProjectDetailPage && (
              <Button
                variant="outline"
                onClick={handleBackClick}
                className="mr-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            )}
          </div>
          {!isUserProfilePage && (
            <div className="flex items-center space-x-4">
              <UserAvatar />
            </div>
          )}
        </header>
      )}

      {/* Main content */}
      <div className={isWorkspacePage ? "" : "p-4"}>{children}</div>
      
      {/* Toast notifications */}
      <Toaster />
    </main>
  );
}
