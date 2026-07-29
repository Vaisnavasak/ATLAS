import os
import random
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models, schemas, auth, database
from database import engine, get_db, Base
from ai_assistant import call_groq_api
from email_service import send_html_email

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# USERS_JSON_PATH for persistent login verification
USERS_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

def save_user_to_json(user: models.User):
    users_data = []
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r") as f:
                users_data = json.load(f)
        except Exception:
            users_data = []
            
    # Check if user already in JSON list by id or identifiers
    exists = False
    for idx, u in enumerate(users_data):
        if u["id"] == user.id or (user.register_number and u.get("register_number") == user.register_number) or (user.employee_id and u.get("employee_id") == user.employee_id):
            exists = True
            users_data[idx] = {
                "id": user.id,
                "email": user.email,
                "hashed_password": user.hashed_password,
                "name": user.name,
                "role": user.role,
                "department": user.department,
                "register_number": user.register_number,
                "employee_id": user.employee_id,
                "is_verified": user.is_verified
            }
            break
            
    if not exists:
        users_data.append({
            "id": user.id,
            "email": user.email,
            "hashed_password": user.hashed_password,
            "name": user.name,
            "role": user.role,
            "department": user.department,
            "register_number": user.register_number,
            "employee_id": user.employee_id,
            "is_verified": user.is_verified
        })
        
    try:
        with open(USERS_JSON_PATH, "w") as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        print(f"[JSON ERROR] Failed to save users.json: {e}")

def sync_users_from_json(db: Session):
    if not os.path.exists(USERS_JSON_PATH):
        with open(USERS_JSON_PATH, "w") as f:
            json.dump([], f)
        return

    try:
        with open(USERS_JSON_PATH, "r") as f:
            users_data = json.load(f)
    except Exception as e:
        print(f"[JSON ERROR] Failed to load users.json: {e}")
        return

    print(f"[JSON] Syncing {len(users_data)} users from users.json...")
    for u in users_data:
        db_user = db.query(models.User).filter(models.User.id == u["id"]).first()
        if not db_user:
            db_user = db.query(models.User).filter(
                (models.User.email == u.get("email")) |
                (models.User.register_number == u.get("register_number")) |
                (models.User.employee_id == u.get("employee_id"))
            ).first()
            
        if not db_user:
            db_user = models.User(
                id=u.get("id"),
                email=u.get("email"),
                hashed_password=u.get("hashed_password"),
                name=u.get("name"),
                role=u.get("role"),
                department=u.get("department"),
                register_number=u.get("register_number"),
                employee_id=u.get("employee_id"),
                is_verified=u.get("is_verified", True)
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            if db_user.role == "student":
                profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == db_user.id).first()
                if not profile:
                    profile = models.StudentProfile(
                        user_id=db_user.id,
                        cgpa=u.get("cgpa", 0.0),
                        skills=u.get("skills", ""),
                        certifications="",
                        internships="",
                        projects="",
                        resume_url=None,
                        is_verified=False
                    )
                    db.add(profile)
                    db.commit()

