"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/MainLayout";

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);
  const { user, loading } = useApp();

  // Show login/register form if user is not authenticated
  if (!user && !loading) {
    return showRegister ? (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RegisterForm 
          onSuccess={() => setShowRegister(false)}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      </div>
    ) : (
      <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Dashboard in main layout when user is authenticated
  return <MainLayout />;
}
