import React, { useState, useEffect } from 'react';
import type { User, StudentUserDetail, PlacementDrive, Application, Announcement } from '../types';
import { ShieldCheck, Users, Briefcase, Bell, Send, CheckCircle, XCircle, Search, Terminal, AlertTriangle, Sparkles, Brain, Download, Calendar, Clock, ClipboardList, Edit } from 'lucide-react';

interface CoordinatorProps {
  user: User | null;
  token: string | null;
  activeTab: string;
}

export const CoordinatorDashboard: React.FC<CoordinatorProps> = ({ user, token, activeTab }) => {
  // Lists
  const [students, setStudents] = useState<StudentUserDetail[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [screenedStudents, setScreenedStudents] = useState<StudentUserDetail[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Applications Tracking State
  const [driveApplications, setDriveApplications] = useState<Application[]>([]);
  const [selectedAppDriveId, setSelectedAppDriveId] = useState<string>('');

  // Status editing form state
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [statusSelect, setStatusSelect] = useState<string>('');
  const [interviewDateInput, setInterviewDateInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  // Selection state
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [screeningCgpa, setScreeningCgpa] = useState<string>('');
  const [screeningSkills, setScreeningSkills] = useState<string>('');

  // Statistics
  const [stats, setStats] = useState({
    total_students: 0,
    total_drives: 0,
    total_applications: 0,
    placed_students: 0,
    placement_rate: 0
  });

  // Forms state
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [ctc, setCtc] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [eligibleDepts, setEligibleDepts] = useState('');
  const [description, setDescription] = useState('');
  const [driveDate, setDriveDate] = useState('');
  const [regDeadline, setRegDeadline] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('General');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchCoordinatorData = async () => {
    if (!token) return;
    try {
      // 1. Fetch Students List
      const studentsRes = await fetch('http://localhost:8000/api/profile/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studentsRes.ok) {
        setStudents(await studentsRes.json());
      }

      // 2. Fetch Drives List
      const drivesRes = await fetch('http://localhost:8000/api/drives', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (drivesRes.ok) {
        const driveData: PlacementDrive[] = await drivesRes.json();
        setDrives(driveData);
        if (driveData.length > 0) {
          if (!selectedDriveId) setSelectedDriveId(driveData[0].id.toString());
          if (!selectedAppDriveId) setSelectedAppDriveId(driveData[0].id.toString());
        }
      }

      // 3. Fetch Department Stats Summary
      const statsRes = await fetch('http://localhost:8000/api/analytics/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 4. Fetch Announcements List
      const annRes = await fetch('http://localhost:8000/api/announcements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (error) {
      console.error("Coordinator Fetch error", error);
    }
  };

  useEffect(() => {
    fetchCoordinatorData();
  }, [token]);

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

  const handleVerifyStudent = async (studentId: number, approve: boolean) => {
    if (!token) return;
    setStatusMsg(null);
    try {
      const formData = new FormData();
      formData.append('approve', approve.toString());

      const response = await fetch(`http://localhost:8000/api/profile/${studentId}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Verification request failed');
      }

      setStatusMsg({ type: 'success', text: `Profile successfully ${approve ? 'verified' : 'rejected'}. Notification dispatched to student.` });
      fetchCoordinatorData(); // Refresh list
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
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
          eligible_departments: eligibleDepts || user?.department || 'All',
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
      setCompanyName(''); setRoleName(''); setCtc(''); setMinCgpa(''); setEligibleDepts(''); setDescription(''); setDriveDate(''); setRegDeadline('');
      fetchCoordinatorData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
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
          department: user?.department || 'All'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Broadcast failed');
      }

      setStatusMsg({ type: 'success', text: 'Announcement published! Automated emails generated for departmental student body.' });
      setAnnTitle(''); setAnnContent('');
      fetchCoordinatorData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDriveId) return;
    setStatusMsg(null);
    setIsLoading(true);

    let url = `http://localhost:8000/api/drives/screening/${selectedDriveId}`;
    const params = [];
    if (screeningCgpa) params.push(`min_cgpa=${screeningCgpa}`);
    if (screeningSkills) params.push(`skills_query=${encodeURIComponent(screeningSkills)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Screening failed');
      }
      setScreenedStudents(data);
      setStatusMsg({ type: 'success', text: `AI Filtering complete. Found ${data.length} candidates.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const pendingStudents = students.filter(s => s.profile && !s.profile.is_verified);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Action alerts toast */}
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

      {/* STATS OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Greeting Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-purple to-indigo-500 font-extrabold">{user?.name}</span>! 👋
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Welcome back to your Coordinator Control Room. Oversee student verifications, drives, and departmental stats.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono border bg-cyber-purple/10 text-cyber-purple border-cyber-purple/25">
              Role: Department Coordinator ({user?.department})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department Body</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.total_students}</h3>
              <span className="text-[10px] text-cyber-cyan mt-1">Students Registered</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Placement Rate</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.placement_rate}%</h3>
              <span className="text-[10px] text-cyber-green mt-1">{stats.placed_students} Students Placed</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Recruitment Drives</span>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.total_drives}</h3>
              <span className="text-[10px] text-cyber-purple mt-1">Active College-Wide</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Verifications</span>
              <h3 className="text-3xl font-extrabold text-cyber-pink mt-2 font-mono">{pendingStudents.length}</h3>
              <span className="text-[10px] text-slate-500 mt-1">Awaiting Portfolio Approval</span>
            </div>
          </div>

          {/* Quick list of students pending verification */}
          <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyber-cyan" /> Pending Approvals Grid
            </h3>

            {pendingStudents.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                All student profile details and resumes in your department are currently verified.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Primary Skills</th>
                      <th className="py-3 px-4">Resume</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingStudents.map((std) => (
                      <tr key={std.user.id} className="border-b border-slate-800/40 hover:bg-slate-900/20">
                        <td className="py-4 px-4 font-mono font-semibold text-slate-300">{std.user.register_number}</td>
                        <td className="py-4 px-4 font-bold text-white">{std.user.name}</td>
                        <td className="py-4 px-4 font-mono text-cyber-cyan">{std.profile?.cgpa.toFixed(2)}</td>
                        <td className="py-4 px-4 text-xs text-slate-400 max-w-xs truncate">{std.profile?.skills || 'None'}</td>
                        <td className="py-4 px-4 text-xs">
                          {std.profile?.resume_url ? (
                            <a
                              href={`http://localhost:8000/${std.profile.resume_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyber-cyan hover:underline inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          ) : (
                            <span className="text-slate-600">No upload</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleVerifyStudent(std.user.id, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyStudent(std.user.id, false)}
                            className="px-3 py-1.5 rounded-lg bg-cyber-pink/10 hover:bg-cyber-pink/25 border border-cyber-pink/30 text-cyber-pink text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT PROFILE VERIFICATION GRID */}
      {activeTab === 'verification' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyber-cyan" /> Department Student Registry ({user?.department})
          </h3>

          {students.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No students registered in this department yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Register No</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">CGPA</th>
                    <th className="py-3 px-4">Skills</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((std) => (
                    <tr key={std.user.id} className="border-b border-slate-800/40 hover:bg-slate-900/20">
                      <td className="py-4 px-4 font-mono text-slate-400">{std.user.register_number}</td>
                      <td className="py-4 px-4 font-bold text-white">{std.user.name}</td>
                      <td className="py-4 px-4 font-mono text-cyber-cyan">{std.profile?.cgpa ? std.profile.cgpa.toFixed(2) : '0.00'}</td>
                      <td className="py-4 px-4 text-xs text-slate-400 max-w-xs truncate">{std.profile?.skills || 'None'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          std.profile?.is_verified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {std.profile?.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {std.profile?.is_verified ? (
                          <button
                            onClick={() => handleVerifyStudent(std.user.id, false)}
                            className="px-3 py-1 rounded bg-cyber-pink/10 hover:bg-cyber-pink/20 text-cyber-pink text-xs border border-cyber-pink/20 transition-all"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerifyStudent(std.user.id, true)}
                            className="px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/20 transition-all"
                            disabled={!std.profile}
                          >
                            Approve Profile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MANAGE PLACEMENT DRIVES */}
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
              <Terminal className="w-4 h-4 text-cyber-pink" /> Department Active Drives
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

      {/* AI STUDENT SCREENING / FILTER */}
      {activeTab === 'screening' && (
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex items-center gap-2.5 mb-6 border-b border-slate-800 pb-3">
              <Brain className="w-6 h-6 text-cyber-cyan" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                ATLAS Intelligent Screening Engine
              </h3>
            </div>

            <form onSubmit={handleAIScreening} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Drive</label>
                <select
                  value={selectedDriveId}
                  onChange={e => setSelectedDriveId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                >
                  <option value="">Choose Drive</option>
                  {drives.map(d => (
                    <option key={d.id} value={d.id}>{d.company_name} - {d.role_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Min CGPA override</label>
                <input
                  type="number"
                  step="0.01"
                  value={screeningCgpa}
                  onChange={e => setScreeningCgpa(e.target.value)}
                  placeholder="e.g. 8.00"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skills Keyword</label>
                <input
                  type="text"
                  value={screeningSkills}
                  onChange={e => setScreeningSkills(e.target.value)}
                  placeholder="React, Python (any match)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !selectedDriveId}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Screen Candidates
              </button>
            </form>
          </div>

          {/* Screening Results Table */}
          {screenedStudents.length > 0 && (
            <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyber-green" /> Matched Qualified Students
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Skills</th>
                      <th className="py-3 px-4">Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenedStudents.map((std) => (
                      <tr key={std.user.id} className="border-b border-slate-800/40 hover:bg-slate-900/20">
                        <td className="py-4 px-4 font-bold text-white">{std.user.name}</td>
                        <td className="py-4 px-4 font-mono text-slate-350">{std.user.register_number}</td>
                        <td className="py-4 px-4 text-xs text-slate-400">{std.user.department}</td>
                        <td className="py-4 px-4 font-mono text-cyber-cyan">{std.profile?.cgpa.toFixed(2)}</td>
                        <td className="py-4 px-4 text-xs text-slate-300 max-w-xs truncate">{std.profile?.skills || 'None'}</td>
                        <td className="py-4 px-4 text-xs">
                          {std.profile?.resume_url ? (
                            <a
                              href={`http://localhost:8000/${std.profile.resume_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyber-cyan hover:underline inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          ) : (
                            <span className="text-slate-600">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PUBLISH BROADCAST & NOTICE BOARD */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Publish Form */}
          <div className="lg:col-span-1 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyber-pink" /> Broadcast notice
            </h3>

            <form onSubmit={handlePublishAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. Technical Interview dates finalized"
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
                  <option value="General">General Notice</option>
                  <option value="Drive">Placement Drive update</option>
                  <option value="Interview">Interview Schedule announcement</option>
                  <option value="Important">Urgent Warning</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notification Content</label>
                <textarea
                  required
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Write your email body message here. This will automatically deliver to registered student Gmail accounts..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-44"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Sending Emails...' : 'Send Broadcast'}
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
                  Student Application Tracking Board
                </h3>
              </div>
              <div className="w-full md:w-72">
                <select
                  value={selectedAppDriveId}
                  onChange={e => setSelectedAppDriveId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                >
                  <option value="">Select Recruitment Drive</option>
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
                        <th className="py-3 px-4">CGPA</th>
                        <th className="py-3 px-4">Skills</th>
                        <th className="py-3 px-4">Resume</th>
                        <th className="py-3 px-4">Applied Date</th>
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
                                <span className="text-slate-600">No resume</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-400">
                              {new Date(app.applied_at).toLocaleDateString()}
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
