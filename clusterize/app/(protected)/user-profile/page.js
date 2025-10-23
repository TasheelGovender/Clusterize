"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Mail, User as UserIcon } from "lucide-react";

export default function UserProfile() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/logout";
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" data-testid="loading-animation">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse delay-100"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-600 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative w-full h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Not authenticated</h2>
            <p className="text-gray-400">Please sign in to view your profile</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto"></div>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <Avatar className="size-32 ring-4 ring-blue-500/20 ring-offset-4 ring-offset-gray-900">
                  <AvatarImage src={user.picture} alt={user.name} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {user.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-6">
              {/* Name */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold text-white">
                      {user.name || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl flex items-center justify-center">
                    <Mail className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Email Address
                    </label>
                    <p className="text-lg font-semibold text-white">
                      {user.email || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {user.email_verified !== undefined && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                      <div className={`w-3 h-3 rounded-full ${user.email_verified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-400 block mb-1">
                        Email Status
                      </label>
                      <p className="text-lg font-semibold text-white">
                        {user.email_verified ? "Verified" : "Not verified"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-700">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              
              <Button
                onClick={handleSignOut}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
