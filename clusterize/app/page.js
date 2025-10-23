"use client";

import { ArrowRight, Sparkles, Layers, Zap } from "lucide-react";

// Enhanced button component matching app theme
function GradientButton({ onClick, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 ${className}`}
    >
      {children}
      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
    </button>
  );
}

export default function Home() {
  return (
    <div className="relative w-full h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Brand area */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
              <Layers className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
              Clusterize
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-6"></div>
          </div>

          {/* Hero content */}
          <div className="mb-12">
            <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Organize, analyze, and manage your clustered data with filtering
              and tagging. Transform chaos into clarity.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
              <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50 backdrop-blur-sm">
                <Sparkles className="h-8 w-8 text-blue-400 mb-3 mx-auto" />
                <h3 className="text-white font-semibold mb-2">
                  Cluster Management
                </h3>
                <p className="text-gray-400 text-sm">
                  Manage existing clusters and create new ones with ease.
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-purple-400 mb-3 mx-auto" />
                <h3 className="text-white font-semibold mb-2">
                  Artifact Operations
                </h3>
                <p className="text-gray-400 text-sm">
                  Add tags to artifacts and filter images efficiently.
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50 backdrop-blur-sm">
                <Layers className="h-8 w-8 text-pink-400 mb-3 mx-auto" />
                <h3 className="text-white font-semibold mb-2">
                  Project Management
                </h3>
                <p className="text-gray-400 text-sm">
                  Organize your work into projects with detailed statistics
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <GradientButton
            onClick={() => (window.location.href = "/api/auth/login")}
            className="text-lg px-12 py-5"
          >
            Get Started
          </GradientButton>

          {/* Subtle footer text */}
          <p className="text-gray-500 text-sm mt-8">
            Sign in to begin organizing your image collections
          </p>
        </div>
      </div>
    </div>
  );
}
