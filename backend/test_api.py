import time
import httpx

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("[TEST] Starting ATLAS API Automated Integration Tests...")
    
    # 1. Start Client
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        
        # Test 1: User Registration
        test_reg_num = f"TEST{int(time.time())}"
        print(f"\n[TEST 1] Registering a new student with register number: {test_reg_num}...")
        reg_payload = {
            "name": "Integration Test Student",
            "password": "securepassword123",
            "role": "student",
            "department": "Computer Science and Engineering (CSE)",
            "register_number": test_reg_num
        }
        reg_res = client.post("/auth/register", json=reg_payload)
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
        print("OK: Student registered successfully (auto-verified).")

        print("\n[TEST 1.5] Logging in as the new student using register number...")
        student_login_payload = {
            "username": test_reg_num,
            "password": "securepassword123"
        }
        student_login_res = client.post("/auth/login", json=student_login_payload)
        assert student_login_res.status_code == 200, f"Student login failed: {student_login_res.text}"
        print("OK: Student authenticated successfully via Register Number.")
        
        print("\n[TEST 2] Registering and authenticating a new Placement Officer account (Employee ID)...")
        officer_reg_num = f"OFFICER{int(time.time())}"
        officer_reg_payload = {
            "name": "Integration Test Officer",
            "password": "password123",
            "role": "officer",
            "employee_id": officer_reg_num
        }
        officer_reg_res = client.post("/auth/register", json=officer_reg_payload)
        assert officer_reg_res.status_code == 200, f"Officer registration failed: {officer_reg_res.text}"

        login_payload = {
            "username": officer_reg_num,
            "password": "password123"
        }
        login_res = client.post("/auth/login", json=login_payload)
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token_data = login_res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("OK: Officer authenticated successfully. Token acquired.")
        
        print("\n[TEST 3] Fetching Placement Officer Profile info (/auth/me)...")
        me_res = client.get("/auth/me", headers=headers)
        assert me_res.status_code == 200, f"Get me failed: {me_res.text}"
        assert me_res.json()["role"] == "officer", "Role mismatch!"
        print("OK: Officer identity verified.")
        
        print("\n[TEST 4] Fetching institutional analytics summary...")
        summary_res = client.get("/analytics/summary", headers=headers)
        assert summary_res.status_code == 200, f"Stats summary failed: {summary_res.text}"
        print(f"OK: Analytics retrieved: {summary_res.json()}")
        
        print("\n[TEST 5] Testing AI chat query endpoint...")
        chat_payload = {
            "message": "Recommend a career path for React developer."
        }
        chat_res = client.post("/ai/chat", json=chat_payload, headers=headers)
        assert chat_res.status_code == 200, f"AI Chat failed: {chat_res.text}"
        print(f"OK: ATLAS AI Response acquired successfully.")
        
        print("\n=== SUCCESS: All API endpoint integration tests passed successfully ===")

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as ae:
        print(f"\n[FAILURE] Test assertion failed: {str(ae)}")
    except Exception as e:
        print(f"\n[ERROR] An unexpected error occurred: {str(e)}")
