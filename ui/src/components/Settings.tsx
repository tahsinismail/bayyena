"use client";

import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CurrentView } from "@/components/MainLayout";
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

interface SettingsProps {
  onViewChange?: (view: CurrentView) => void;
}

export const Settings = memo(function Settings({ onViewChange }: SettingsProps = {}) {
  const { user, logout, loading } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Memoized event handlers to prevent re-renders
  const handleAdminPanelAccess = useCallback(() => {
    // Always navigate to /admin route for better UX
    window.location.href = '/admin';
  }, []);

  const handleSignOut = useCallback(() => {
    logout();
  }, [logout]);

  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleLanguageChange = useCallback((newLanguage: 'en' | 'ar') => {
    setLanguage(newLanguage);
  }, [setLanguage]);

  const handleLanguageToggle = useCallback(() => {
    handleLanguageChange(language === 'en' ? 'ar' : 'en');
  }, [language, handleLanguageChange]);

  // Stable user computation
  const actualUser = useMemo(() => {
    return (user as any)?.user || user;
  }, [user]);

  // Simplified loading check
  const isLoading = useMemo(() => {
    return loading || !actualUser?.email || !actualUser?.fullName;
  }, [loading, actualUser]);
  
  if (isLoading) {
    return (
      <div className="min-w-full bg-background min-h-screen">
        <div className="max-w-4xl mx-auto p-6 space-y-8 bg-background min-h-screen">
          <div className="flex items-center gap-3 mb-8">
            <MdPerson className="h-6 w-6" />
            <h1 className={`text-2xl font-bold tracking-tight text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
              {t('settings.title')}
            </h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className={`ml-2 text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('settings.loading')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-full bg-background min-h-screen">
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <MdPerson className="h-6 w-6" />
        <h1 className={`text-2xl font-bold text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
          {t('settings.title')}
        </h1>
      </div>

      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
            <MdPerson className="h-5 w-5" />
            {t('settings.profile')}
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>
            {t('settings.profileDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.fullName')}
              </Label>
              <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'text-arabic' : ''}`}>
                {actualUser?.fullName || (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.loading')}</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.email')}
              </Label>
              <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'text-arabic' : ''}`}>
                {actualUser?.email || (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.loading')}</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.role')}
              </Label>
              <div className="mt-1">
                {actualUser?.role ? (
                  <Badge variant={actualUser.role === 'admin' ? 'default' : 'secondary'}>
                    <span className={language === 'ar' ? 'text-arabic' : ''}>
                      {actualUser.role === 'admin' ? t('settings.administrator') : t('settings.user')}
                    </span>
                  </Badge>
                ) : (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.loading')}</span>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.status')}
              </Label>
              <div className="mt-1">
                {actualUser?.isActive !== undefined ? (
                  <Badge variant={actualUser.isActive ? 'default' : 'secondary'}>
                    <span className={language === 'ar' ? 'text-arabic' : ''}>
                      {actualUser.isActive ? t('settings.active') : t('settings.inactive')}
                    </span>
                  </Badge>
                ) : (
                  <span className="text-orange-500 flex items-center gap-1">
                    <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.loading')}</span>
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
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
              <MdSecurity className="h-5 w-5" />
              {t('settings.administration')}
            </CardTitle>
            <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>
              {t('settings.adminDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4  md:flex-row items-start md:items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MdAdminPanelSettings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className={`font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                    {t('settings.adminPanel')}
                  </h3>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                    {t('settings.adminPanelDescription')}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleAdminPanelAccess} 
                variant="outline"
                className={language === 'ar' ? 'text-arabic' : ''}
              >
                {t('settings.openAdminPanel')}
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
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
            <MdSecurity className="h-5 w-5" />
            {t('settings.accountSecurity')}
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>
            {t('settings.accountSecurityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row items-start md:items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <MdLogout className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className={`font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('settings.signOut')}
                </h3>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('settings.signOutDescription')}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="destructive"
              className={`bg-red-600 hover:bg-red-700 ${language === 'ar' ? 'text-arabic' : ''}`}
            >
              {t('settings.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
            <MdPalette className="h-5 w-5" />
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>
            {t('settings.appearanceDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.theme')}
              </Label>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.themeDescription')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleThemeToggle}
              className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}
            >
              {theme === 'light' ? (
                <>
                  <MdDarkMode className="h-4 w-4" />
                  {t('settings.switchToDark')}
                </>
              ) : (
                <>
                  <MdLightMode className="h-4 w-4" />
                  {t('settings.switchToLight')}
                </>
              )}
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.language')}
              </Label>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.languageDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MdLanguage className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLanguageToggle}
                className={`${language === 'ar' ? 'text-arabic' : ''}`}
              >
                {language === 'en' ? t('settings.english') : t('settings.arabic')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
            <MdInfo className="h-5 w-5" />
            {t('settings.about')}
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>
            {t('settings.aboutDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.appVersion')}
              </Label>
              <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.version')}
              </p>
            </div>
            <div>
              <Label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.lastUpdated')}
              </Label>
              <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('settings.updateDate')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );    
});
