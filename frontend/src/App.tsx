import React, { useState, useEffect } from 'react';
import type { Token, User } from './types';
import { Auth } from './pages/Auth';
import { Layout } from './components/Layout';
import { StudentDashboard } from './pages/StudentDashboard';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { AtlasChat } from './components/AtlasChat';
import { ShieldCheck, Sparkles } from 'lucide-react';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(false);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error("Initialization error", error);
      handleLogout();
    }
  };

  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  const handleLoginSuccess = (tokenData: Token) => {
    localStorage.setItem('token', tokenData.access_token);
    setToken(tokenData.access_token);
    
    // Quick user details state
    const quickUser: User = {
      id: 0,
      email: tokenData.email,
      name: tokenData.name,
      role: tokenData.role as 'student' | 'coordinator' | 'officer',
      is_verified: true,
      created_at: new Date().toISOString()
    };
    setUser(quickUser);
    setActiveTab('dashboard');
    
    // Fetch full verified details in background
    fetchCurrentUser(tokenData.access_token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center flex-col gap-4 relative">
        <div className="cyber-grid" />
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-cyber-cyan animate-spin" />
        <span className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase">
          Initializing ATLAS Core...
        </span>
      </div>
    );
  }

  // Auth screen guard
  if (!token || !user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
        {user.role === 'student' && (
          <StudentDashboard user={user} token={token} activeTab={activeTab} />
        )}
        {user.role === 'coordinator' && (
          <CoordinatorDashboard user={user} token={token} activeTab={activeTab} />
        )}
        {user.role === 'officer' && (
          <OfficerDashboard user={user} token={token} activeTab={activeTab} />
        )}
      </Layout>
      
      {/* Universal Chat overlay */}
      <AtlasChat token={token} />
    </>
  );
}

export default App;
