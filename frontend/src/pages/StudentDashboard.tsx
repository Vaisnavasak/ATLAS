import React, { useState, useEffect } from 'react';
import type { User, StudentProfile, PlacementDrive, Application, Announcement } from '../types';
import { BookOpen, Award, Briefcase, Code, FileText, CheckCircle2, AlertTriangle, Send, Calendar, Clock, Terminal, Bell } from 'lucide-react';

interface StudentProps {
  user: User | null;
  token: string | null;
  activeTab: string;
}

export const StudentDashboard: React.FC<StudentProps> = ({ user, token, activeTab }) => {
  // Database entities
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Editing forms state
  const [cgpa, setCgpa] = useState<number>(0.0);
  const [skills, setSkills] = useState<string>('');
  const [certifications, setCertifications] = useState<string>('');
  const [internships, setInternships] = useState<string>('');
  const [projects, setProjects] = useState<string>('');

  // UI state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchStudentData = async () => {
    if (!token) return;
    try {
      // 1. Fetch Profile
      const profileRes = await fetch('http://localhost:8000/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const pData: StudentProfile = await profileRes.json();
        setProfile(pData);
        setCgpa(pData.cgpa);
        setSkills(pData.skills || '');
        setCertifications(pData.certifications || '');
        setInternships(pData.internships || '');
        setProjects(pData.projects || '');
      }

      // 2. Fetch Drives
      const drivesRes = await fetch('http://localhost:8000/api/drives', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (drivesRes.ok) {
        setDrives(await drivesRes.json());
      }

      // 3. Fetch Applications
      const appsRes = await fetch('http://localhost:8000/api/applications/student', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appsRes.ok) {
        setApplications(await appsRes.json());
      }

      // 4. Fetch Announcements
      const annRes = await fetch('http://localhost:8000/api/announcements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }

    } catch (error) {
      console.error("Failed to load student data", error);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [token]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatusMsg(null);
    setIsSavingProfile(true);

    try {
      const response = await fetch('http://localhost:8000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cgpa, skills, certifications, internships, projects })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update profile');
      }
      setProfile(data);
      setStatusMsg({ type: 'success', text: 'Academic details updated successfully. Profile status reset to pending coordinator approval.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setResumeFile(file);
    setStatusMsg(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/profile/resume', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }
      if (profile) {
        setProfile({ ...profile, resume_url: data.resume_url, is_verified: false });
      }
      setStatusMsg({ type: 'success', text: 'Resume uploaded successfully! Submit profile details to trigger review.' });
      fetchStudentData(); // Refresh verify badge
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterForDrive = async (driveId: number) => {
    if (!token) return;
    setStatusMsg(null);
    try {
      const response = await fetch(`http://localhost:8000/api/drives/${driveId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      setStatusMsg({ type: 'success', text: 'Registered for drive successfully!' });
      fetchStudentData(); // Refresh drives and applications
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Check if student has applied for a specific drive
  const isApplied = (driveId: number) => {
    return applications.some(app => app.drive_id === driveId);
  };

  const getApplicationStatus = (driveId: number) => {
    const app = applications.find(app => app.drive_id === driveId);
    return app ? app.status : null;
  };

  // Eligibility evaluation helper
  const checkEligibility = (drive: PlacementDrive) => {
    if (!profile) return { eligible: false, reason: 'Please build your profile details first.' };
    if (!profile.resume_url) return { eligible: false, reason: 'Resume upload is required.' };
    if (!user?.is_verified) return { eligible: false, reason: 'Profile pending coordinator verification.' };
    if (profile.cgpa < drive.min_cgpa) return { eligible: false, reason: `CGPA is below threshold of ${drive.min_cgpa}` };
    
    // Check branch
    const eligibleDepts = drive.eligible_departments.split(',').map(d => d.trim());
    if (!eligibleDepts.includes('All') && user?.department && !eligibleDepts.includes(user.department)) {
      return { eligible: false, reason: 'Department branch not eligible.' };
    }
    
    return { eligible: true, reason: 'All criteria cleared' };
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Alert toast panel */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border text-sm font-sans ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-cyber-pink/10 border-cyber-pink/30 text-cyber-pink'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* OVERVIEW PANEL */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Greeting Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-cyan to-cyber-blue font-extrabold">{user?.name}</span>! 👋
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Welcome back to your student recruitment portal. Update your profile info or browse placement drives.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-xl text-xs font-mono border ${
              profile?.is_verified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}>
              {profile?.is_verified ? 'Verified Student Profile' : 'Pending Verification'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Welcome Statistics */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">My CGPA</span>
                  <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                    {profile ? profile.cgpa.toFixed(2) : '0.00'}
                  </h3>
                  <span className="text-[10px] text-cyber-cyan mt-1">Institutional Scale</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Drive Registrations</span>
                  <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{applications.length}</h3>
                  <span className="text-[10px] text-cyber-purple mt-1">Active Applications</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Verification Status</span>
                  <h3 className={`text-sm font-bold mt-4 uppercase ${
                    user?.is_verified ? 'text-emerald-400' : 'text-cyber-pink'
                  }`}>
                    {user?.is_verified ? 'Approved & Ready' : 'Pending Review'}
                  </h3>
                  <span className="text-[10px] text-slate-500 mt-1">Dept Coordinator</span>
                </div>
              </div>

              {/* Applications Progress tracker */}
              <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyber-cyan" /> Application Status Tracker
                </h3>
                
                {applications.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    You have not registered for any recruitment drives yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="font-bold text-white text-base">{app.drive.company_name}</h4>
                          <p className="text-xs text-slate-400 font-sans mt-0.5">{app.drive.role_name} • CTC: {app.drive.ctc} LPA</p>
                          
                          {app.status === 'Interview Scheduled' && app.interview_date && (
                            <div className="mt-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Interview: {new Date(app.interview_date).toLocaleString()}</span>
                            </div>
                          )}
                          {app.feedback && (
                            <p className="mt-2 text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/15">
                              <strong>Note:</strong> {app.feedback}
                            </p>
                          )}
                        </div>

                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          app.status === 'Offered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 glow-cyan' :
                          app.status === 'Rejected' ? 'bg-cyber-pink/10 text-cyber-pink border-cyber-pink/30' :
                          app.status === 'Interview Scheduled' ? 'bg-cyan-500/10 text-cyber-cyan border-cyber-cyan/30 shadow-neon-cyan' :
                          'bg-slate-850 text-slate-400 border-slate-800'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Announcement Widget */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col h-[500px]">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyber-pink animate-bounce" /> Broadcasts Wall
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {announcements.length === 0 ? (
                  <div className="text-center py-20 text-slate-650 text-sm">
                    No active broadcasts.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="p-4 rounded-xl bg-slate-950/60 border-l-4 border-cyber-pink text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-200">{ann.title}</h4>
                        <span className="text-[9px] text-slate-500">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-sans">{ann.content}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2 font-mono">
                        <span>By: {ann.creator.name}</span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded text-cyber-cyan">{ann.category}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE BUILDER */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Forms Entry */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyber-cyan" /> Edit Academic Portfolio
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-cyber-cyan" /> Current CGPA (out of 10)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={e => setCgpa(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-cyber-cyan" /> Technical Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    placeholder="React, Python, SQL, C++, AWS"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-cyber-cyan" /> Certifications
                </label>
                <textarea
                  value={certifications}
                  onChange={e => setCertifications(e.target.value)}
                  placeholder="Meta Frontend Developer Specialization, AWS Cloud Practitioner..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-cyber-cyan" /> Internships
                </label>
                <textarea
                  value={internships}
                  onChange={e => setInternships(e.target.value)}
                  placeholder="Software Developer Intern at XYZ Corp (June 2025 - August 2025). Built backend routers."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-cyber-cyan" /> Academic & Personal Projects
                </label>
                <textarea
                  value={projects}
                  onChange={e => setProjects(e.target.value)}
                  placeholder="Recruitment System: Built React + FastAPI web app to filter resumes. Integrated SQLite DB."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 h-24"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSavingProfile ? 'Saving details...' : 'Submit Portfolio'}
              </button>
            </form>
          </div>

          {/* Resume Upload Column */}
          <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between h-[450px]">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyber-pink" /> Resume Attachment
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-6">
                Upload your latest resume in PDF format. Coordinators will review your resume alongside your profile metrics to grant recruitment approvals.
              </p>

              {/* Upload State */}
              {profile?.resume_url ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <FileText className="w-5 h-5 text-cyber-cyan" />
                    <span className="font-mono truncate">demo_resume.pdf</span>
                  </div>
                  <a
                    href={`http://localhost:8000/${profile.resume_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyber-cyan hover:underline font-semibold mt-1"
                  >
                    View Current Attachment
                  </a>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-xl mb-6">
                  <p className="text-xs text-slate-500">No resume uploaded yet.</p>
                </div>
              )}
            </div>

            <div>
              <label className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyber-cyan/50 text-slate-300 font-semibold text-xs cursor-pointer transition-colors text-center">
                <FileText className="w-4 h-4 text-cyber-cyan" />
                {isUploading ? 'Uploading file...' : 'Choose PDF File'}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* PLACEMENT DRIVES LIST */}
      {activeTab === 'drives' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyber-cyan" /> Active Recruitment Drives
          </h3>

          {drives.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No placement drives are active at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {drives.map((drive) => {
                const eligibility = checkEligibility(drive);
                const appliedState = isApplied(drive.id);
                const currentStatus = getApplicationStatus(drive.id);
                
                return (
                  <div key={drive.id} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xl font-bold text-white">{drive.company_name}</h4>
                          <p className="text-xs text-slate-400 font-sans mt-0.5">{drive.role_name}</p>
                        </div>
                        <span className="text-lg font-mono font-extrabold text-cyber-cyan">{drive.ctc} LPA</span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs font-sans text-slate-300">
                        <p>{drive.description}</p>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Cut-Off CGPA</span>
                            <span className="font-semibold text-slate-200">{drive.min_cgpa.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Target Branches</span>
                            <span className="font-semibold text-slate-200 truncate block" title={drive.eligible_departments}>
                              {drive.eligible_departments}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Drive Date</span>
                            <span className="font-semibold text-slate-200">
                              {new Date(drive.drive_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Deadline</span>
                            <span className="font-semibold text-cyber-pink">
                              {new Date(drive.registration_deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Buttons / Eligibility */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
                      {appliedState ? (
                        <div className="w-full p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Registered ({currentStatus})
                        </div>
                      ) : eligibility.eligible ? (
                        <button
                          onClick={() => handleRegisterForDrive(drive.id)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
                        >
                          Register Drive
                        </button>
                      ) : (
                        <div className="w-full p-2.5 rounded-xl bg-cyber-pink/5 border border-cyber-pink/20 text-center text-[10px] text-cyber-pink font-semibold flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Locked: {eligibility.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS WALL ONLY */}
      {activeTab === 'announcements' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-xl max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyber-pink" /> Broadcast announcements
          </h3>

          <div className="space-y-6">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-pink" />
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <span className="text-[10px] text-cyber-cyan uppercase font-mono tracking-wider bg-cyber-cyan/10 px-2 py-0.5 rounded">
                      {ann.category}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1.5">{ann.title}</h4>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{new Date(ann.created_at).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 text-sm font-sans pl-2 leading-relaxed whitespace-pre-line">{ann.content}</p>
                <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 pl-2">
                  <span>Author: {ann.creator.name} ({ann.creator.role})</span>
                  <span>Scope: {ann.department}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
