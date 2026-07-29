from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "student", "coordinator", "officer"
    department = Column(String, nullable=True)  # Required for student/coordinator
    register_number = Column(String, unique=True, nullable=True)  # Required for student
    employee_id = Column(String, unique=True, nullable=True)  # Required for coordinator/officer
    
    # OTP Verification
    is_verified = Column(Boolean, default=False)
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="creator")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    cgpa = Column(Float, nullable=False, default=0.0)
    skills = Column(Text, nullable=True)  # Comma separated list (e.g. "React,Python,SQL")
    certifications = Column(Text, nullable=True)  # JSON or simple text
    internships = Column(Text, nullable=True)  # JSON or simple text
    projects = Column(Text, nullable=True)  # JSON or simple text
    resume_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)  # Verified by Coordinator
    approved_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="profile")

class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    role_name = Column(String, nullable=False)
    ctc = Column(Float, nullable=False)  # In LPA, e.g., 8.5
    min_cgpa = Column(Float, nullable=False, default=0.0)
    eligible_departments = Column(Text, nullable=False)  # Comma-separated departments
    description = Column(Text, nullable=True)
    drive_date = Column(DateTime, nullable=False)
    registration_deadline = Column(DateTime, nullable=False)
    status = Column(String, default="active")  # "active", "completed", "cancelled"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    applications = relationship("Application", back_populates="drive", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    drive_id = Column(Integer, ForeignKey("placement_drives.id", ondelete="CASCADE"))
    status = Column(String, default="Applied")  # "Applied", "Reviewing", "Interview Scheduled", "Offered", "Rejected"
    resume_url = Column(String, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    interview_date = Column(DateTime, nullable=True)
    feedback = Column(Text, nullable=True)  # AI or coordinator feedback
    
    # Relationships
    student = relationship("User", back_populates="applications")
    drive = relationship("PlacementDrive", back_populates="applications")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    department = Column(String, nullable=True)  # "All" or specific department
    category = Column(String, default="General")  # "General", "Drive", "Interview", "Important"
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="announcements")
