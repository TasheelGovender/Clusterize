"use client"

import { Toaster as Sonner } from "sonner";

const Toaster = ({
  theme = "dark", 
  position = "bottom-center", 
  ...props
}) => {
  return (
    <Sonner
      theme={theme}
      position={position}
      className="toaster group"
      expand={true}
      richColors={true}
      duration={4000} // 4 seconds
      toastOptions={{
        style: {
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          border: '1px solid #374151',
          color: '#f9fafb',
          borderRadius: '12px',
          fontSize: '14px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
        className: 'toast-custom',
        duration: 4000,
      }}
      {...props} />
  );
}

export { Toaster }
