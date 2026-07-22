#!/usr/bin/env python
"""
Test script for Teacher and Student Role-Based APIs
Run: python test_teacher_student.py
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

class APITester:
    def __init__(self):
        self.teacher_token = None
        self.student_token = None
        self.test_results = []
    
    def test(self, name, func):
        """Decorator for tests"""
        print(f"\n{'='*70}")
        print(f"TEST: {name}")
        print('='*70)
        try:
            result = func()
            self.test_results.append((name, "✅ PASS" if result else "❌ FAIL"))
            return result
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            self.test_results.append((name, f"❌ ERROR: {str(e)}"))
            return False
    
    def print_response(self, response):
        """Pretty print response"""
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except:
            print(f"Response: {response.text}")
    
    def get_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    # ===== TEACHER TESTS =====
    def test_teacher_login(self):
        """Login as a teacher"""
        print("Logging in as teacher...")
        # First check if teacher user exists, if not we'll create one
        url = f"{BASE_URL}/auth/login/"
        data = {
            "username": "teacher1",
            "password": "password123"
        }
        
        response = requests.post(url, json=data)
        self.print_response(response)
        
        if response.status_code == 200:
            self.teacher_token = response.json().get('access')
            print(f"✅ Teacher token obtained: {self.teacher_token[:20]}...")
            return True
        else:
            print("⚠️  Could not login as teacher1. Make sure teacher1 user exists.")
            return False
    
    def test_teacher_groups_list(self):
        """Get teacher's groups"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        
        url = f"{BASE_URL}/teacher/groups/"
        headers = self.get_headers(self.teacher_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Retrieved {count} groups for teacher")
            return True
        return False
    
    def test_teacher_attendance_list(self):
        """Get teacher's attendance records"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        
        url = f"{BASE_URL}/teacher/attendance/"
        headers = self.get_headers(self.teacher_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Retrieved {count} attendance records for teacher")
            return True
        return False
    
    def test_teacher_performance_list(self):
        """Get teacher's performance records"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        
        url = f"{BASE_URL}/teacher/performance/"
        headers = self.get_headers(self.teacher_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Retrieved {count} performance records for teacher")
            return True
        return False
    
    def test_teacher_profile(self):
        """Get teacher's profile"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        
        url = f"{BASE_URL}/teacher/profile/"
        headers = self.get_headers(self.teacher_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            print(f"✅ Retrieved teacher profile")
            return True
        return False
    
    # ===== STUDENT TESTS =====
    def test_student_login(self):
        """Login as a student"""
        print("Logging in as student...")
        url = f"{BASE_URL}/auth/login/"
        data = {
            "username": "student1",
            "password": "password123"
        }
        
        response = requests.post(url, json=data)
        self.print_response(response)
        
        if response.status_code == 200:
            self.student_token = response.json().get('access')
            print(f"✅ Student token obtained: {self.student_token[:20]}...")
            return True
        else:
            print("⚠️  Could not login as student1. Make sure student1 user exists.")
            return False
    
    def test_student_groups_list(self):
        """Get student's groups"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/student/groups/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Retrieved {count} groups for student")
            return True
        return False
    
    def test_student_attendance(self):
        """Get student's attendance"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/student/attendance/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            print(f"✅ Retrieved student attendance with statistics")
            return True
        return False
    
    def test_student_performance(self):
        """Get student's grades"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/student/performance/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            print(f"✅ Retrieved student performance with statistics")
            return True
        return False
    
    def test_student_payments(self):
        """Get student's payments"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/student/payments/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            print(f"✅ Retrieved student payments with balance")
            return True
        return False
    
    def test_student_profile(self):
        """Get student's profile"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/student/profile/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 200:
            print(f"✅ Retrieved student profile")
            return True
        return False
    
    # ===== PERMISSION TESTS =====
    def test_student_cannot_access_teacher_endpoint(self):
        """Verify student cannot access teacher endpoint"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        
        url = f"{BASE_URL}/teacher/groups/"
        headers = self.get_headers(self.student_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 403:
            print(f"✅ Correctly blocked: student cannot access teacher endpoint")
            return True
        else:
            print(f"❌ SECURITY ISSUE: student was able to access teacher endpoint!")
            return False

    def test_teacher_cannot_delete_teacher(self):
        """Ensure a teacher cannot delete another teacher"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        # pick any teacher id (assume teacher1 exists with id 1)
        # fetch list to be safe
        url_list = f"{BASE_URL}/teachers/"
        headers = self.get_headers(self.teacher_token)
        resp = requests.get(url_list, headers=headers)
        self.print_response(resp)
        if resp.status_code != 200 or not resp.json():
            return False
        teach_id = resp.json().get('results', resp.json())[0].get('id')
        url = f"{BASE_URL}/teachers/{teach_id}/"
        self.print_response(response)
        if response.status_code in (401, 403):
            print("✅ Teacher was not allowed to delete teacher")
            return True
        else:
            print("❌ Teacher unexpectedly allowed to delete teacher")
            return False

    def test_student_cannot_delete_student(self):
        """Ensure a student cannot delete another student"""
        if not self.student_token:
            print("⚠️  No student token available")
            return False
        url_list = f"{BASE_URL}/students/"
        headers = self.get_headers(self.student_token)
        resp = requests.get(url_list, headers=headers)
        self.print_response(resp)
        if resp.status_code != 200 or not resp.json():
            return False
        stud_id = resp.json().get('results', resp.json())[0].get('id')
        url = f"{BASE_URL}/students/{stud_id}/"
        response = requests.delete(url, headers=headers)
        self.print_response(response)
        if response.status_code in (401, 403):
            print("✅ Student was not allowed to delete student")
            return True
        else:
            print("❌ Student unexpectedly allowed to delete student")
            return False
    
    def test_teacher_cannot_access_student_endpoint(self):
        """Verify teacher cannot access student endpoint"""
        if not self.teacher_token:
            print("⚠️  No teacher token available")
            return False
        
        url = f"{BASE_URL}/student/groups/"
        headers = self.get_headers(self.teacher_token)
        
        response = requests.get(url, headers=headers)
        self.print_response(response)
        
        if response.status_code == 403:
            print(f"✅ Correctly blocked: teacher cannot access student endpoint")
            return True
        else:
            print(f"❌ SECURITY ISSUE: teacher was able to access student endpoint!")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n\n{'='*70}")
        print("TEST SUMMARY")
        print('='*70)
        for test_name, result in self.test_results:
            print(f"{test_name:<50} {result}")
        
        passed = sum(1 for _, r in self.test_results if "PASS" in r)
        total = len(self.test_results)
        print(f"\n{passed}/{total} tests passed")

def main():
    """Run all tests"""
    print("Starting Teacher & Student API Tests")
    print("="*70)
    print("Make sure the Django server is running: python manage.py runserver")
    print("="*70)
    
    tester = APITester()
    
    # Run teacher tests
    print("\n\n🔵 TEACHER TESTS")
    print("="*70)
    tester.test("Teacher Login", lambda: tester.test_teacher_login())
    tester.test("Get Teacher Groups", lambda: tester.test_teacher_groups_list())
    tester.test("Get Teacher Attendance", lambda: tester.test_teacher_attendance_list())
    tester.test("Get Teacher Performance", lambda: tester.test_teacher_performance_list())
    tester.test("Get Teacher Profile", lambda: tester.test_teacher_profile())
    
    # Run student tests
    print("\n\n🟢 STUDENT TESTS")
    print("="*70)
    tester.test("Student Login", lambda: tester.test_student_login())
    tester.test("Get Student Groups", lambda: tester.test_student_groups_list())
    tester.test("Get Student Attendance", lambda: tester.test_student_attendance())
    tester.test("Get Student Performance", lambda: tester.test_student_performance())
    tester.test("Get Student Payments", lambda: tester.test_student_payments())
    tester.test("Get Student Profile", lambda: tester.test_student_profile())
    
    # Run permission tests
    print("\n\n🔒 PERMISSION TESTS")
    print("="*70)
    tester.test("Student Cannot Access Teacher Endpoint", lambda: tester.test_student_cannot_access_teacher_endpoint())
    tester.test("Teacher Cannot Access Student Endpoint", lambda: tester.test_teacher_cannot_access_student_endpoint())
    
    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()
