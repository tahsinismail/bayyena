'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiService } from '@/services/api';
import { ActivityLogCard } from '@/components/ActivityLogCard';
import { useRouter } from 'next/navigation';
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
  MdVisibilityOff,
  MdHome,
  MdDelete
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
  onOpenDialog: (type: 'password' | 'role' | 'status' | 'delete', user: User) => void;
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
    // Allow password change for all users (including current user)
    onOpenDialog('password', userData);
  }, [onOpenDialog, userData]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCurrentUser) {
      onOpenDialog('delete', userData);
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
      <td className={`py-3 px-4 text-muted-foreground ${language === 'ar' ? '' : ''}`} dir="ltr">
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
          className={`flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-sm transform-gpu ${language === 'ar' ? 'text-arabic' : ''}`}
        >
          <MdLockReset className="h-4 w-4" />
          {t('admin.userManagement.changePassword')}
        </Button>
      </td>
      
      {/* Actions - Delete Button */}
      <td className="py-3 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isCurrentUser}
          className={`flex items-center gap-2 transition-all duration-200 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 ${
            isCurrentUser 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-sm transform-gpu'
          }`}
        >
          <MdDelete className="h-4 w-4" />
          {t('admin.userManagement.deleteUser')}
        </Button>
      </td>
    </tr>
  );
});

export function AdminPanelPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogState, setDialogState] = useState<{
    type: 'password' | 'role' | 'status' | 'delete' | null;
    user: User | null;
  }>({ type: null, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user, loading: userLoading } = useApp();
  const { language, t, dir } = useLanguage();
  const router = useRouter();

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
      setError('');
      const usersData = await apiService.getUsers();
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errors.failedToLoadUsers'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Authentication and authorization check
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/');
        return;
      }
      
      if (user.role !== 'admin') {
        // Not admin, redirect to dashboard
        router.push('/');
        return;
      }
      
      // User is admin, load users
      loadUsers();
    }
  }, [user, userLoading, router, loadUsers]);

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
    } else if (dialogState.type === 'delete') {
      handleDeleteUser(dialogState.user.id);
    }
  }, [dialogState, handlePasswordChange, handleRoleChange, handleStatusToggle, handleDeleteUser]);

  const isDialogActionDisabled = useMemo(() => {
    return isActionLoading || (dialogState.type === 'password' && (!newPassword || newPassword.length < 6));
  }, [isActionLoading, dialogState.type, newPassword]);

  const openDialog = useCallback((type: 'password' | 'role' | 'status' | 'delete', user: User) => {
    setDialogState({ type, user });
    setError('');
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ type: null, user: null });
    setNewPassword('');
    setShowPassword(false);
    setError('');
  }, []);

  const goHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Show loading while checking auth
  if (userLoading) {
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

  // Don't render anything if redirecting
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="min-w-max max-full mx-auto space-y-6">
        {/* Header with Navigation */}
        <div className="flex justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <MdAdminPanelSettings className="h-8 w-8 text-primary" />
            <h1 className={`text-3xl font-bold text-foreground ${language === 'ar' ? 'arabic-text' : 'english-text'}`}>
              {t('admin.title')}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goHome}
            className={`flex items-center gap-2 ${language === 'ar' ? 'arabic-text' : 'english-text'}`}
          >
            <MdHome className="h-4 w-4" />
            {t('admin.backToDashboard')}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className={`text-red-600 dark:text-red-400 ${language === 'ar' ? 'arabic-text' : 'english-text'}`}>
              {error}
            </p>
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold text-foreground ${language === 'ar' ? 'arabic-text' : 'english-text'}`}>
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
                      <th className={`text-left py-3 px-4 font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('admin.userManagement.deleteUser')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((userData) => (
                        <UserTableRow
                          key={userData.id}
                          userData={userData}
                          currentUserId={user?.id}
                          language={language}
                          t={t}
                          onOpenDialog={openDialog}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          <p className={`text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                            {error ? t('admin.userManagement.errorLoading') : t('admin.userManagement.noUsers')}
                          </p>
                          {error && (
                            <Button 
                              onClick={loadUsers} 
                              variant="outline" 
                              className="mt-2"
                              disabled={loading}
                            >
                              {t('admin.userManagement.retry')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )}
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
                  {dialogState.type === 'delete' && t('admin.userManagement.deleteUser')}
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

                {dialogState.type === 'delete' && (
                  <div className="space-y-4">
                    <p className={`text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {t('admin.userManagement.deleteConfirmation')}
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className={`text-sm text-red-600 dark:text-red-400 font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                        ⚠️ This action cannot be undone
                      </p>
                    </div>
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
                  className={dialogState.type === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
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
                      {dialogState.type === 'delete' && t('admin.userManagement.deleteUser')}
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
