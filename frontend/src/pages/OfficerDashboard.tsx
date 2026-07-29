import React, { useState, useEffect } from 'react';
import type { User, PlacementDrive, Announcement, Application } from '../types';
import { Users, Briefcase, Bell, BarChart3, ShieldCheck, UserPlus, FileSpreadsheet, Download, RefreshCw, Send, CheckCircle, AlertTriangle, ClipboardList, Calendar, Clock, Terminal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DEPARTMENTS = [
  "Artificial Intelligence and Data Science (AIDS)",
  "Artificial Intelligence and Machine Learning (AIML)",
  "Computer Science and Engineering (CSE)",
  "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical and Electronics Engineering (EEE)",
  "Computer and Communication Engineering (CCE)",
  "Computer Science and Business Systems (CSBS)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biomedical Engineering",
  "Biotechnology",
  "Fashion Technology"
];

interface OfficerProps {
  user: User | null;
  token: string | null;
  activeTab: string;
}

interface DeptComparison {
  department: string;
  full_name: string;
  total_students: number;
  placed_students: number;
  placement_rate: number;
}

export const OfficerDashboard: React.FC<OfficerProps> = ({ user, token, activeTab }) => {
  // Statistics and comparisons
  const [stats, setStats] = useState({
    total_students: 0,
    total_drives: 0,
    total_applications: 0,
    placed_students: 0,
    placement_rate: 0
  });
  const [deptStats, setDeptStats] = useState<DeptComparison[]>([]);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  
  // Create coordinator form
  const [coordName, setCoordName] = useState('');
  const [coordEmail, setCoordEmail] = useState('');
  const [coordPassword, setCoordPassword] = useState('');
  const [coordDept, setCoordDept] = useState(DEPARTMENTS[0]);

  // Create announcements form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('General');

  // Create drive form
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [ctc, setCtc] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [eligibleDepts, setEligibleDepts] = useState('All');
  const [description, setDescription] = useState('');
  const [driveDate, setDriveDate] = useState('');
  const [regDeadline, setRegDeadline] = useState('');

  // Applications Tracking State
  const [driveApplications, setDriveApplications] = useState<Application[]>([]);
  const [selectedAppDriveId, setSelectedAppDriveId] = useState<string>('');

  // Status editing form state
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [statusSelect, setStatusSelect] = useState<string>('');
  const [interviewDateInput, setInterviewDateInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchOfficerData = async () => {
    if (!token) return;
    try {
      // 1. Fetch Stats Summary
      const statsRes = await fetch('http://localhost:8000/api/analytics/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 2. Fetch Department Comparison
      const deptRes = await fetch('http://localhost:8000/api/analytics/department-comparison', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (deptRes.ok) {
        setDeptStats(await deptRes.json());
      }

      // 3. Fetch Coordinators Directory
      const coordRes = await fetch('http://localhost:8000/api/analytics/coordinators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (coordRes.ok) {
        setCoordinators(await coordRes.json());
      }

      // 4. Fetch All Drives
      const drivesRes = await fetch('http://localhost:8000/api/drives', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (drivesRes.ok) {
        const driveData: PlacementDrive[] = await drivesRes.json();
        setDrives(driveData);
        if (driveData.length > 0 && !selectedAppDriveId) {
          setSelectedAppDriveId(driveData[0].id.toString());
        }
      }

      // 5. Fetch Announcements List
      const annRes = await fetch('http://localhost:8000/api/announcements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (error) {
      console.error("Officer fetch error", error);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, [token]);

  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/analytics/coordinator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: coordName,
          email: coordEmail,
          password: coordPassword,
          role: 'coordinator',
          department: coordDept
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create coordinator account');
      }

      setStatusMsg({ type: 'success', text: `Coordinator account created successfully for ${coordName}!` });
      setCoordName(''); setCoordEmail(''); setCoordPassword('');
      fetchOfficerData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/drives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company_name: companyName,
          role_name: roleName,
          ctc: parseFloat(ctc),
          min_cgpa: parseFloat(minCgpa),
          eligible_departments: eligibleDepts || 'All',
          description,
          drive_date: new Date(driveDate).toISOString(),
          registration_deadline: new Date(regDeadline).toISOString()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Drive creation failed');
      }

      setStatusMsg({ type: 'success', text: `Placement Drive for ${companyName} created successfully!` });
      // Reset form
      setCompanyName(''); setRoleName(''); setCtc(''); setMinCgpa(''); setEligibleDepts('All'); setDescription(''); setDriveDate(''); setRegDeadline('');
      fetchOfficerData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriveApplications = async (driveId: string) => {
    if (!token || !driveId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/applications/drive/${driveId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDriveApplications(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch drive applications", error);
    }
  };

  useEffect(() => {
    if (selectedAppDriveId) {
      fetchDriveApplications(selectedAppDriveId);
    }
  }, [selectedAppDriveId, token]);

  const handleUpdateAppStatus = async (appId: number) => {
    if (!token) return;
    setStatusMsg(null);
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/applications/${appId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusSelect,
          interview_date: statusSelect === 'Interview Scheduled' && interviewDateInput ? new Date(interviewDateInput).toISOString() : null,
          feedback: feedbackInput || null
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update application status');
      }
      
      setStatusMsg({ type: 'success', text: 'Application status updated successfully! Student has been notified via email.' });
      setEditingAppId(null);
      if (selectedAppDriveId) {
        fetchDriveApplications(selectedAppDriveId);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishSystemAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          category: annCategory,
          department: 'All' // System wide
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Announcement post failed');
      }

      setStatusMsg({ type: 'success', text: 'System-wide announcement published. Direct emails logged for all registered verified students.' });
      setAnnTitle(''); setAnnContent('');
      fetchOfficerData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPlacementsReport = async (format: 'csv' | 'json') => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/export/${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Report export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas_placements_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const avgCtc = drives.length > 0 ? (drives.reduce((acc, curr) => acc + curr.ctc, 0) / drives.length).toFixed(1) : '0';
  const maxCtc = drives.length > 0 ? Math.max(...drives.map(d => d.ctc)).toFixed(1) : '0';

  return (
    <div className="space-y-8 font-sans">
      
      {/* Alert toast panel */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border text-sm font-sans ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-cyber-pink/10 border-cyber-pink/30 text-cyber-pink'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* COLLEGE ANALYTICS OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Greeting Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-pink to-cyber-purple font-extrabold">{user?.name}</span>! 👋
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Welcome back to the Central Placement Command Center. Analyze college statistics, track university drives, and download data exports.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono border bg-cyber-pink/10 text-cyber-pink border-cyber-pink/25">
              Role: Campus Placement Officer
            </span>
          </div>

          {/* Top key numbers */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Institution Size</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.total_students}</h3>
              <span className="text-[10px] text-cyber-cyan mt-1">Students Enrolled</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Placed</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.placed_students}</h3>
              <span className="text-[10px] text-cyber-green mt-1">{stats.placement_rate}% success rate</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Recruitment Drives</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.total_drives}</h3>
              <span className="text-[10px] text-cyber-purple mt-1">Active Companies</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Applications</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.total_applications}</h3>
              <span className="text-[10px] text-cyber-blue mt-1">Student submissions</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Coordinators Directory</span>
              <h3 className="text-3xl font-extrabold text-cyber-pink mt-2 font-mono">{coordinators.length}</h3>
              <span className="text-[10px] text-slate-500 mt-1">Active Department Admins</span>
            </div>
          </div>

          {/* CTC Summary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Average CTC Package Offered</span>
                <h3 className="text-3xl font-extrabold text-cyber-cyan mt-1 font-mono">{avgCtc} LPA</h3>
              </div>
              <div className="p-3 rounded-xl bg-cyber-cyan/10 text-cyber-cyan">
                <BarChart3 className="w-8 h-8" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Highest CTC Package Recorded</span>
                <h3 className="text-3xl font-extrabold text-cyber-pink mt-1 font-mono">{maxCtc} LPA</h3>
              </div>
              <div className="p-3 rounded-xl bg-cyber-pink/10 text-cyber-pink">
                <Briefcase className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Department comparative charts */}
          <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyber-cyan" /> Department Performance Comparison
            </h3>

            {deptStats.length === 0 ? (
              <div className="text-center py-20 text-slate-500">Loading metrics...</div>
            ) : (
              <div className="h-96 w-full text-slate-200">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptStats.filter(d => d.total_students > 0)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar name="Students Enrolled" dataKey="total_students" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar name="Placed Count" dataKey="placed_students" fill="#00f2fe" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COORDINATORS DIRECTORY */}
      {activeTab === 'coordinators' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List of active coordinators */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyber-cyan" /> Coordinators Directory
            </h3>

            {coordinators.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No coordinators registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">Coordinator Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Department Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinators.map((c) => (
                      <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-900/20">
                        <td className="py-4 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-4 px-4 font-mono text-slate-400">{c.email}</td>
                        <td className="py-4 px-4 text-xs text-cyber-cyan font-semibold">{c.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add coordinator form */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyber-pink" /> Register Coordinator
            </h3>

            <form onSubmit={handleCreateCoordinator} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={coordName}
                  onChange={e => setCoordName(e.target.value)}
                  placeholder="e.g. Prof. Miller"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={coordEmail}
                  onChange={e => setCoordEmail(e.target.value)}
                  placeholder="miller@coordinator.atlas.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department Scope</label>
                <select
                  value={coordDept}
                  onChange={e => setCoordDept(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                >
                  {DEPARTMENTS.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={coordPassword}
                  onChange={e => setCoordPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isLoading ? 'Creating account...' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECRUITMENT DRIVES */}
      {activeTab === 'drives' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Drive Form */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyber-cyan" /> Post Recruitment Drive
            </h3>

            <form onSubmit={handleCreateDrive} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Job Role</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g. Associate Software Engineer"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CTC Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ctc}
                    onChange={e => setCtc(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cut-off GPA threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={minCgpa}
                    onChange={e => setMinCgpa(e.target.value)}
                    placeholder="e.g. 7.50"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eligible Departments (Comma-separated or 'All')</label>
                  <input
                    type="text"
                    value={eligibleDepts}
                    onChange={e => setEligibleDepts(e.target.value)}
                    placeholder="All or Computer Science and Engineering (CSE), Information Technology (IT)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Job Description & Guidelines</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe roles, test links, screening syllabus, and interview procedures..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-28"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test/Drive Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={driveDate}
                    onChange={e => setDriveDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registration Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={regDeadline}
                    onChange={e => setRegDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Creating drive...' : 'Deploy Recruitment Drive'}
              </button>
            </form>
          </div>

          {/* Quick List column */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl h-[550px] flex flex-col">
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyber-pink" /> College Active Drives
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {drives.map(drive => (
                <div key={drive.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-sm">{drive.company_name}</span>
                    <span className="font-mono text-cyber-cyan text-xs font-bold">{drive.ctc} LPA</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans truncate">{drive.role_name}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-900 font-mono">
                    <span>Cut-off: {drive.min_cgpa}</span>
                    <span>Deadline: {new Date(drive.registration_deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REPORT CENTER */}
      {activeTab === 'reports' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl max-w-2xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <FileSpreadsheet className="w-12 h-12 text-cyber-cyan mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Recruitment Analytics Reports</h3>
            <p className="text-xs text-slate-450 font-sans max-w-md mx-auto leading-relaxed">
              Compile institutional applications metrics, placement rates, student portfolios, and corporate drive details into standard export files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => downloadPlacementsReport('csv')}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyber-cyan/40 hover:bg-slate-900 flex flex-col items-center gap-3 transition-all"
            >
              <Download className="w-6 h-6 text-cyber-cyan" />
              <div className="text-center">
                <span className="font-bold text-sm text-white block">Download Placements CSV</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">Compatible with Excel / Sheets</span>
              </div>
            </button>

            <button
              onClick={() => downloadPlacementsReport('json')}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyber-purple/40 hover:bg-slate-900 flex flex-col items-center gap-3 transition-all"
            >
              <Download className="w-6 h-6 text-cyber-purple" />
              <div className="text-center">
                <span className="font-bold text-sm text-white block">Download Placements JSON</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">Structured database dump format</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM BROADCASTS & NOTICE BOARD */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Publish Form */}
          <div className="lg:col-span-1 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyber-pink" /> Publish Broadcast
            </h3>

            <form onSubmit={handlePublishSystemAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. Mandatory Resume Verification notice"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category Tag</label>
                <select
                  value={annCategory}
                  onChange={e => setAnnCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                >
                  <option value="General">General Announcement</option>
                  <option value="Drive">Placement Drives notification</option>
                  <option value="Important">Critical Urgency Alert</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Content Body</label>
                <textarea
                  required
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Write message details. This notification goes live on student portals and triggers email alerts to all departments..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-44"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Publishing system notice...' : 'Broadcast Notice'}
              </button>
            </form>
          </div>

          {/* Notice Board Feed */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl flex flex-col h-[650px]">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyber-cyan" /> Notice Board (Active Broadcasts)
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {announcements.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">No active notices broadcasted.</div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-pink" />
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <span className="text-[10px] text-cyber-cyan uppercase font-mono tracking-wider bg-cyber-cyan/10 px-2 py-0.5 rounded">
                          {ann.category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-2">{ann.title}</h4>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{new Date(ann.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-xs font-sans mt-3 pl-2 leading-relaxed whitespace-pre-line">{ann.content}</p>
                    <div className="pt-3 border-t border-slate-850 mt-3 flex justify-between items-center text-[10px] text-slate-500 pl-2 font-mono">
                      <span>Sender: {ann.creator.name} ({ann.creator.role})</span>
                      <span>Target: {ann.department}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION TRACKING PANEL */}
      {activeTab === 'applications' && (
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-6 h-6 text-cyber-cyan" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  University Student Application tracking
                </h3>
              </div>
              <div className="w-full md:w-72">
                <select
                  value={selectedAppDriveId}
                  onChange={e => setSelectedAppDriveId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                >
                  <option value="">Choose Recruitment Drive</option>
                  {drives.map(d => (
                    <option key={d.id} value={d.id}>{d.company_name} - {d.role_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {driveApplications.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                {selectedAppDriveId ? "No student applications registered for this drive yet." : "Please select a placement drive above."}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Register No</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">CGPA</th>
                        <th className="py-3 px-4">Skills</th>
                        <th className="py-3 px-4">Resume</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driveApplications.map((app) => (
                        <React.Fragment key={app.id}>
                          <tr className="border-b border-slate-800/40 hover:bg-slate-900/10">
                            <td className="py-4 px-4 font-bold text-white">
                              <div>{app.student.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{app.student.email}</div>
                            </td>
                            <td className="py-4 px-4 font-mono text-slate-350">{app.student.register_number}</td>
                            <td className="py-4 px-4 text-xs text-slate-300">{app.student.department}</td>
                            <td className="py-4 px-4 font-mono text-cyber-cyan">
                              {app.student.profile?.cgpa.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-400 max-w-xs truncate" title={app.student.profile?.skills}>
                              {app.student.profile?.skills || 'None'}
                            </td>
                            <td className="py-4 px-4 text-xs">
                              {app.resume_url ? (
                                <a
                                  href={`http://localhost:8000/${app.resume_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyber-cyan hover:underline inline-flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </a>
                              ) : (
                                <span className="text-slate-650">No resume</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border tracking-wider ${
                                app.status === 'Offered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                app.status === 'Rejected' ? 'bg-cyber-pink/10 text-cyber-pink border-cyber-pink/30' :
                                app.status === 'Interview Scheduled' ? 'bg-cyan-500/10 text-cyber-cyan border-cyber-cyan/30' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {editingAppId === app.id ? (
                                <button
                                  onClick={() => setEditingAppId(null)}
                                  className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold transition-all"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingAppId(app.id);
                                    setStatusSelect(app.status);
                                    setInterviewDateInput(app.interview_date ? app.interview_date.substring(0, 16) : '');
                                    setFeedbackInput(app.feedback || '');
                                  }}
                                  className="px-3 py-1 rounded bg-cyber-cyan/15 hover:bg-cyber-cyan/30 border border-cyber-cyan/30 text-cyber-cyan text-xs font-bold transition-all"
                                >
                                  Update Status
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Inline Edit Form Panel */}
                          {editingAppId === app.id && (
                            <tr className="bg-slate-900/30">
                              <td colSpan={8} className="p-6 border-b border-slate-800/80">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl">
                                  <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Set Stage Status</label>
                                    <select
                                      value={statusSelect}
                                      onChange={e => setStatusSelect(e.target.value)}
                                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyber-cyan text-xs text-slate-200 focus:outline-none"
                                    >
                                      <option value="Applied">Applied</option>
                                      <option value="Reviewing">Reviewing</option>
                                      <option value="Interview Scheduled">Interview Scheduled</option>
                                      <option value="Offered">Offered</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>
                                  </div>

                                  {statusSelect === 'Interview Scheduled' && (
                                    <div className="space-y-2">
                                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Interview Datetime</label>
                                      <input
                                        type="datetime-local"
                                        value={interviewDateInput}
                                        onChange={e => setInterviewDateInput(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyber-cyan text-xs text-slate-200 focus:outline-none"
                                      />
                                    </div>
                                  )}

                                  <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Admin Feedback / Interview Location</label>
                                    <input
                                      type="text"
                                      value={feedbackInput}
                                      onChange={e => setFeedbackInput(e.target.value)}
                                      placeholder="e.g. Meet Link, Classroom 304, or technical review notes..."
                                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs text-slate-200 focus:outline-none"
                                    />
                                  </div>

                                  <div className="text-right">
                                    <button
                                      onClick={() => handleUpdateAppStatus(app.id)}
                                      disabled={isLoading}
                                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all"
                                    >
                                      {isLoading ? 'Updating...' : 'Save Changes'}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
