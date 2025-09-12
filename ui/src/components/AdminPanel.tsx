'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiService } from '@/services/api';
import { ActivityLogCard } from '@/components/ActivityLogCard';
import type { CurrentView } from '@/components/MainLayout';
import { 
  MdPerson, 
  MdAdminPanelSettings, 
  MdBlock, 
  MdCheckCircle,
  MdArrowBack,
  MdSupervisorAccount,
  MdLockReset,
  MdClose,
  MdVisibility,
  MdVisibilityOff
} from 'react-icons/md';

interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  isActive: number;
  createdAt: string;
}

interface AdminPanelProps {
  onViewChange: (view: CurrentView) => void;
}

// Memoized user row component to prevent unnecessary re-renders
const UserTableRow = memo(function UserTableRow({
  userData,
  currentUserId,
  language,
  t,
  onOpenDialog
}: {
  userData: User;
  currentUserId: number | undefined;
  language: string;
  t: (key: string) => string;
  onOpenDialog: (type: 'password' | 'role' | 'status', user: User) => void;
}) {
  const isCurrentUser = userData.id === currentUserId;

  const handleRoleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCurrentUser) {
      onOpenDialog('role', userData);
    }
  }, [isCurrentUser, onOpenDialog, userData]);

  const handleStatusClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCurrentUser) {
      onOpenDialog('status', userData);
    }
  }, [isCurrentUser, onOpenDialog, userData]);

  const handlePasswordClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCurrentUser) {
      onOpenDialog('password', userData);
    }
  }, [isCurrentUser, onOpenDialog, userData]);

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      {/* User ID */}
      <td className={`py-3 px-4 text-muted-foreground font-mono text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>
        #{userData.id}
      </td>
      
      {/* User Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MdPerson className="h-4 w-4 text-primary" />
          </div>
          <span className={`font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
            {userData.fullName}
          </span>
        </div>
      </td>
      
      {/* Email */}
      <td className={`py-3 px-4 text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
        {userData.email}
      </td>
      
      {/* Phone Number */}
      <td className={`py-3 px-4 text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
        {userData.phoneNumber || '-'}
      </td>
      
      {/* Role */}
      <td className="py-3 px-4">
        <button
          onClick={handleRoleClick}
          disabled={isCurrentUser}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            userData.role === 'admin' 
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          } ${isCurrentUser 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-sm cursor-pointer transform-gpu'
          }`}
        >
          {userData.role === 'admin' ? (
            <MdAdminPanelSettings className="h-3 w-3" />
          ) : (
            <MdPerson className="h-3 w-3" />
          )}
          <span className={language === 'ar' ? 'text-arabic' : ''}>
            {userData.role === 'admin' ? t('admin.userManagement.adminRole') : t('admin.userManagement.userRole')}
          </span>
        </button>
      </td>
      
      {/* Status */}
      <td className="py-3 px-4">
        <button
          onClick={handleStatusClick}
          disabled={isCurrentUser}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            userData.isActive 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          } ${isCurrentUser 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-sm cursor-pointer transform-gpu'
          }`}
        >
          {userData.isActive ? (
            <MdCheckCircle className="h-3 w-3" />
          ) : (
            <MdBlock className="h-3 w-3" />
          )}
          <span className={language === 'ar' ? 'text-arabic' : ''}>
            {userData.isActive ? t('admin.userManagement.active') : t('admin.userManagement.disabled')}
          </span>
        </button>
      </td>
      
      {/* Joined Date */}
      <td className="py-3 px-4 text-muted-foreground text-sm">
        {new Date(userData.createdAt).toLocaleDateString()}
      </td>
      
      {/* Actions - Change Password Button */}
      <td className="py-3 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePasswordClick}
          disabled={isCurrentUser}
          className={`flex items-center gap-2 transition-all duration-200 ${language === 'ar' ? 'text-arabic' : ''} ${
            isCurrentUser 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-sm transform-gpu'
          }`}
        >
          <MdLockReset className="h-4 w-4" />
          {t('admin.userManagement.changePassword')}
        </Button>
      </td>
    </tr>
  );
});

