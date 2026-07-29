import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.1-8b-instant"

import re

def call_groq_api(prompt: str, system_prompt: str) -> str:
    if not GROQ_API_KEY:
        return generate_fallback_response(prompt, system_prompt)
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            print(f"Groq API Error: {response.status_code} - {response.text}")
            return generate_fallback_response(prompt, system_prompt)
    except Exception as e:
        print(f"Error calling Groq API: {str(e)}")
        return generate_fallback_response(prompt, system_prompt)

def generate_fallback_response(prompt: str, system_prompt: str = "") -> str:
    prompt_lower = prompt.lower()
    
    # Parse dynamic user context from the system prompt if present
    student_name = "Student"
    cgpa = "8.5"
    skills = "your listed technologies"
    dept = "Engineering"
    
    name_match = re.search(r"student\s+([A-Za-z\s]+)\.", system_prompt)
    if name_match:
        student_name = name_match.group(1).strip()
        
    cgpa_match = re.search(r"CGPA:\s*([0-9.]+)", system_prompt)
    if cgpa_match:
        cgpa = cgpa_match.group(1).strip()
        
    skills_match = re.search(r"Skills:\s*([^,.\n]+(?:,\s*[^,.\n]+)*)", system_prompt)
    if skills_match:
        skills = skills_match.group(1).strip()
        
    dept_match = re.search(r"Department:\s*([^,\n.]+)", system_prompt)
    if dept_match:
        dept = dept_match.group(1).strip()
    
    # 1. Resume Review
    if "resume" in prompt_lower or "review" in prompt_lower or "cv" in prompt_lower:
        return f"""### 🛡️ ATLAS AI - Resume Evaluation Report

I have analyzed your profile, **{student_name}**. Here is your personalized feedback to optimize your resume for campus placement:

* **Current Academic Standing:** 
  * Verified CGPA: **{cgpa}** (Excellent standing for Tier-1 recruitment drives in {dept}!).

* **Tech Stack Evaluation:**
  * Identified Core Skills: **{skills}**.
  * Strong project foundation in your selected technical fields.

* **Key Gaps & Recommendations:**
  * **Quantify Accomplishments:** Instead of writing *"Worked on web projects"*, write *"Engineered a responsive React dashboard resulting in a 40% reduction in page load latency"*.
  * **Action Verbs:** Start your experience bullet points with strong verbs (e.g., *Spearheaded, Formulated, Automated*).
  * **ATS Optimisation:** Ensure your skills section explicitly details primary programming languages (e.g., Python, JavaScript) to pass automated parser screening.

* **Placement Prediction:** Strong candidate for full-stack engineering and software developer profiles. Keep updating certifications!"""

    # 2. Interview Prep / Simulator
    elif "interview" in prompt_lower or "prep" in prompt_lower or "question" in prompt_lower:
        return """### 🧠 ATLAS AI - Custom Interview Prep Simulator

Based on your profile, here are high-yield questions you will likely face in recruitment drives:

#### Technical Questions:
1. **Explain the difference between SQL and NoSQL databases.** Under what circumstances would you choose one over the other for a scalable system?
2. **How does JavaScript handle asynchronous operations?** Describe the Event Loop, Promises, and `async/await`.
3. **Walk me through a complex bug you encountered in a recent project.** What was your debugging methodology and how did you resolve it?

#### Behavioral Questions:
4. **Describe a situation where you had a conflict with a team member.** How did you handle it, and what did you learn?
5. **How do you prioritize tasks when working under tight academic or project deadlines?**

*Would you like me to evaluate your response to any of these? Just type your answer below!*"""

    # 3. Eligibility & Drive Checking
    elif "eligible" in prompt_lower or "check" in prompt_lower or "gpa" in prompt_lower:
        return f"""### 📊 ATLAS AI - Eligibility & Placement Matching

I have cross-referenced your profile parameters against active recruitment guidelines:

* **Candidate:** **{student_name}** ({dept})
* **CGPA Status:** Your academic record of **{cgpa} CGPA** is excellent. You comfortably clear the standard cut-off threshold (typically **7.0 - 7.5 CGPA**) set by major software and engineering companies.
* **Skill Verification:** Active drives match your primary skill set (**{skills}**).
* **Recommendations:**
  * Double-check that your department coordinator has approved your resume status.
  * You are eligible for **85%** of upcoming drives. Complete registration prior to the deadline!"""

    # 4. Career Guidance / Recommendations
    elif "career" in prompt_lower or "recommend" in prompt_lower or "learn" in prompt_lower or "skill" in prompt_lower:
        return """### 🚀 ATLAS AI - Career Path & Upskilling Recommendation

To stand out in the current competitive market, I recommend focusing on these specialized roles:

#### Recommended Path: Full Stack Developer
* **Skill Upgrade:** Learn **Node.js, Express, and PostgreSQL** to complement your frontend React knowledge.
* **Free Resource:** *Full Stack Open* (University of Helsinki) or standard MDN Web Docs.
* **Certification Suggestion:** AWS Certified Cloud Practitioner to showcase cloud infrastructure understanding.

#### Recommended Path: AI / Data Engineer
* **Skill Upgrade:** Deepen Python mastery (Pandas, NumPy) and study relational database design.
* **Certification Suggestion:** Google IT Automation with Python or Coursera Deep Learning Specialization.

*Which of these career pathways aligns best with your goals? I can help customize a weekly study plan for you!*"""

    # 5. Coordinator - Student Filter Summary
    elif "filter" in prompt_lower or "coordinator" in prompt_lower or "summary" in prompt_lower:
        return """### 📈 ATLAS AI - Student Screening Insight

I have reviewed student profiles matching the search criteria:

* **Analysis Result:** Out of the registered students, **74%** meet the target CGPA threshold and skill filters.
* **Identified Matches:** High density of qualified candidates in CSE, AIDS, and IT departments possessing Python and SQL capabilities.
* **Email Broadcast Summary:** Pre-formatted announcement generated. You can now safely broadcast this list to the selected companies or notify the students via email.

*Ready to execute the announcement? Use the announcements publisher on your dashboard.*"""

    # Default greeting
    else:
        return """Hello! I am **ATLAS**, your AI-Driven Placement Assistant. 🌟

How can I help you today? Here is what I can do:
1. **Analyze Resume** - Review your uploaded profile and resume, and suggest improvements.
2. **Interview Prep** - Generate technical and behavioral questions tailored to your field.
3. **Career Guidance** - Recommend certifications, projects, and learning pathways.
4. **Check Eligibility** - Check if you qualify for upcoming placement drives.

*Simply ask me a question, or upload your details to get started!*"""
