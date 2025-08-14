// frontend/src/components/QueueDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';

interface QueueStats {
  documentProcessing: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  userRequests: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  aiAnalysis: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  timestamp: string;
}

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  result?: any;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

const QueueDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string>('document-processing');
  const [jobId, setJobId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (user) {
      fetchQueueData();
      const interval = setInterval(fetchQueueData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const [statsResponse, healthResponse] = await Promise.all([
        api.get('/queue/stats'),
        api.get('/queue/health'),
      ]);
      
      setStats(statsResponse.data);
      setHealth(healthResponse.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch queue data');
      console.error('Error fetching queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getJobStatus = async () => {
    if (!jobId.trim()) return;
    
    try {
      const response = await api.get(`/queue/job/${selectedQueue}/${jobId}`);
      setJobStatus(response.data);
    } catch (err) {
      setError('Failed to get job status');
      console.error('Error getting job status:', err);
    }
  };

  const retryJob = async () => {
    if (!jobId.trim()) return;
    
    try {
      await api.post(`/queue/job/${selectedQueue}/${jobId}/retry`);
      setError(null);
      getJobStatus(); // Refresh job status
    } catch (err) {
      setError('Failed to retry job');
      console.error('Error retrying job:', err);
    }
  };

  const removeJob = async () => {
    if (!jobId.trim()) return;
    
    try {
      await api.delete(`/queue/job/${selectedQueue}/${jobId}`);
      setError(null);
      setJobStatus(null);
      setJobId('');
    } catch (err) {
      setError('Failed to remove job');
      console.error('Error removing job:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'active': return 'text-blue-600';
      case 'waiting': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Queue Dashboard</h1>
        <p className="text-gray-600">Monitor and manage background job processing</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Health Status */}
      {health && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${
              health.status === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                  health.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  Status: {health.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Statistics */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Document Processing Queue */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Document Processing</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Waiting:</span>
                  <span className="font-medium text-yellow-600">{stats.documentProcessing.waiting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium text-blue-600">{stats.documentProcessing.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{stats.documentProcessing.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">{stats.documentProcessing.failed}</span>
                </div>
              </div>
            </div>

            {/* User Requests Queue */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Requests</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Waiting:</span>
                  <span className="font-medium text-yellow-600">{stats.userRequests.waiting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium text-blue-600">{stats.userRequests.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{stats.userRequests.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">{stats.userRequests.failed}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis Queue */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Waiting:</span>
                  <span className="font-medium text-yellow-600">{stats.aiAnalysis.waiting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium text-blue-600">{stats.aiAnalysis.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{stats.aiAnalysis.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">{stats.aiAnalysis.failed}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {/* Job Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="queue-select" className="block text-sm font-medium text-gray-700 mb-2">
              Queue
            </label>
            <select
              id="queue-select"
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="document-processing">Document Processing</option>
              <option value="user-requests">User Requests</option>
              <option value="ai-analysis">AI Analysis</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="job-id" className="block text-sm font-medium text-gray-700 mb-2">
              Job ID
            </label>
            <input
              type="text"
              id="job-id"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Enter job ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={getJobStatus}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Get Status
            </button>
          </div>
        </div>

        {/* Job Status Display */}
        {jobStatus && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Job Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className={`ml-2 text-sm ${getStatusColor(jobStatus.status)}`}>
                  {jobStatus.status}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Progress:</span>
                <span className="ml-2 text-sm text-gray-900">{jobStatus.progress}%</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Created:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {new Date(jobStatus.timestamp).toLocaleString()}
                </span>
              </div>
              {jobStatus.processedOn && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Started:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(jobStatus.processedOn).toLocaleString()}
                  </span>
                </div>
              )}
              {jobStatus.finishedOn && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Finished:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(jobStatus.finishedOn).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {jobStatus.failedReason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <span className="text-sm font-medium text-red-800">Failure Reason:</span>
                <p className="text-sm text-red-700 mt-1">{jobStatus.failedReason}</p>
              </div>
            )}

            {jobStatus.result && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <span className="text-sm font-medium text-green-800">Result:</span>
                <pre className="text-sm text-green-700 mt-1 whitespace-pre-wrap">
                  {JSON.stringify(jobStatus.result, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex space-x-3">
              {jobStatus.status === 'failed' && (
                <button
                  onClick={retryJob}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Retry Job
                </button>
              )}
              <button
                onClick={removeJob}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Remove Job
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchQueueData}
          disabled={loading}
          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};

export default QueueDashboard;