export function AdminPanel({ onViewChange }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogState, setDialogState] = useState<{
    type: 'password' | 'role' | 'status' | null;
    user: User | null;
  }>({ type: null, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user, loading: userLoading } = useApp();
  const { language, t, dir } = useLanguage();

  // Memoize the fetchData functions to prevent unnecessary re-renders
  const fetchAdminActivity = useCallback(() => {
    return apiService.getAdminActivity(10);
  }, []);

  const fetchUserActivity = useCallback(() => {
    return apiService.getUserActivity(undefined, 10);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await apiService.getUsers();
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Load users once we have user context and they are confirmed as admin
    if (!userLoading && user && user.role === 'admin') {
      loadUsers();
    } else if (!userLoading && user) {
      // If user is loaded but not admin, ensure loading is false
      setLoading(false);
    }
  }, [user, userLoading, loadUsers]);

  const handleRoleChange = useCallback(async (userId: number, newRole: 'user' | 'admin') => {
    try {
      setIsActionLoading(true);
      await apiService.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setDialogState({ type: null, user: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToUpdateRole'));
    } finally {
      setIsActionLoading(false);
    }
  }, [t]);

  const handleStatusToggle = useCallback(async (userId: number, isActive: boolean) => {
    try {
      setIsActionLoading(true);
      await apiService.toggleUserStatus(userId, isActive);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: isActive ? 1 : 0 } : u));
      setDialogState({ type: null, user: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToUpdateStatus'));
    } finally {
      setIsActionLoading(false);
    }
  }, [t]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    try {
      setIsActionLoading(true);
      await apiService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDialogState({ type: null, user: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToDeleteUser'));
    } finally {
      setIsActionLoading(false);
    }
  }, [t]);

  const handlePasswordChange = useCallback(async (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setIsActionLoading(true);
      await apiService.changeUserPassword(userId, newPassword);
      setNewPassword('');
      setDialogState({ type: null, user: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToChangePassword'));
    } finally {
      setIsActionLoading(false);
    }
  }, [newPassword, t]);

  const handlePasswordInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleDialogAction = useCallback(() => {
    if (!dialogState.user) return;
    
    if (dialogState.type === 'password') {
      handlePasswordChange(dialogState.user.id);
    } else if (dialogState.type === 'role') {
      const newRole = dialogState.user.role === 'admin' ? 'user' : 'admin';
      handleRoleChange(dialogState.user.id, newRole);
    } else if (dialogState.type === 'status') {
      handleStatusToggle(dialogState.user.id, !dialogState.user.isActive);
    }
  }, [dialogState, handlePasswordChange, handleRoleChange, handleStatusToggle]);

  const isDialogActionDisabled = useMemo(() => {
    return isActionLoading || (dialogState.type === 'password' && (!newPassword || newPassword.length < 6));
  }, [isActionLoading, dialogState.type, newPassword]);

  const openDialog = useCallback((type: 'password' | 'role' | 'status', user: User) => {
    setDialogState({ type, user });
    setError('');
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ type: null, user: null });
    setNewPassword('');
    setShowPassword(false);
    setError('');
  }, []);

  // Show loading while user context is being loaded
  if (userLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className={`text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
            {t('admin.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Only show access denied when user role is definitively set to 'user' (not admin)
  if (user.role === 'user') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-6 text-center bg-card border-border">
          <h1 className={`text-2xl font-bold text-foreground mb-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
            {t('admin.accessDenied')}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
            {t('admin.accessDeniedMessage')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full p-4 sm:p-6 lg:p-8 bg-background">
      <div className="min-w-max max-w-full mx-auto h-full flex flex-col space-y-6 overflow-hidden">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange({ type: 'settings' })}
            className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}
          >
            <MdArrowBack className="h-4 w-4" />
            {t('admin.backToSettings')}
          </Button>
          <div className="flex items-center gap-3">
            <MdAdminPanelSettings className="h-8 w-8 text-primary" />
            <h1 className={`text-2xl lg:text-3xl font-bold text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
              {t('admin.title')}
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className={`text-red-600 dark:text-red-400 ${language === 'ar' ? 'text-arabic' : ''}`}>
              {error}
            </p>
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
              {t('admin.userManagement.title')}
            </h2>
            <Button onClick={loadUsers} disabled={loading}>
              {loading ? t('admin.userManagement.loadingUsers') : t('admin.userManagement.refresh')}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className={`text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                {t('admin.userManagement.loadingUsers')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="relative">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.userId')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.user')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.email')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.phoneNumber')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.role')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.status')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.joined')}
                      </th>
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.changePassword')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userData) => (
                      <UserTableRow
                        key={userData.id}
                        userData={userData}
                        currentUserId={user?.id}
                        language={language}
                        t={t}
                        onOpenDialog={openDialog}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* Dialogs */}
        {dialogState.type && dialogState.user && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDialog();
              }
            }}
          >
            <div 
              className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 animate-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className={`text-lg font-semibold ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {dialogState.type === 'password' && t('admin.userManagement.changePassword')}
                  {dialogState.type === 'role' && t('admin.userManagement.changeRole')}
                  {dialogState.type === 'status' && (dialogState.user.isActive ? t('admin.userManagement.disableUser') : t('admin.userManagement.enableUser'))}
                </h3>
                <Button variant="ghost" size="sm" onClick={closeDialog}>
                  <MdClose className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                    {t('admin.userManagement.selectedUser')}: <strong>{dialogState.user.fullName}</strong>
                  </p>
                </div>

                {dialogState.type === 'password' && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={handlePasswordInputChange}
                          placeholder={t('admin.userManagement.newPasswordPlaceholder')}
                          className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={toggleShowPassword}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <MdVisibilityOff className="h-4 w-4" />
                          ) : (
                            <MdVisibility className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.passwordRequirement')}
                      </p>
                    </div>
                  </div>
                )}

                {dialogState.type === 'role' && (
                  <div className="space-y-4">
                    <p className={`text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {t('admin.userManagement.currentRole')}: <strong>{dialogState.user.role}</strong>
                    </p>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {t('admin.userManagement.changeRoleConfirmation')}
                    </p>
                  </div>
                )}

                {dialogState.type === 'status' && (
                  <div className="space-y-4">
                    <p className={`text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {dialogState.user.isActive 
                        ? t('admin.userManagement.disableUserConfirmation')
                        : t('admin.userManagement.enableUserConfirmation')
                      }
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className={`text-sm text-red-600 ${language === 'ar' ? 'text-arabic' : ''}`}>{error}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
                <Button variant="outline" onClick={closeDialog} disabled={isActionLoading}>
                  <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.cancel')}</span>
                </Button>
                <Button
                  onClick={handleDialogAction}
                  disabled={isDialogActionDisabled}
                >
                  {isActionLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className={language === 'ar' ? 'text-arabic' : ''}>{t('common.processing')}</span>
                    </div>
                  ) : (
                    <span className={language === 'ar' ? 'text-arabic' : ''}>
                      {dialogState.type === 'password' && t('admin.userManagement.changePassword')}
                      {dialogState.type === 'role' && t('admin.userManagement.changeRole')}
                      {dialogState.type === 'status' && (dialogState.user.isActive ? t('admin.userManagement.disableUser') : t('admin.userManagement.enableUser'))}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Logs Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityLogCard
            title={t('admin.activityLogs.adminActivity.title')}
            description={t('admin.activityLogs.adminActivity.description')}
            icon={<MdAdminPanelSettings className="h-5 w-5 text-blue-600" />}
            fetchData={fetchAdminActivity}
            emptyMessage={t('admin.activityLogs.adminActivity.empty')}
            className="h-fit"
          />
          <ActivityLogCard
            title={t('admin.activityLogs.userActivity.title')}
            description={t('admin.activityLogs.userActivity.description')}
            icon={<MdSupervisorAccount className="h-5 w-5 text-green-600" />}
            fetchData={fetchUserActivity}
            emptyMessage={t('admin.activityLogs.userActivity.empty')}
            className="h-fit"
          />
        </div>
      </div>
    </div>
  );
}
