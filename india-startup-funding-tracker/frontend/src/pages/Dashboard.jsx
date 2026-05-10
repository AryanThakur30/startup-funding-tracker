import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, DollarSign, Building2, Calendar, Activity, LogOut,
  RefreshCw, BarChart3, PieChart, ArrowUpRight, AlertCircle, CheckCircle2,
  XCircle, Clock, Database, Loader2, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const API_BASE = '/api/v1';

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  const num = parseFloat(amount);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

// Dashboard Components
function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          <ArrowUpRight className="w-4 h-4 text-green-500" />
          <span className="text-green-600 font-medium">{trend}</span>
          <span className="text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

function FundingTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No funding data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Company</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Sector</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Source</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((item, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{item.companyName}</p>
                <p className="text-xs text-gray-400 truncate max-w-xs">{item.headline}</p>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                  {item.sector || 'Other'}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-green-600">
                {formatCurrency(item.fundingAmount)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">
                {new Date(item.publishedDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-500">{item.source}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineStatus({ status, onRefresh }) {
  const statusConfig = {
    healthy: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, label: 'Operational' },
    degraded: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle, label: 'Degraded' },
    error: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Error' }
  };

  const config = statusConfig[status] || statusConfig.degraded;
  const Icon = config.icon;

  return (
    <div className={`card ${config.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            <p className="text-xs text-gray-500">Pipeline Status</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-white rounded-lg transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

function PipelineExecution({ history }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700'
  };

  const displayedHistory = expanded ? history : history.slice(0, 3);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Pipeline Execution History</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show All <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {displayedHistory.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No pipeline executions yet</p>
      ) : (
        <div className="space-y-3">
          {displayedHistory.map((execution) => (
            <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{execution.pipeline_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(execution.execution_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {execution.records_inserted} inserted / {execution.records_fetched} fetched
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[execution.status]}`}>
                  {execution.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [historicalData, setHistoricalData] = useState([]);
  const [liveData, setLiveData] = useState([]);
  const [stats, setStats] = useState(null);
  const [pipelineHistory, setPipelineHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [error, setError] = useState(null);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch historical data
      const histRes = await fetch(`${API_BASE}/fundings/historical?limit=50`, { headers });
      const histJson = await histRes.json();

      // Fetch live data
      const liveRes = await fetch(`${API_BASE}/fundings/live?limit=50`, { headers });
      const liveJson = await liveRes.json();

      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/fundings/stats`, { headers });
      const statsJson = await statsRes.json();

      // Fetch pipeline status
      const pipelineRes = await fetch(`${API_BASE}/pipeline/status?limit=10`, { headers });
      const pipelineJson = await pipelineRes.json();

      setHistoricalData(histJson.success ? histJson.data : []);
      setLiveData(liveJson.success ? liveJson.data : []);
      setStats(statsJson.success ? statsJson.data : null);
      setPipelineHistory(pipelineJson.success ? pipelineJson.data.recentExecutions : []);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    }

    setLoading(false);
  };

  const runPipeline = async (type) => {
    setPipelineLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/pipeline/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (data.success) {
        // Refresh data after pipeline run
        setTimeout(fetchData, 1000);
      }
    } catch (err) {
      console.error('Pipeline error:', err);
    }
    setPipelineLoading(false);
  };

  // Prepare chart data
  const sectorChartData = stats ? Object.entries(stats.sectorDistribution).map(([sector, data]) => ({
    name: sector.replace('_', ' '),
    value: data.total,
    count: data.count
  })) : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Startup Funding Tracker</h1>
                <p className="text-xs text-gray-500">Live Data Engineering System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="card text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
            <button onClick={fetchData} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Historical Funding (Jan-Feb)"
                value={formatCurrency(stats?.historical?.totalFunding)}
                subtitle={`${stats?.historical?.dealCount || 0} deals`}
                icon={DollarSign}
                color="primary"
              />
              <StatCard
                title="Live Funding (March)"
                value={formatCurrency(stats?.live?.totalFunding)}
                subtitle={`${stats?.live?.dealCount || 0} deals`}
                icon={Activity}
                color="green"
              />
              <StatCard
                title="Active Sectors"
                value={Object.keys(stats?.sectorDistribution || {}).length}
                subtitle="with funding activity"
                icon={Building2}
                color="blue"
              />
              <PipelineStatus status="healthy" onRefresh={fetchData} />
            </div>

            {/* Pipeline Controls */}
            <div className="card mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Data Pipeline Controls</h2>
                  <p className="text-sm text-gray-500">Execute data ingestion from external APIs</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => runPipeline('historical')}
                    disabled={pipelineLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Database className="w-4 h-4" />
                    Run Historical Pipeline
                  </button>
                  <button
                    onClick={() => runPipeline('live')}
                    disabled={pipelineLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {pipelineLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Run Live Pipeline
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex gap-6">
                {['overview', 'historical', 'live', 'pipeline'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Distribution Chart */}
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary-600" />
                    Sector Distribution
                  </h3>
                  {sectorChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={sectorChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {sectorChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500 py-12">No sector data available</p>
                  )}
                </div>

                {/* Recent Live Fundings */}
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                    Recent Live Fundings
                  </h3>
                  <FundingTable data={liveData} />
                </div>
              </div>
            )}

            {activeTab === 'historical' && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Historical Funding Data</h3>
                    <p className="text-sm text-gray-500">January - February 2026</p>
                  </div>
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                    {historicalData.length} records
                  </span>
                </div>
                <FundingTable data={historicalData} />
              </div>
            )}

            {activeTab === 'live' && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Live Funding Data</h3>
                    <p className="text-sm text-gray-500">March 1 - 24, 2026</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    {liveData.length} records
                  </span>
                </div>
                <FundingTable data={liveData} />
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineExecution history={pipelineHistory} />
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">Pipeline Architecture</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">API Ingestion Layer</p>
                        <p className="text-sm text-gray-500">Fetches data from GDELT & MediaStack APIs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cleaning & Validation</p>
                        <p className="text-sm text-gray-500">Filters, deduplicates, and validates records</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Data Transformation</p>
                        <p className="text-sm text-gray-500">Extracts entities, normalizes formats</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary-600">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Supabase Storage</p>
                        <p className="text-sm text-gray-500">Persists structured data with PostgreSQL</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-600">5</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Live Dashboard</p>
                        <p className="text-sm text-gray-500">Real-time visualization and queries</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
