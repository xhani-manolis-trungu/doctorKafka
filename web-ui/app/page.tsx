'use client';

import { useEffect, useState } from 'react';

interface BrokerMetrics {
  brokerId: string;
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
}

interface BrokerStatus {
  lastSeen: number;
  metrics: BrokerMetrics | null;
  status: 'HEALTHY' | 'UNHEALTHY' | 'OVERLOADED';
}

interface Action {
  id: string;
  timestamp: number;
  brokerId: string;
  actionType: string;
  description: string;
}

export default function Home() {
  const [clusterState, setClusterState] = useState<Record<string, BrokerStatus>>({});
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const statusRes = await fetch('http://localhost:3001/api/status');
      const statusData = await statusRes.json();
      setClusterState(statusData);

      // const actionsRes = await fetch('http://localhost:3001/api/actions');
      // const actionsData = await actionsRes.json();
      // setActions(actionsData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'UNHEALTHY': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'OVERLOADED': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <main className="min-h-screen bg-[#0f1117] text-white p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-8 backdrop-blur-sm sticky top-0 bg-[#0f1117]/80 z-10 transition-all duration-300">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              DoctorKafka
            </h1>
            <p className="text-gray-400 mt-2 text-sm tracking-wide">
              Cluster Auto-Healing & Balancing System
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
              Live Monitoring
            </span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          </div>
        </header>

        {/* Brokers Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-200">Active Brokers</h2>
            <span className="text-sm text-gray-500">{Object.keys(clusterState).length} Nodes Online</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(clusterState).map(([brokerId, data]) => (
              <div 
                key={brokerId} 
                className="group relative bg-[#1a1d24] rounded-xl p-6 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-100">{brokerId}</h3>
                        <p className="text-xs text-gray-500 mt-1">Host: Local-Docker</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(data.status)}`}>
                      {data.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>CPU Load</span>
                        <span>{data.metrics?.cpuUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" 
                          style={{ width: `${Math.min(data.metrics?.cpuUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Memory Load</span>
                        <span>{data.metrics?.memoryUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                          style={{ width: `${Math.min(data.metrics?.memoryUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5">
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Bytes In/s</p>
                            <p className="text-sm font-mono text-gray-300 mt-1">{data.metrics?.bytesInPerSec.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Bytes Out/s</p>
                            <p className="text-sm font-mono text-gray-300 mt-1">{data.metrics?.bytesOutPerSec.toLocaleString()}</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && Object.keys(clusterState).length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-500">
                    Waiting for brokers to report...
                </div>
            )}
          </div>
        </section>

        {/* Recent Actions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-200">Recent Healing Actions</h2>
            <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">View All Logs</button>
          </div>
          
          <div className="bg-[#1a1d24] rounded-xl border border-white/5 overflow-hidden">
             {/* Placeholder for no actions */}
             <div className="p-8 text-center text-gray-500 border-b border-white/5">
                No recent actions recorded.
             </div>
             
             {/* Example row structure (commented out)
             <div className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div>
                        <p className="text-sm font-medium text-gray-200">Rebalanced Partition-0</p>
                        <p className="text-xs text-gray-500">From Broker-1 to Broker-2</p>
                    </div>
                </div>
                <span className="text-xs text-gray-500">2 mins ago</span>
             </div>
             */}
          </div>
        </section>
      </div>
    </main>
  );
}
