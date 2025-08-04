'use client';

import { useState, useEffect } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  DocumentArrowDownIcon,
  ChartBarIcon,
  TableCellsIcon,
  CalendarDaysIcon,
  FunnelIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  userActivity: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    suspiciousUsers: number;
    averageSessionTime: number;
    topLocations: Array<{ location: string; count: number }>;
  };
  communications: {
    totalMessages: number;
    interceptedMessages: number;
    flaggedMessages: number;
    modifiedMessages: number;
    topKeywords: Array<{ keyword: string; count: number }>;
    sentimentBreakdown: { positive: number; negative: number; neutral: number };
  };
  surveillance: {
    activeOperations: number;
    fakeUsersDeployed: number;
    impersonationSessions: number;
    dataPointsCollected: number;
    successfulInfiltrations: number;
  };
  temporal: {
    hourlyActivity: Array<{ hour: number; count: number }>;
    dailyTrends: Array<{ date: string; users: number; messages: number }>;
    weeklyPatterns: Array<{ day: string; activity: number }>;
  };
}

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  dateRange: { start: string; end: string };
  dataTypes: string[];
  includePersonalData: boolean;
  includeMetadata: boolean;
  compression: boolean;
  encryption: boolean;
}

export default function AnalyticsPage() {
  const { 
    getAnalyticsData, 
    exportUserData, 
    exportCommunications, 
    exportSurveillanceData,
    generateReport
  } = useAdminSurveillance();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userActivity: {
      totalUsers: 15847,
      activeUsers: 1203,
      newUsers: 47,
      suspiciousUsers: 23,
      averageSessionTime: 42,
      topLocations: [
        { location: 'New York, NY', count: 324 },
        { location: 'Los Angeles, CA', count: 298 },
        { location: 'Chicago, IL', count: 187 },
        { location: 'Houston, TX', count: 156 }
      ]
    },
    communications: {
      totalMessages: 89234,
      interceptedMessages: 1247,
      flaggedMessages: 342,
      modifiedMessages: 89,
      topKeywords: [
        { keyword: 'meet', count: 567 },
        { keyword: 'secret', count: 234 },
        { keyword: 'private', count: 189 },
        { keyword: 'urgent', count: 134 }
      ],
      sentimentBreakdown: { positive: 45, negative: 25, neutral: 30 }
    },
    surveillance: {
      activeOperations: 12,
      fakeUsersDeployed: 8,
      impersonationSessions: 5,
      dataPointsCollected: 234567,
      successfulInfiltrations: 3
    },
    temporal: {
      hourlyActivity: [],
      dailyTrends: [],
      weeklyPatterns: []
    }
  });

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: { 
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    dataTypes: ['userActivity', 'communications', 'surveillance'],
    includePersonalData: false,
    includeMetadata: true,
    compression: true,
    encryption: true
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsData();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!exportOptions.dataTypes.length) {
      alert('Please select at least one data type to export');
      return;
    }

    setExporting(true);
    try {
      let exportPromises = [];
      
      if (exportOptions.dataTypes.includes('userActivity')) {
        exportPromises.push(exportUserData(exportOptions));
      }
      if (exportOptions.dataTypes.includes('communications')) {
        exportPromises.push(exportCommunications(exportOptions));
      }
      if (exportOptions.dataTypes.includes('surveillance')) {
        exportPromises.push(exportSurveillanceData(exportOptions));
      }

      const results = await Promise.all(exportPromises);
      
      // Trigger download of exported files
      results.forEach((result, index) => {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        link.click();
      });

      alert('Data export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      const report = await generateReport(reportType, exportOptions.dateRange);
      
      const link = document.createElement('a');
      link.href = report.downloadUrl;
      link.download = report.filename;
      link.click();
      
      alert('Report generated successfully');
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Report generation failed');
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'users', name: 'User Analytics', icon: UserIcon },
    { id: 'communications', name: 'Communications', icon: ChatBubbleLeftRightIcon },
    { id: 'surveillance', name: 'Surveillance Ops', icon: EyeIcon },
    { id: 'export', name: 'Data Export', icon: DocumentArrowDownIcon }
  ];

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Data Export</h1>
                <p className="text-gray-600">Comprehensive surveillance analytics and data export tools</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleGenerateReport('comprehensive')}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
                <span className="text-sm text-gray-600">Last updated: 2 min ago</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8 mt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={analyticsData.userActivity.totalUsers}
                  subtitle="Platform users"
                  icon={UserIcon}
                  color="blue"
                />
                <StatCard
                  title="Active Surveillance"
                  value={analyticsData.surveillance.activeOperations}
                  subtitle="Ongoing operations"
                  icon={EyeIcon}
                  color="red"
                />
                <StatCard
                  title="Messages Intercepted"
                  value={analyticsData.communications.interceptedMessages}
                  subtitle="Last 24 hours"
                  icon={ChatBubbleLeftRightIcon}
                  color="purple"
                />
                <StatCard
                  title="Data Points"
                  value={analyticsData.surveillance.dataPointsCollected}
                  subtitle="Collected"
                  icon={TableCellsIcon}
                  color="green"
                />
              </div>

              {/* Charts and Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Sentiment</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Positive</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${analyticsData.communications.sentimentBreakdown.positive}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{analyticsData.communications.sentimentBreakdown.positive}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Negative</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${analyticsData.communications.sentimentBreakdown.negative}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{analyticsData.communications.sentimentBreakdown.negative}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Neutral</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gray-500 h-2 rounded-full" 
                            style={{ width: `${analyticsData.communications.sentimentBreakdown.neutral}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{analyticsData.communications.sentimentBreakdown.neutral}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Keywords</h3>
                  <div className="space-y-3">
                    {analyticsData.communications.topKeywords.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 font-medium">{keyword.keyword}</span>
                        <span className="text-sm text-gray-600">{keyword.count} mentions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Top Locations</h4>
                    <div className="space-y-2">
                      {analyticsData.userActivity.topLocations.map((location, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{location.location}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-600">{location.count} users</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Interactive map visualization would be displayed here</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Export Configuration */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Data Export Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Export Format</h3>
                    <div className="space-y-2">
                      {[
                        { value: 'csv', label: 'CSV (Comma Separated)', icon: TableCellsIcon },
                        { value: 'json', label: 'JSON (JavaScript Object)', icon: DocumentTextIcon },
                        { value: 'xlsx', label: 'Excel Spreadsheet', icon: DocumentTextIcon },
                        { value: 'pdf', label: 'PDF Report', icon: DocumentTextIcon }
                      ].map((format) => (
                        <label key={format.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="format"
                            value={format.value}
                            checked={exportOptions.format === format.value}
                            onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <format.icon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-900">{format.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Data Types</h3>
                    <div className="space-y-2">
                      {[
                        { value: 'userActivity', label: 'User Activity Data', icon: UserIcon },
                        { value: 'communications', label: 'Communications Data', icon: ChatBubbleLeftRightIcon },
                        { value: 'surveillance', label: 'Surveillance Operations', icon: EyeIcon },
                        { value: 'locations', label: 'Location Data', icon: MapPinIcon },
                        { value: 'media', label: 'Media Files', icon: PhotoIcon },
                        { value: 'metadata', label: 'System Metadata', icon: ClockIcon }
                      ].map((dataType) => (
                        <label key={dataType.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={exportOptions.dataTypes.includes(dataType.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportOptions(prev => ({ 
                                  ...prev, 
                                  dataTypes: [...prev.dataTypes, dataType.value] 
                                }));
                              } else {
                                setExportOptions(prev => ({ 
                                  ...prev, 
                                  dataTypes: prev.dataTypes.filter(type => type !== dataType.value) 
                                }));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <dataType.icon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-900">{dataType.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Date Range</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={exportOptions.dateRange.start}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, start: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={exportOptions.dateRange.end}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, end: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Export Options</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.includePersonalData}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            includePersonalData: e.target.checked 
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Include Personal Data</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeMetadata}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            includeMetadata: e.target.checked 
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Include Metadata</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.compression}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            compression: e.target.checked 
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Compress Files</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.encryption}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            encryption: e.target.checked 
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Encrypt Export</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Exporting {exportOptions.dataTypes.length} data types from {exportOptions.dateRange.start} to {exportOptions.dateRange.end}
                      </p>
                      {exportOptions.encryption && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Encrypted exports require secure password for access
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={exporting || exportOptions.dataTypes.length === 0}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <span>Export Data</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Reports */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: 'daily', title: 'Daily Summary', description: 'Last 24 hours activity' },
                    { type: 'weekly', title: 'Weekly Report', description: 'Last 7 days analysis' },
                    { type: 'comprehensive', title: 'Full Report', description: 'Complete surveillance report' },
                    { type: 'threats', title: 'Threat Analysis', description: 'Security threats and risks' },
                    { type: 'users', title: 'User Profiles', description: 'Detailed user analytics' },
                    { type: 'operations', title: 'Operations Report', description: 'Surveillance operations summary' }
                  ].map((report) => (
                    <button
                      key={report.type}
                      onClick={() => handleGenerateReport(report.type)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{report.title}</h3>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other tabs would have similar detailed implementations */}
          {activeTab !== 'overview' && activeTab !== 'export' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {tabs.find(t => t.id === activeTab)?.name} Analytics
              </h2>
              <p className="text-gray-600">Detailed {activeTab} analytics interface will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
