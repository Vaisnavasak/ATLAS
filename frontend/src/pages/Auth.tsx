import React, { useState } from 'react';
import { Eye, EyeOff, Key, Mail, User, BookOpen, Fingerprint, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { Token } from '../types';

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

interface AuthProps {
  onLoginSuccess: (tokenData: Token) => void;
}

type AuthMode = 'login' | 'register' | 'otp';

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  
  // Registration / Login input state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [registerNumber, setRegisterNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  
  // OTP input state
  const [otp, setOtp] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const resetFields = () => {
    setError(null);
    setInfoMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFields();
    if (!email || !password) {
      setError("Please fill out all credentials.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoUsername: string) => {
    resetFields();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demoUsername, password: 'password123' })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFields();
    
    if (!name || !password) {
      setError("Please fill out all required fields.");
      return;
    }
    
    if (role === 'student' && !registerNumber) {
      setError("Register number is required for student verification.");
      return;
    }

    if (role !== 'student' && !employeeId) {
      setError("Employee ID is required for administrative verification.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          password,
          role,
          department: role !== 'officer' ? department : undefined,
          register_number: role === 'student' ? registerNumber : undefined,
          employee_id: role !== 'student' ? employeeId : undefined
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      if (data.is_verified) {
        setInfoMessage("Registration successful! Account has been verified automatically. You can now log in.");
        setMode('login');
      } else {
        setInfoMessage("Registration successful! An OTP code has been logged to backend console/sent to email.");
        setMode('otp');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFields();
    if (!otp) {
      setError("Please enter the verification OTP code.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, otp })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'OTP verification failed');
      }
      
      setInfoMessage("Email verified successfully! You can now log in.");
      setMode('login');
      setPassword(''); // clear password for security
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6">
      {/* Background elements */}
      <div className="cyber-grid" />
      <div className="neon-glow-cyan top-1/4 left-1/3" />
      <div className="neon-glow-pink bottom-1/4 right-1/3" />

      {/* Main Glass Card */}
      <div className="w-full max-w-lg glass-panel rounded-3xl p-8 border border-white/10 shadow-neon-cyan/15 relative overflow-hidden">
        
        {/* Luminous top border glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan to-cyber-pink" />

        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-3xl font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyber-cyan to-cyber-blue drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]">
            ATLAS
          </span>
          <p className="text-xs text-slate-400 mt-2 tracking-wider font-semibold uppercase">
            AI-Driven Placement Coordinator System
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 gap-1 mb-6">
          <button
            type="button"
            onClick={() => { setRole('student'); resetFields(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              role === 'student'
                ? 'bg-gradient-to-r from-cyber-cyan to-cyber-blue text-slate-950 font-extrabold shadow-neon-cyan/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => { setRole('coordinator'); resetFields(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              role === 'coordinator'
                ? 'bg-gradient-to-r from-cyber-cyan to-cyber-blue text-slate-950 font-extrabold shadow-neon-cyan/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💼 Coordinator
          </button>
          <button
            type="button"
            onClick={() => { setRole('officer'); resetFields(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              role === 'officer'
                ? 'bg-gradient-to-r from-cyber-cyan to-cyber-blue text-slate-950 font-extrabold shadow-neon-cyan/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Officer
          </button>
        </div>

        {/* Action Status Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-cyber-pink/10 border border-cyber-pink/30 flex items-center gap-3 text-cyber-pink text-sm font-sans animate-headShake">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm font-sans">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {role === 'student' ? 'Register Number' : 'Employee ID'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === 'student' ? "e.g., CSE2023001" : "e.g., EMP_CSE_001"}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold tracking-wide hover:opacity-90 active:scale-[0.99] transition-all"
            >
              {isLoading ? 'Decrypting Credentials...' : 'Access Terminal'}
            </button>

            <div className="text-center pt-2 text-xs text-slate-400 font-sans">
              New to ATLAS recruitment cells?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); resetFields(); }}
                className="text-cyber-cyan hover:underline font-semibold"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* REGISTRATION MODE */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Institutional Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@student.atlas.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 transition-colors"
                  />
                </div>
              </div>

              {role === 'student' ? (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Register Number</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={registerNumber}
                      onChange={e => setRegisterNumber(e.target.value)}
                      placeholder="CSE2023001"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200 transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Employee ID</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      placeholder="EMP_CSE_001"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200 transition-colors"
                    />
                  </div>
                </div>
              )}

              {role !== 'officer' && (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Department</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyber-cyan text-xs focus:outline-none text-slate-200"
                    >
                      {DEPARTMENTS.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan text-sm focus:outline-none text-slate-200 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold tracking-wide hover:opacity-90 active:scale-[0.99] transition-all mt-4"
            >
              {isLoading ? 'Creating credentials...' : 'Register Cell'}
            </button>

            <div className="text-center pt-2 text-xs text-slate-400 font-sans">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); resetFields(); }}
                className="text-cyber-cyan hover:underline font-semibold"
              >
                Log In
              </button>
            </div>
          </form>
        )}

        {/* OTP VERIFICATION MODE */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center text-xs text-slate-300 font-sans leading-relaxed">
              We have dispatched a 6-digit OTP verification code to <strong>{email}</strong>. 
              Please fetch it from your backend stdout/console log to continue registration.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Verification Code (OTP)</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter 6-digit Code"
                maxLength={6}
                className="w-full py-3.5 text-center tracking-[1em] text-lg font-bold rounded-xl bg-slate-900/60 border border-slate-700/80 focus:border-cyber-cyan focus:outline-none text-cyber-cyan transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan text-slate-950 font-bold tracking-wide hover:opacity-90 active:scale-[0.99] transition-all"
            >
              {isLoading ? 'Confirming Code...' : 'Verify & Unlock'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('register'); resetFields(); }}
                className="text-xs text-slate-500 hover:text-slate-300 hover:underline font-sans"
              >
                Back to Registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
