import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DocumentData } from '../types';

interface DashboardProps {
  documents: DocumentData[];
  theme: 'dark' | 'light' | 'contrast';
}

export const Dashboard: React.FC<DashboardProps> = ({ documents, theme }) => {
  // Aggregate data
  const allEntities = documents.flatMap(d => d.entities);
  const allClaims = documents.flatMap(d => d.claims);
  const allConflicts = documents.flatMap(d => d.conflicts);

  const entityTypeData = [
    { name: 'Constant', value: allEntities.filter(e => e.type === 'CONSTANT').length },
    { name: 'Variable', value: allEntities.filter(e => e.type === 'VARIABLE').length },
    { name: 'Material', value: allEntities.filter(e => e.type === 'MATERIAL').length },
    { name: 'Device', value: allEntities.filter(e => e.type === 'DEVICE').length },
  ].filter(d => d.value > 0);

  const claimTypeData = [
    { name: 'Measurement', value: allClaims.filter(c => c.type === 'MEASUREMENT').length },
    { name: 'Hypothesis', value: allClaims.filter(c => c.type === 'HYPOTHESIS').length },
    { name: 'Derivation', value: allClaims.filter(c => c.type === 'DERIVATION').length },
  ].filter(d => d.value > 0);

  const COLORS = theme === 'contrast' 
    ? ['#ffffff', '#ffff00', '#00ff00', '#ff00ff']
    : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    
  const tooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)'
  };

  const axisColor = theme === 'light' ? '#64748b' : (theme === 'contrast' ? '#ffffff' : '#94a3b8');

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <header className="mb-8 border-b border-app-border pb-4">
        <h2 className="text-2xl font-bold text-app-text tracking-tight">Knowledge Inventory</h2>
        <p className="text-app-subtext">Analysis of {documents.length} ingested documents.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Entities" value={allEntities.length} />
        <StatCard title="Derived Claims" value={allClaims.length} />
        <StatCard title="Conflicts Detected" value={allConflicts.length} alert={allConflicts.length > 0} />
        <StatCard title="Source Docs" value={documents.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Entity Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entityTypeData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip 
                contentStyle={tooltipStyle}
                cursor={{fill: axisColor, opacity: 0.1}}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {entityTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evidence Types">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={claimTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {claimTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-app-text mb-4">Detected Conflicts & Anomalies</h3>
        {allConflicts.length === 0 ? (
            <div className="text-app-subtext italic">No internal conflicts detected across documents.</div>
        ) : (
            <div className="space-y-3">
                {allConflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 bg-red-900/10 border border-red-500/30 p-4 rounded-lg">
                        <div className="text-red-500 mt-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div>
                            <div className="font-mono text-red-400 text-sm">{c.parameter}</div>
                            <div className="text-app-text text-sm mt-1">{c.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-app-text mb-4">Parameter Registry</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-app-border text-app-subtext text-sm">
                        <th className="py-2 px-3 font-medium">Name</th>
                        <th className="py-2 px-3 font-medium">Value</th>
                        <th className="py-2 px-3 font-medium">Unit</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium">Source</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {allEntities.slice(0, 10).map((e, i) => (
                        <tr key={i} className="border-b border-app-border/50 hover:bg-app-bg">
                            <td className="py-2 px-3 font-mono text-app-accent">{e.name}</td>
                            <td className="py-2 px-3 text-app-text">{e.value}</td>
                            <td className="py-2 px-3 text-app-subtext">{e.unit || '-'}</td>
                            <td className="py-2 px-3"><span className="text-xs bg-app-bg px-2 py-1 rounded border border-app-border">{e.type}</span></td>
                            <td className="py-2 px-3 text-app-subtext truncate max-w-[150px]">{documents.find(d => d.id === e.sourceId)?.filename}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {allEntities.length > 10 && (
                <div className="text-center mt-4 text-xs text-app-subtext">Showing 10 of {allEntities.length} entities</div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, alert = false }: { title: string, value: number, alert?: boolean }) => (
  <div className={`p-5 rounded-xl border ${alert ? 'bg-red-900/10 border-red-500/50' : 'bg-app-surface border-app-border'}`}>
    <div className="text-app-subtext text-sm font-medium uppercase tracking-wider">{title}</div>
    <div className={`text-3xl font-bold mt-2 font-mono ${alert ? 'text-red-400' : 'text-app-text'}`}>{value}</div>
  </div>
);

const ChartCard = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="bg-app-surface border border-app-border rounded-xl p-5 h-80 flex flex-col">
    <h3 className="text-app-text font-medium mb-4">{title}</h3>
    <div className="flex-1 w-full min-h-0">
      {children}
    </div>
  </div>
);
