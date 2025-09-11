"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FolderIcon, 
  FileTextIcon, 
  TrendingUpIcon, 
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MessageSquareIcon,
  ArchiveIcon
} from "lucide-react";
import { apiService } from "@/services/api";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardProps {
  onViewChange?: (view: { type: 'workspace'; workspaceId: string }) => void;
}

interface DashboardStats {
  totalCases: number;
  casesByPriority: {
    high: number;
    normal: number;
    low: number;
  };
  casesByStatus: {
    open: number;
    closed: number;
  };
  totalDocuments: number;
  processedDocuments: number;
  recentActivity: {
    recentCases: number;
    recentMessages: number;
  };
}

interface CaseData {
  id: string;
  name: string;
  priority: 'High' | 'Normal' | 'Low';
  status: 'Open' | 'Closed' | 'Archived';
  createdAt: string;
}

// Simple progress component
const Progress = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useApp();
  const { language, t, dir } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectWorkspace, loadChatTopics } = useApp();

  // Helper functions for content direction detection
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };

  const getUserContentClasses = (content: string) => {
    // Detect if content contains Arabic characters
    const arabicRegex = /[\u0600-\u06FF]/;
    const isArabicContent = arabicRegex.test(content);
    return isArabicContent ? 'text-arabic' : 'text-english';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats and recent cases
        const [dashboardStats, allCases] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getCases()
        ]);
        
        setStats(dashboardStats);
        
        // Get recent cases (last 7 days) and sort by creation date
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recent = allCases
          .filter((case_: any) => new Date(case_.createdAt) >= sevenDaysAgo)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5) // Only show 5 most recent
          .map((case_: any) => ({
            ...case_,
            status: case_.status // Status is now consistent
          }));
        
        setRecentCases(recent);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  const documentProcessingRate = stats.totalDocuments > 0 
    ? Math.round((stats.processedDocuments / stats.totalDocuments) * 100) 
    : 0;

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Normal': return 'default';
      case 'Low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Open': return 'default';
      case 'Closed': return 'outline';
      case 'Archived': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold tracking-tight text-foreground ${getUITextClasses()}`}>
            {t('dashboard.title')}
          </h1>
          <p className={`text-gray-600 ${getUITextClasses()}`}>
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Key Metrics Cards */}
                {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.metrics.activeCases')}</CardTitle>
              <FolderIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCases}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="h-3 w-3 inline text-green-500" /> +8% {t('dashboard.metrics.fromLastMonth')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.metrics.totalDocuments')}</CardTitle>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="h-3 w-3 inline text-green-500" /> +12% {t('dashboard.metrics.fromLastMonth')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.metrics.processedDocuments')}</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processedDocuments}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="h-3 w-3 inline text-green-500" /> +5% {t('dashboard.metrics.fromLastMonth')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.metrics.recentActivity')}</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity.recentMessages}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.metrics.chatMessages')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Priority and Status Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className={getUITextClasses()}>{t('dashboard.priority.title')}</CardTitle>
              <CardDescription className={getUITextClasses()}>{t('dashboard.priority.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium flex items-center ${getUITextClasses()}`}>
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    {t('dashboard.priority.high')}
                  </span>
                  <span className="text-sm font-bold">{stats.casesByPriority.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium flex items-center ${getUITextClasses()}`}>
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    {t('dashboard.priority.normal')}
                  </span>
                  <span className="text-sm font-bold">{stats.casesByPriority.normal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium flex items-center ${getUITextClasses()}`}>
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    {t('dashboard.priority.low')}
                  </span>
                  <span className="text-sm font-bold">{stats.casesByPriority.low}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={getUITextClasses()}>{t('dashboard.status.title')}</CardTitle>
              <CardDescription className={getUITextClasses()}>{t('dashboard.status.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium flex items-center ${getUITextClasses()}`}>
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    {t('dashboard.status.open')}
                  </span>
                  <span className="text-sm font-bold">{stats.casesByStatus.open}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium flex items-center ${getUITextClasses()}`}>
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    {t('dashboard.status.closed')}
                  </span>
                  <span className="text-sm font-bold">{stats.casesByStatus.closed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        {/* <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'text-arabic' : ''}>{t('dashboard.recentCases.title')}</CardTitle>
            <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>{t('dashboard.recentCases.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className={language === 'ar' ? 'text-arabic' : ''}>{t('dashboard.recentCases.noCases')}</p>
                <p className={`text-sm ${language === 'ar' ? 'text-arabic' : ''}`}>{t('dashboard.recentCases.createFirst')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCases.map((case_) => (
                  <div 
                    key={case_.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => {
                      const workspaceId = case_.id.toString();
                      selectWorkspace(workspaceId);
                      loadChatTopics(workspaceId);
                      if (onViewChange) {
                        onViewChange({ type: 'workspace', workspaceId });
                      }
                    }}
                  >
                    <div className="flex-1">
                      <h4 className={`font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>{case_.name}</h4>
                      <p className={`text-sm text-gray-500 ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('dashboard.recentCases.created')} {new Date(case_.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityBadgeVariant(case_.priority)}>
                        {case_.priority}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(case_.status)}>
                        {case_.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'text-arabic' : ''}>{t('dashboard.quickStats.title')}</CardTitle>
            <CardDescription className={language === 'ar' ? 'text-arabic' : ''}>{t('dashboard.quickStats.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div>
                  <p className={`font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>{t('dashboard.quickStats.completedCases')}</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.casesByStatus.closed}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <ClockIcon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className={`font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>{t('dashboard.quickStats.openCases')}</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.casesByStatus.open}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <AlertTriangleIcon className="h-8 w-8 text-red-500" />
                <div>
                  <p className={`font-medium text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>{t('dashboard.quickStats.highPriority')}</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.casesByPriority.high}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