app = FastAPI(title="ATLAS AI-Driven Placement Coordinator System API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory static server
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Create Database tables on startup and seed
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        sync_users_from_json(db)
        seed_database(db)
    finally:
        db.close()

def seed_database(db: Session):
    # Check if we already have drives
    if db.query(models.PlacementDrive).count() > 0:
        return
        
    print("[SEED] Starting database seeding (clean slate)...")
    
    # 1. Create Placement Drives
    google_drive = models.PlacementDrive(
        company_name="Google",
        role_name="Associate Software Engineer",
        ctc=18.0,
        min_cgpa=8.0,
        eligible_departments="Computer Science and Engineering (CSE),Information Technology (IT),Artificial Intelligence and Data Science (AIDS),Artificial Intelligence and Machine Learning (AIML)",
        description="We are looking for creative software developers to solve complex real-world problems. Core skills: Data Structures, Algorithms, System Design, and Modern Javascript/Python.",
        drive_date=datetime.utcnow() + timedelta(days=15),
        registration_deadline=datetime.utcnow() + timedelta(days=5),
        status="active"
    )
    
    tcs_drive = models.PlacementDrive(
        company_name="TCS",
        role_name="System Engineer",
        ctc=4.5,
        min_cgpa=6.0,
        eligible_departments="All",
        description="Mass recruitment drive for engineering graduates. Strong communication and logic building skills required.",
        drive_date=datetime.utcnow() + timedelta(days=20),
        registration_deadline=datetime.utcnow() + timedelta(days=10),
        status="active"
    )
    db.add_all([google_drive, tcs_drive])
    db.commit()
    
    # Create a dummy resume.pdf file so links don't error
    dummy_pdf_path = os.path.join(UPLOAD_DIR, "demo_resume.pdf")
    if not os.path.exists(dummy_pdf_path):
        with open(dummy_pdf_path, "w") as f:
            f.write("%PDF-1.4 Mock Resume File content for ATLAS placement platform demonstration.")
            
    print("[SEED] Database seeded successfully!")

# --- API Endpoints ---

# --- AUTHENTICATION ---

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if email/register number/employee ID exists
    if user_in.email and db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
        
    if user_in.role == "student":
        if not user_in.register_number:
            raise HTTPException(status_code=400, detail="Register number is required for students")
        if db.query(models.User).filter(models.User.register_number == user_in.register_number).first():
            raise HTTPException(status_code=400, detail="Register number is already registered")
    else:
        if not user_in.employee_id:
            raise HTTPException(status_code=400, detail="Employee ID is required for coordinators and officers")
        if db.query(models.User).filter(models.User.employee_id == user_in.employee_id).first():
            raise HTTPException(status_code=400, detail="Employee ID is already registered")
        
    # Generate OTP (Simple 6-digit)
    otp = f"{random.randint(100000, 999999)}"
    otp_expiry = datetime.utcnow() + timedelta(minutes=15)
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    
    # Auto-verify if no email is provided to make local experience seamless
    is_verified_initial = True if not user_in.email else False
    
    db_user = models.User(
        email=user_in.email if user_in.email else None,
        hashed_password=hashed_pwd,
        name=user_in.name,
        role=user_in.role,
        department=user_in.department,
        register_number=user_in.register_number if user_in.role == "student" else None,
        employee_id=user_in.employee_id if user_in.role != "student" else None,
        is_verified=is_verified_initial,
        otp=otp if user_in.email else None,
        otp_expiry=otp_expiry if user_in.email else None
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # If user is student and auto-verified, create profile
    if is_verified_initial and db_user.role == "student":
        profile = models.StudentProfile(
            user_id=db_user.id,
            cgpa=0.0,
            skills="",
            certifications="",
            internships="",
            projects="",
            resume_url=None,
            is_verified=False
        )
        db.add(profile)
        db.commit()
    
    # Save registered user details to users.json file for verification backup
    save_user_to_json(db_user)

    if user_in.email:
        # Log OTP for easy verification and send email
        print(f"[OTP LOG] Generated OTP {otp} for user {db_user.email}")
        send_html_email(
            to_email=db_user.email,
            subject="ATLAS OTP Verification",
            title="Account Verification Code",
            content=f"Thank you for registering on ATLAS. Your verification code is: <h2 style='color:#00f2fe; text-align:center;'>{otp}</h2> This code is valid for 15 minutes."
        )
    
    return db_user

@app.post("/api/auth/verify-otp")
def verify_otp(verify_in: schemas.OTPVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.email == verify_in.username) |
        (models.User.register_number == verify_in.username) |
        (models.User.employee_id == verify_in.username)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        return {"message": "Account is already verified"}
        
    if user.otp != verify_in.otp or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        
    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    
    # Create empty student profile if user is student
    if user.role == "student":
        profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
        if not profile:
            profile = models.StudentProfile(
                user_id=user.id,
                cgpa=0.0,
                skills="",
                certifications="",
                internships="",
                projects="",
                resume_url=None,
                is_verified=False
            )
            db.add(profile)
        
    db.commit()
    
    # Save the verified status to users.json
    save_user_to_json(user)

    return {"message": "Account verified successfully. You can now login."}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # Load users from JSON for verification
    user_record = None
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r") as f:
                users_data = json.load(f)
                for u in users_data:
                    if (u.get("email") == login_in.username or 
                        u.get("register_number") == login_in.username or 
                        u.get("employee_id") == login_in.username):
                        user_record = u
                        break
        except Exception as e:
            print(f"[JSON ERROR] Failed to read users.json on login: {e}")

    # If found in JSON, verify password and ensure SQLite db is synced
    if user_record:
        if not auth.verify_password(login_in.password, user_record["hashed_password"]):
            raise HTTPException(status_code=400, detail="Incorrect credentials or password")
            
        # Ensure user exists in SQLite db
        user = db.query(models.User).filter(models.User.id == user_record["id"]).first()
        if not user:
            user = db.query(models.User).filter(
                (models.User.email == user_record.get("email")) |
                (models.User.register_number == user_record.get("register_number")) |
                (models.User.employee_id == user_record.get("employee_id"))
            ).first()
            
        if not user:
            user = models.User(
                id=user_record["id"],
                email=user_record.get("email"),
                hashed_password=user_record["hashed_password"],
                name=user_record["name"],
                role=user_record["role"],
                department=user_record.get("department"),
                register_number=user_record.get("register_number"),
                employee_id=user_record.get("employee_id"),
                is_verified=user_record.get("is_verified", True)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            if user.role == "student":
                profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
                if not profile:
                    profile = models.StudentProfile(
                        user_id=user.id,
                        cgpa=0.0,
                        skills="",
                        certifications="",
                        internships="",
                        projects="",
                        resume_url=None,
                        is_verified=False
                    )
                    db.add(profile)
                    db.commit()
    else:
        # Fallback to SQLite DB if JSON file doesn't have it (or raise)
        user = db.query(models.User).filter(
            (models.User.email == login_in.username) |
            (models.User.register_number == login_in.username) |
            (models.User.employee_id == login_in.username)
        ).first()
        if not user or not auth.verify_password(login_in.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect credentials or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account is not verified. Please verify your OTP first.")
        
    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role})
    username = user.register_number if user.role == "student" else user.employee_id
    if not username:
        username = user.email
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "username": username
    }

# Swagger UI Login Helper
@app.post("/api/auth/login-form-dummy")
def login_form_dummy(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_record = None
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r") as f:
                users_data = json.load(f)
                for u in users_data:
                    if (u.get("email") == form_data.username or 
                        u.get("register_number") == form_data.username or 
                        u.get("employee_id") == form_data.username):
                        user_record = u
                        break
        except Exception:
            pass
            
    if user_record:
        if not auth.verify_password(form_data.password, user_record["hashed_password"]):
            raise HTTPException(status_code=400, detail="Incorrect credentials or password")
        # Ensure exists in DB
        user = db.query(models.User).filter(models.User.id == user_record["id"]).first()
        if not user:
            user = models.User(
                id=user_record["id"],
                email=user_record.get("email"),
                hashed_password=user_record["hashed_password"],
                name=user_record["name"],
                role=user_record["role"],
                department=user_record.get("department"),
                register_number=user_record.get("register_number"),
                employee_id=user_record.get("employee_id"),
                is_verified=user_record.get("is_verified", True)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user = db.query(models.User).filter(
            (models.User.email == form_data.username) |
            (models.User.register_number == form_data.username) |
            (models.User.employee_id == form_data.username)
        ).first()
        if not user or not auth.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect credentials or password")
            
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified")
    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- STUDENT PROFILE ---

@app.get("/api/profile", response_model=schemas.StudentProfileResponse)
def get_my_profile(
    current_user: models.User = Depends(auth.require_student), 
    db: Session = Depends(get_db)
):
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.put("/api/profile", response_model=schemas.StudentProfileResponse)
def update_profile(
    profile_in: schemas.StudentProfileCreateUpdate,
    current_user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db)
):
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile.cgpa = profile_in.cgpa
    profile.skills = profile_in.skills
    profile.certifications = profile_in.certifications
    profile.internships = profile_in.internships
    profile.projects = profile_in.projects
    
    # If student updates profile, reset verification so coordinator can re-verify
    profile.is_verified = False
    
    db.commit()
    db.refresh(profile)
    return profile

@app.post("/api/profile/resume")
def upload_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db)
):
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    filename = f"resume_{current_user.id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
            
        # Set URL database path
        profile.resume_url = f"uploads/{filename}"
        profile.is_verified = False # Reset verification for Coordinator approval
        db.commit()
        db.refresh(profile)
        
        return {"resume_url": profile.resume_url, "message": "Resume uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# Get all students list for Coordinator (with profiles)
@app.get("/api/profile/list", response_model=List[schemas.StudentUserDetailResponse])
def get_students_list(
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "student")
    
    # If coordinator, filter by department
    if current_user.role == "coordinator":
        query = query.filter(models.User.department == current_user.department)
        
    students = query.all()
    response_data = []
    
    for s in students:
        response_data.append({
            "user": s,
            "profile": s.profile
        })
        
    return response_data

@app.put("/api/profile/{student_id}/verify")
def verify_student_profile(
    student_id: int,
    approve: bool = Form(...),
    current_user: models.User = Depends(auth.require_coordinator),
    db: Session = Depends(get_db)
):
    student = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if student.department != current_user.department:
        raise HTTPException(status_code=403, detail="You can only verify students in your department")
        
    if not student.profile:
        raise HTTPException(status_code=400, detail="Student has not built a profile yet")
        
    student.profile.is_verified = approve
    student.profile.approved_at = datetime.utcnow() if approve else None
    db.commit()
    
    action = "approved" if approve else "rejected"
    
    # Send verification update email
    send_html_email(
        to_email=student.email,
        subject=f"ATLAS Profile Verification Update - {action.upper()}",
        title="Profile Review Finished",
        content=f"Your department placement coordinator has <strong>{action}</strong> your academic details and resume. Please check your dashboard for further recruitment drive updates."
    )
    
    return {"message": f"Student profile {action} successfully"}


# --- PLACEMENT DRIVES ---

@app.get("/api/drives", response_model=List[schemas.PlacementDriveResponse])
def list_drives(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.PlacementDrive).order_by(models.PlacementDrive.drive_date.asc()).all()

@app.post("/api/drives", response_model=schemas.PlacementDriveResponse)
def create_drive(
    drive_in: schemas.PlacementDriveCreateUpdate,
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    # If coordinator, check that their department is in the list of eligible departments (or 'All')
    if current_user.role == "coordinator":
        depts = [d.strip() for d in drive_in.eligible_departments.split(",")]
        # Coordinators can only create drives that cover their department (or are set to 'All')
        if current_user.department not in depts and "All" not in depts:
            # Silently append coordinator's department to the eligible list to ensure it belongs to their scope
            drive_in.eligible_departments += f",{current_user.department}"

    db_drive = models.PlacementDrive(
        company_name=drive_in.company_name,
        role_name=drive_in.role_name,
        ctc=drive_in.ctc,
        min_cgpa=drive_in.min_cgpa,
        eligible_departments=drive_in.eligible_departments,
        description=drive_in.description,
        drive_date=drive_in.drive_date,
        registration_deadline=drive_in.registration_deadline,
        status="active"
    )
    db.add(db_drive)
    db.commit()
    db.refresh(db_drive)
    return db_drive

@app.post("/api/drives/{drive_id}/register")
def register_for_drive(
    drive_id: int,
    current_user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db)
):
    drive = db.query(models.PlacementDrive).filter(models.PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
        
    if drive.status != "active":
        raise HTTPException(status_code=400, detail="This placement drive is no longer active")
        
    if datetime.utcnow() > drive.registration_deadline:
        raise HTTPException(status_code=400, detail="Registration deadline has passed")
        
    profile = current_user.profile
    if not profile or not profile.resume_url:
        raise HTTPException(status_code=400, detail="Please upload your resume before registering")
        
    if not profile.is_verified:
        raise HTTPException(status_code=400, detail="Your profile must be verified by the coordinator before you can register")
        
    # Check CGPA eligibility
    if profile.cgpa < drive.min_cgpa:
        raise HTTPException(status_code=400, detail=f"Your CGPA ({profile.cgpa}) is lower than the minimum required CGPA ({drive.min_cgpa})")
        
    # Check Department eligibility
    eligible_depts = [d.strip() for d in drive.eligible_departments.split(",")]
    if "All" not in eligible_depts and current_user.department not in eligible_depts:
        raise HTTPException(status_code=400, detail=f"Your department ({current_user.department}) is not eligible for this drive")
        
    # Check existing registration
    existing = db.query(models.Application).filter(
        models.Application.student_id == current_user.id,
        models.Application.drive_id == drive_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You are already registered for this drive")
        
    app_record = models.Application(
        student_id=current_user.id,
        drive_id=drive_id,
        status="Applied",
        resume_url=profile.resume_url
    )
    db.add(app_record)
    db.commit()
    
    # Notify via email
    send_html_email(
        to_email=current_user.email,
        subject=f"Successfully Registered for {drive.company_name} Drive",
        title="Application Confirmed",
        content=f"Your application for the role of <strong>{drive.role_name}</strong> at <strong>{drive.company_name}</strong> has been registered successfully. Keep tracking your dashboard for interview schedules!"
    )
    
    return {"message": "Successfully registered for placement drive"}

@app.get("/api/drives/screening/{drive_id}", response_model=List[schemas.StudentUserDetailResponse])
def screen_eligible_students(
    drive_id: int,
    min_cgpa: Optional[float] = None,
    skills_query: Optional[str] = None,
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    drive = db.query(models.PlacementDrive).filter(models.PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
        
    # Standard filter parameters from query parameters, fallback to drive's own criteria
    target_cgpa = min_cgpa if min_cgpa is not None else drive.min_cgpa
    
    # Base query: Students who are verified and match department eligibility
    query = db.query(models.User).join(models.StudentProfile).filter(
        models.User.role == "student",
        models.StudentProfile.is_verified == True,
        models.StudentProfile.cgpa >= target_cgpa
    )
    
    # If coordinator, limit to their department
    if current_user.role == "coordinator":
        query = query.filter(models.User.department == current_user.department)
    else:
        # Placement Officer sees all, but filtered by drive's eligible departments
        eligible_depts = [d.strip() for d in drive.eligible_departments.split(",")]
        if "All" not in eligible_depts:
            query = query.filter(models.User.department.in_(eligible_depts))
            
    matched_students = query.all()
    
    # Skills filtering in Python
    filtered_results = []
    for student in matched_students:
        profile = student.profile
        if skills_query and profile.skills:
            required_skills = [s.strip().lower() for s in skills_query.split(",")]
            student_skills = [s.strip().lower() for s in profile.skills.split(",")]
            # Match if any required skill matches the student's skills
            if not any(req in student_skills for req in required_skills):
                continue
        
        filtered_results.append({
            "user": student,
            "profile": profile
        })
        
    return filtered_results


# --- APPLICATIONS ---

@app.get("/api/applications/student", response_model=List[schemas.ApplicationResponse])
def get_my_applications(
    current_user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db)
):
    return db.query(models.Application).filter(models.Application.student_id == current_user.id).all()

@app.get("/api/applications/drive/{drive_id}", response_model=List[schemas.ApplicationResponse])
def get_drive_applications(
    drive_id: int,
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    query = db.query(models.Application).filter(models.Application.drive_id == drive_id)
    
    # If coordinator, only return students from their department
    if current_user.role == "coordinator":
        query = query.join(models.User).filter(models.User.department == current_user.department)
        
    return query.all()

@app.put("/api/applications/{app_id}/status")
def update_application_status(
    app_id: int,
    status_in: schemas.ApplicationStatusUpdate,
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    application = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found")
        
    # Check department authorization for coordinators
    if current_user.role == "coordinator" and application.student.department != current_user.department:
        raise HTTPException(status_code=403, detail="Unauthorized department action")
        
    application.status = status_in.status
    if status_in.interview_date:
        application.interview_date = status_in.interview_date
    if status_in.feedback:
        application.feedback = status_in.feedback
        
    db.commit()
    
    # Notify Student via HTML Email
    status_msg = f"Your application status for {application.drive.company_name} has been updated to: <strong>{application.status}</strong>."
    if status_in.status == "Interview Scheduled" and application.interview_date:
        formatted_date = application.interview_date.strftime("%B %d, %Y at %I:%M %p")
        status_msg += f"<br/><br/>🗓️ <strong>Interview Details:</strong><br/>Date: {formatted_date}<br/>Feedback/Link: {application.feedback or 'Details will be shared shortly'}"
    elif status_in.status == "Offered":
        status_msg += "<br/><br/>🏆 <strong>Congratulations!</strong> You have been selected for placement. Please review your dashboard for details."
        
    send_html_email(
        to_email=application.student.email,
        subject=f"ATLAS Application Status Updated: {application.drive.company_name}",
        title="Application Update",
        content=status_msg
    )
    
    return {"message": "Application status updated successfully", "status": application.status}


# --- ANNOUNCEMENTS ---

@app.get("/api/announcements", response_model=List[schemas.AnnouncementResponse])
def get_announcements(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Everyone can see global announcements ("All"). 
    # Students see announcements matching their department.
    # Coordinators and Officers see all announcements.
    if current_user.role == "student":
        return db.query(models.Announcement).filter(
            (models.Announcement.department == "All") | (models.Announcement.department == current_user.department)
        ).order_by(models.Announcement.created_at.desc()).all()
    else:
        return db.query(models.Announcement).order_by(models.Announcement.created_at.desc()).all()

@app.post("/api/announcements", response_model=schemas.AnnouncementResponse)
def publish_announcement(
    ann_in: schemas.AnnouncementCreate,
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    dept_target = ann_in.department
    # Coordinators can only post to their own department or "All"
    if current_user.role == "coordinator":
        dept_target = current_user.department
        
    db_ann = models.Announcement(
        title=ann_in.title,
        content=ann_in.content,
        department=dept_target,
        category=ann_in.category,
        created_by=current_user.id
    )
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    
    # Broadcast email announcement to students in the department
    student_query = db.query(models.User).filter(models.User.role == "student", models.User.is_verified == True)
    if dept_target != "All":
        student_query = student_query.filter(models.User.department == dept_target)
        
    students_to_notify = student_query.all()
    
    for student in students_to_notify:
        if student.email:
            send_html_email(
                to_email=student.email,
                subject=f"[ATLAS Announcement] {db_ann.title}",
                title=f"New Broadcast Notification ({db_ann.category})",
                content=f"Dear Student,<br/><br/>A new announcement has been published by <strong>{current_user.name}</strong> for <strong>{dept_target}</strong>:<br/><br/><blockquote>{db_ann.content}</blockquote>"
            )
            
    # Also notify coordinators if published by placement officer
    if current_user.role == "officer":
        coord_query = db.query(models.User).filter(models.User.role == "coordinator", models.User.is_verified == True)
        if dept_target != "All":
            coord_query = coord_query.filter(models.User.department == dept_target)
        coords_to_notify = coord_query.all()
        
        for coord in coords_to_notify:
            if coord.email:
                send_html_email(
                    to_email=coord.email,
                    subject=f"[ATLAS Announcement Alert] {db_ann.title}",
                    title=f"New Institution-Wide Notification ({db_ann.category})",
                    content=f"Dear Coordinator,<br/><br/>A new notice has been published by Placement Officer <strong>{current_user.name}</strong> for <strong>{dept_target}</strong>:<br/><br/><blockquote>{db_ann.content}</blockquote>"
                )
        
    return db_ann


# --- AI CHAT ASSISTANT (ATLAS) ---

@app.post("/api/ai/chat", response_model=schemas.AIChatResponse)
def chat_with_atlas(
    req: schemas.AIChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    system_prompt = (
        "You are ATLAS, the intelligent AI-Driven Campus Placement Assistant. "
        "Your role is to help students, coordinators, and placement officers manage and excel in the campus recruitment cycle. "
        "Be professional, inspiring, highly technical, and use cyber-themed/educational terminology when talking. "
    )
    
    if current_user.role == "student":
        # Add profile details to customize the AI's response
        profile = current_user.profile
        profile_details = ""
        if profile:
            profile_details = (
                f"Student Name: {current_user.name}, Department: {current_user.department}, "
                f"CGPA: {profile.cgpa}, Skills: {profile.skills or 'None set'}, "
                f"Certifications: {profile.certifications or 'None set'}, "
                f"Projects: {profile.projects or 'None set'}, "
                f"Internships: {profile.internships or 'None set'}."
            )
        system_prompt += (
            f"\n\nYou are currently chatting with student {current_user.name}. Here are their verified details to personalize your suggestions:\n"
            f"{profile_details}\n"
            "If they ask to review their resume, inspect these profile details and provide constructive feedback. "
            "If they ask about interview preparation, generate questions matching their skills."
        )
    elif current_user.role == "coordinator":
        system_prompt += (
            f"\n\nYou are talking to Department Placement Coordinator {current_user.name} representing {current_user.department}. "
            "You can help them screen students, write announcements, analyze skill gaps, and coordinate drives."
        )
    elif current_user.role == "officer":
        system_prompt += (
            f"\n\nYou are talking to Placement Officer {current_user.name}. "
            "Help them with college-wide analytics summaries, comparison structures, and coordinator management."
        )
        
    reply = call_groq_api(req.message, system_prompt)
    return {"reply": reply}


# --- PLACEMENT OFFICER ANALYTICS & MANAGEMENT ---

@app.get("/api/analytics/summary")
def get_analytics_summary(
    current_user: models.User = Depends(auth.require_coordinator_or_officer),
    db: Session = Depends(get_db)
):
    # Total drives
    total_drives = db.query(models.PlacementDrive).count()
    
    # Total students
    student_query = db.query(models.User).filter(models.User.role == "student")
    if current_user.role == "coordinator":
        student_query = student_query.filter(models.User.department == current_user.department)
    total_students = student_query.count()
    
    # Total applications
    app_query = db.query(models.Application)
    if current_user.role == "coordinator":
        app_query = app_query.join(models.User).filter(models.User.department == current_user.department)
    total_apps = app_query.count()
    
    # Placed Students (status == "Offered")
    placed_query = db.query(models.Application).filter(models.Application.status == "Offered")
    if current_user.role == "coordinator":
        placed_query = placed_query.join(models.User).filter(models.User.department == current_user.department)
    # Distinct placed students
    placed_students_count = placed_query.group_by(models.Application.student_id).count()
    
    placement_rate = 0.0
    if total_students > 0:
        placement_rate = round((placed_students_count / total_students) * 100, 2)
        
    return {
        "total_students": total_students,
        "total_drives": total_drives,
        "total_applications": total_apps,
        "placed_students": placed_students_count,
        "placement_rate": placement_rate
    }

@app.get("/api/analytics/department-comparison")
def get_department_comparison(
    current_user: models.User = Depends(auth.require_officer),
    db: Session = Depends(get_db)
):
    # Fetch all student department groups
    departments = [
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
    ]
    
    comparison_data = []
    
    for dept in departments:
        # Total students in department
        total_std = db.query(models.User).filter(models.User.role == "student", models.User.department == dept).count()
        # Placed students in department (status Offered)
        placed_std = db.query(models.Application).join(models.User).filter(
            models.User.role == "student",
            models.User.department == dept,
            models.Application.status == "Offered"
        ).group_by(models.Application.student_id).count()
        
        rate = round((placed_std / total_std) * 100, 2) if total_std > 0 else 0.0
        
        comparison_data.append({
            "department": dept.split("(")[-1].replace(")", "") if "(" in dept else dept.split(" ")[0],
            "full_name": dept,
            "total_students": total_std,
            "placed_students": placed_std,
            "placement_rate": rate
        })
        
    return comparison_data

@app.get("/api/analytics/export/{export_format}")
def export_analytics(
    export_format: str,
    current_user: models.User = Depends(auth.require_officer),
    db: Session = Depends(get_db)
):
    # Fetch all application details
    apps = db.query(models.Application).all()
    
    if export_format.lower() not in ["csv", "json"]:
        raise HTTPException(status_code=400, detail="Unsupported export format (use CSV or JSON)")
        
    if export_format.lower() == "json":
        data = []
        for app_rec in apps:
            data.append({
                "student_name": app_rec.student.name,
                "student_email": app_rec.student.email,
                "department": app_rec.student.department,
                "company": app_rec.drive.company_name,
                "role": app_rec.drive.role_name,
                "ctc": app_rec.drive.ctc,
                "status": app_rec.status,
                "applied_at": app_rec.applied_at.isoformat()
            })
        return data
        
    # Return formatted CSV string
    csv_lines = ["Student Name,Student Email,Department,Company,Role,CTC (LPA),Status,Applied At"]
    for app_rec in apps:
        csv_lines.append(
            f'"{app_rec.student.name}","{app_rec.student.email}","{app_rec.student.department}",'
            f'"{app_rec.drive.company_name}","{app_rec.drive.role_name}",{app_rec.drive.ctc},'
            f'"{app_rec.status}","{app_rec.applied_at.strftime("%Y-%m-%d %H:%M:%S")}"'
        )
        
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("\n".join(csv_lines), media_type="text/csv")

# Create a coordinator (Placement Officer utility)
@app.post("/api/analytics/coordinator", response_model=schemas.UserResponse)
def create_coordinator_account(
    user_in: schemas.UserRegister,
    current_user: models.User = Depends(auth.require_officer),
    db: Session = Depends(get_db)
):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Coordinator email already registered")
        
    hashed_pwd = auth.get_password_hash(user_in.password)
    db_coord = models.User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        name=user_in.name,
        role="coordinator",
        department=user_in.department,
        is_verified=True # Auto-verified since created by Placement Officer
    )
    db.add(db_coord)
    db.commit()
    db.refresh(db_coord)
    return db_coord

# Get coordinators list
@app.get("/api/analytics/coordinators", response_model=List[schemas.UserResponse])
def list_coordinators(
    current_user: models.User = Depends(auth.require_officer),
    db: Session = Depends(get_db)
):
    return db.query(models.User).filter(models.User.role == "coordinator").all()
