'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  MdHistory,
  MdRefresh,
  MdAdminPanelSettings,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdSecurity,
  MdLogin,
  MdLogout
} from 'react-icons/md';

interface ActivityLog {
  id: number;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
  adminName?: string;
  targetUserName?: string;
  userId?: number;
}

interface ActivityLogCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  fetchData: () => Promise<ActivityLog[]>;
  emptyMessage: string;
  className?: string;
}

export const ActivityLogCard = memo(function ActivityLogCard({ 
  title, 
  description, 
  icon, 
  fetchData, 
  emptyMessage,
  className = ""
}: ActivityLogCardProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { language, t } = useLanguage();
  
  // Ref to prevent multiple concurrent API calls
  const loadingRef = useRef(false);

  const loadActivities = useCallback(async () => {
    if (loadingRef.current) return; // Prevent concurrent calls
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError('');
      const data = await fetchData();
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchData]);

  // Only load activities once when the component mounts
  useEffect(() => {
    loadActivities();
  }, []);  // Empty dependency array to load only once

  const getActionIcon = useCallback((action: string) => {
    switch (action) {
      case 'login':
        return <MdLogin className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <MdLogout className="h-4 w-4 text-orange-600" />;
      case 'user_role_changed':
        return <MdAdminPanelSettings className="h-4 w-4 text-blue-600" />;
      case 'user_enabled':
        return <MdCheckCircle className="h-4 w-4 text-green-600" />;
      case 'user_disabled':
        return <MdBlock className="h-4 w-4 text-red-600" />;
      case 'user_deleted':
        return <MdDelete className="h-4 w-4 text-red-600" />;
      case 'feature_toggled':
        return <MdSecurity className="h-4 w-4 text-purple-600" />;
      default:
        return <MdHistory className="h-4 w-4 text-gray-600" />;
    }
  }, []);

  const getActionBadgeVariant = useCallback((action: string) => {
    switch (action) {
      case 'login':
      case 'user_enabled':
        return 'default' as const;
      case 'logout':
        return 'secondary' as const;
      case 'user_disabled':
      case 'user_deleted':
        return 'destructive' as const;
      case 'user_role_changed':
      case 'feature_toggled':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  }, []);

  const formatActionText = useCallback((action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('admin.activityLogs.timeAgo.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t('admin.activityLogs.timeAgo.minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t('admin.activityLogs.timeAgo.hoursAgo')}`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}${t('admin.activityLogs.timeAgo.daysAgo')}`;
    return date.toLocaleDateString();
  }, [t]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadActivities}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className={`text-muted-foreground text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>
              {t('admin.activityLogs.loading')}
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6">
            <MdHistory className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={getActionBadgeVariant(activity.action)} className="text-xs">
                      {formatActionText(activity.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    {activity.adminName && (
                      <p className="text-foreground">
                        <span className="font-medium">{activity.adminName}</span>
                        {activity.targetUserName && (
                          <span className="text-muted-foreground"> → {activity.targetUserName}</span>
                        )}
                      </p>
                    )}
                    
                    {activity.details && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {typeof activity.details === 'object' ? (
                          Object.entries(activity.details).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))
                        ) : (
                          <span>{String(activity.details)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
