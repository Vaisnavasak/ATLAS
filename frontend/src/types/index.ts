export interface Token {
  access_token: string;
  token_type: string;
  role: string;
  name: string;
  email: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'coordinator' | 'officer';
  department?: string;
  register_number?: string;
  is_verified: boolean;
  created_at: string;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  cgpa: number;
  skills?: string;
  certifications?: string;
  internships?: string;
  projects?: string;
  resume_url?: string;
  is_verified: boolean;
  approved_at?: string;
}

export interface StudentUserDetail {
  user: User;
  profile?: StudentProfile;
}

export interface PlacementDrive {
  id: number;
  company_name: string;
  role_name: string;
  ctc: number;
  min_cgpa: number;
  eligible_departments: string;
  description?: string;
  drive_date: string;
  registration_deadline: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Application {
  id: number;
  student_id: number;
  drive_id: number;
  status: 'Applied' | 'Reviewing' | 'Interview Scheduled' | 'Offered' | 'Rejected';
  resume_url?: string;
  applied_at: string;
  interview_date?: string;
  feedback?: string;
  student: User;
  drive: PlacementDrive;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  department?: string;
  category: 'General' | 'Drive' | 'Interview' | 'Important';
  created_by: number;
  created_at: string;
  creator: User;
}

export interface AIChatMessage {
  sender: 'user' | 'atlas';
  text: string;
}
