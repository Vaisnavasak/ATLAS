from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: Optional[str] = None
    username: Optional[str] = None

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

# --- User Authentication & Profiles ---
class UserRegister(BaseModel):
    name: str
    email: Optional[str] = None
    password: str
    role: str = Field(pattern="^(student|coordinator|officer)$")
    department: Optional[str] = None
    register_number: Optional[str] = None
    employee_id: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class OTPVerify(BaseModel):
    username: str
    otp: str

class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    name: str
    role: str
    department: Optional[str] = None
    register_number: Optional[str] = None
    employee_id: Optional[str] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Student Profile Schemas ---
class StudentProfileCreateUpdate(BaseModel):
    cgpa: float = Field(ge=0.0, le=10.0)
    skills: Optional[str] = None  # Comma-separated (e.g., "React,Python,C++")
    certifications: Optional[str] = None
    internships: Optional[str] = None
    projects: Optional[str] = None

class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    cgpa: float
    skills: Optional[str] = None
    certifications: Optional[str] = None
    internships: Optional[str] = None
    projects: Optional[str] = None
    resume_url: Optional[str] = None
    is_verified: bool
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudentUserDetailResponse(BaseModel):
    user: UserResponse
    profile: Optional[StudentProfileResponse] = None

# --- Placement Drive Schemas ---
class PlacementDriveCreateUpdate(BaseModel):
    company_name: str
    role_name: str
    ctc: float
    min_cgpa: float
    eligible_departments: str  # Comma-separated (e.g. "CSE,IT,AIDS")
    description: Optional[str] = None
    drive_date: datetime
    registration_deadline: datetime
    status: Optional[str] = "active"

class PlacementDriveResponse(BaseModel):
    id: int
    company_name: str
    role_name: str
    ctc: float
    min_cgpa: float
    eligible_departments: str
    description: Optional[str] = None
    drive_date: datetime
    registration_deadline: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Placement Drive Applications ---
class ApplicationCreate(BaseModel):
    drive_id: int

class ApplicationStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Applied|Reviewing|Interview Scheduled|Offered|Rejected)$")
    interview_date: Optional[datetime] = None
    feedback: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    drive_id: int
    status: str
    resume_url: Optional[str] = None
    applied_at: datetime
    interview_date: Optional[datetime] = None
    feedback: Optional[str] = None
    student: UserResponse
    drive: PlacementDriveResponse

    class Config:
        from_attributes = True

# --- Announcement Schemas ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    department: Optional[str] = "All"
    category: Optional[str] = "General"  # "General", "Drive", "Interview", "Important"

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    department: Optional[str]
    category: str
    created_by: int
    created_at: datetime
    creator: UserResponse

    class Config:
        from_attributes = True

# --- AI Chat / Assistant Schemas ---
class AIChatRequest(BaseModel):
    message: str
    resume_context: Optional[str] = None

class AIChatResponse(BaseModel):
    reply: str
