"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  MdLightMode, 
  MdDarkMode,
  MdAdminPanelSettings,
  MdLogout,
  MdPerson,
  MdPalette,
  MdSecurity,
  MdLanguage,
  MdInfo
} from "react-icons/md";

export function Settings() {
  const { user, logout, loading, contextVersion } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [retryCount, setRetryCount] = useState(0);
  
  console.log('Settings: Rendering with user:', user, 'loading:', loading, 'contextVersion:', contextVersion);

  // Debug user changes
  useEffect(() => {
    console.log('Settings: User state changed:', user);
  }, [user]);

  useEffect(() => {
    console.log('Settings: Loading state changed:', loading);
  }, [loading]);

  // Force re-evaluation if we're in a loading state but should have user data
  useEffect(() => {
    const actualUser = (user as any)?.user || user;
    if ((loading || !actualUser || !actualUser.email || !actualUser.fullName) && retryCount < 3) {
      console.log('Settings: Retrying user data check, attempt:', retryCount + 1);
      const timer = setTimeout(() => {
        setRetryCount((prev: number) => prev + 1);
      }, 500); // Wait 500ms and re-evaluate
      
      return () => clearTimeout(timer);
    }
  }, [loading, user, retryCount]);

  const handleAdminPanelAccess = () => {
    window.location.href = '/admin';
  };

  const handleSignOut = () => {
    logout();
  };

  // More robust loading check using useMemo to ensure proper re-evaluation
  const shouldShowLoading = useMemo(() => {
    // Handle potential nested user structure from backend
    const actualUser = (user as any)?.user || user; 
    const result = loading || !actualUser || !actualUser.email || !actualUser.fullName;
    console.log('Settings: shouldShowLoading computed:', result, {
      loading,
      user: user,
      actualUser: actualUser ? { id: actualUser.id, email: actualUser.email, fullName: actualUser.fullName } : null,
      contextVersion,
      hasEmail: !!actualUser?.email,
      hasFullName: !!actualUser?.fullName
    });
    return result;
  }, [loading, user, contextVersion]);
  
  // Handle potential nested user structure from backend
  const actualUser = (user as any)?.user || user;
  console.log('Settings: shouldShowLoading:', shouldShowLoading, 'loading:', loading, 'user:', user, 'actualUser.id:', actualUser?.id, 'retryCount:', retryCount);
  
  if (shouldShowLoading) {
    console.log('Settings: Showing loading - loading:', loading, 'user:', user, 'actualUser.email:', actualUser?.email, 'actualUser.fullName:', actualUser?.fullName);
    return (
      <div className="min-w-full bg-background min-h-screen">
        <div className="max-w-4xl mx-auto p-6 space-y-8 bg-background min-h-screen">
          <div className="flex items-center gap-3 mb-8">
            <MdPerson className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading settings...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log('Settings: Rendering main content for user:', actualUser?.fullName);

  return (
    <div className="min-w-full bg-background min-h-screen">
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <MdPerson className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MdPerson className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your account details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Full Name</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {actualUser?.fullName || (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span>Loading...</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {actualUser?.email || (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span>Loading...</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <div className="mt-1">
                {actualUser?.role ? (
                  <Badge variant={actualUser.role === 'admin' ? 'default' : 'secondary'}>
                    {actualUser.role === 'admin' ? 'Administrator' : 'User'}
                  </Badge>
                ) : (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span>Loading...</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                {actualUser?.isActive !== undefined ? (
                  <Badge variant={actualUser.isActive ? 'default' : 'secondary'}>
                    {actualUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ) : (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span>Loading...</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Admin & Security Section */}
      {actualUser?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MdSecurity className="h-5 w-5" />
              Administration
            </CardTitle>
            <CardDescription>
              Administrative functions and system management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MdAdminPanelSettings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium">Admin Panel</h3>
                  <p className="text-sm text-muted-foreground">
                    Access system administration features
                  </p>
                </div>
              </div>
              <Button onClick={handleAdminPanelAccess} variant="outline">
                Open Admin Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Application Settings */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MdNotifications className="h-5 w-5" />
            Application Preferences
          </CardTitle>
          <CardDescription>
            Configure how the application behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for important updates
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-save</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save your work as you type
              </p>
            </div>
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Storage</Label>
              <p className="text-sm text-muted-foreground">
                Manage your document storage and cache
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MdStorage className="h-4 w-4" />
              <span>Storage usage information coming soon</span>
            </div>
          </div>
        </CardContent>
      </Card> */}


      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MdSecurity className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security and session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <MdLogout className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">
                  End your current session and return to login
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MdPalette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose between light and dark themes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="flex items-center gap-2"
            >
              {theme === 'light' ? (
                <>
                  <MdDarkMode className="h-4 w-4" />
                  Switch to Dark
                </>
              ) : (
                <>
                  <MdLightMode className="h-4 w-4" />
                  Switch to Light
                </>
              )}
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Language</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred language
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MdLanguage className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">English (US)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MdInfo className="h-5 w-5" />
            About
          </CardTitle>
          <CardDescription>
            Application information and support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Application Version</Label>
              <p className="text-sm text-muted-foreground mt-1">Bayyena v1.0.0</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground mt-1">September 2025</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );    
}
