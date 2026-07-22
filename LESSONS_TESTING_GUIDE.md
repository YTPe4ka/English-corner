# Frontend Lesson System - Testing & Integration Guide

## 📋 Pre-Flight Checklist

### Backend Requirements
- [ ] Django server running on `http://localhost:8000`
- [ ] Database migrations applied (migration 0004)
- [ ] At least one Group with `schedule_type` defined
- [ ] StudentProfile has `balance` field populated

### Frontend Requirements
- [ ] React dev server running (`npm run dev`)
- [ ] All new components imported correctly
- [ ] Environment variables configured (`.env` file)
- [ ] Toast component exists and is imported

### Database Records
- [ ] At least 1 Group with lessons
- [ ] At least 1 Student enrolled in the group
- [ ] Student has a balance > 0 and < 100

---

## 🧪 Component Testing

### Test 1: CreateGroupModal - Schedule Type Selection

**Steps:**
1. Navigate to Admin Dashboard
2. Click "Create Group" button
3. Fill in group details:
   - Name: "Test Group"
   - Teacher: Select any teacher
   - Start Date: Today
   - End Date: Tomorrow
   - Price per Month: 50
4. Check "Lesson Schedule" dropdown appears
5. Verify options: "Odd Days (Mon, Wed, Fri)" and "Even Days (Tue, Thu, Sat)"
6. Select "Even Days"
7. Click "Create Group"
8. Verify group is created with schedule_type saved

**Expected Result:**
- ✅ Group created with schedule_type = 'even'
- ✅ No form errors
- ✅ Redirect to Groups list or Group detail

---

### Test 2: GroupDetail - Lessons Table Display

**Steps:**
1. Create a group with lessons (see Test 1 first)
2. Use Django admin or API to create some lessons:
   ```bash
   curl -X POST http://localhost:8000/api/v1/lessons/ \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "group": 1,
       "lesson_number": 1,
       "scheduled_date": "2024-01-15",
       "duration_minutes": 60,
       "is_completed": false,
       "notes": "First lesson"
     }'
   ```
3. Or populate using fixture/script
4. Navigate to Group Detail
5. Scroll to "Lessons (X/12)" section
6. Verify table shows:
   - Lesson numbers 1-12 in order
   - Scheduled dates formatted correctly
   - Duration in minutes
   - Status badges (Completed/Pending)
   - Notes field populated

**Expected Result:**
- ✅ LessonsTable renders without errors
- ✅ Lessons sorted by lesson_number
- ✅ Dates formatted as "Mon, Jan 15, 2024"
- ✅ Status colors: Yellow (Pending), Green (Completed)

---

### Test 3: LessonsTable - Admin Controls

**Prerequisites:**
- Logged in as admin/superadmin
- Viewing GroupDetail with lessons

**Steps:**
1. Hover over a lesson row
2. Click "Edit" button
3. Verify edit functionality (TODO: to be implemented)
4. Click "Delete" button
5. Verify delete works (TODO: to be implemented)

**Expected Result:**
- ✅ Edit/Delete buttons visible for admin only
- ✅ Buttons trigger appropriate callbacks (currently console.log)

---

### Test 4: ExtendLearning - Button Display

**Prerequisites:**
- Logged in as student
- Student has balance >= 10
- Viewing GroupDetail of a group with price_per_lesson

**Steps:**
1. Navigate to Groups list as student
2. Click on a group with lessons
3. In "Lessons" section, look for green "Extend Learning" button
4. Button should show current lessons remaining count
5. Hover over button to see tooltip

**Expected Result:**
- ✅ Button appears with lessons count badge
- ✅ Button not visible if user is admin/teacher
- ✅ Button has accessibility tooltip

---

### Test 5: ExtendLearning - Modal Interaction

**Prerequisites:**
- Button from Test 4 visible
- Student balance: $50
- Lessons remaining: 3
- Price per lesson: $10

**Steps:**
1. Click "Extend Learning" button
2. Modal appears with:
   - Header: "Extend Your Learning"
   - Info boxes: Balance ($50), Lessons Remaining (3), Price/Lesson ($10)
   - Dropdown: Select Lessons (default 1)
3. Try selecting each option:
   - 1 lesson = $10
   - 6 lessons = $60
   - 12 lessons = $120
4. Verify cost calculation updates

**Expected Result:**
- ✅ Modal animates in smoothly
- ✅ All info boxes display correct values
- ✅ Dropdown updates cost display in real-time

---

### Test 6: ExtendLearning - Insufficient Balance

**Prerequisites:**
- Modal from Test 5 open
- Student balance: $50
- 12 lessons option = $120

**Steps:**
1. Select "12 lessons - $120"
2. Verify:
   - Summary shows red error: "Need $120, but only have $50"
   - "Add 12 Lessons" button is disabled (greyed out)
   - Cannot click submit button

**Expected Result:**
- ✅ Error message displayed
- ✅ Submit button disabled
- ✅ User cannot proceed with purchase

---

### Test 7: ExtendLearning - Successful Purchase

**Prerequisites:**
- Modal open
- Student balance: $50
- Select 1 lesson ($10)
- Backend running and accessible

**Steps:**
1. Select "1 lesson - $10"
2. Click "Add 1 Lesson" button
3. Wait for loading state (button shows "Processing...")
4. Expect response from backend
5. Check for:
   - Toast notification: "Successfully added 1 lesson! New balance: $40.00"
   - Modal closes
   - LessonsTable refreshes with new lesson
   - Button badge updates (if applicable)

**Expected Result:**
- ✅ Toast appears with success message
- ✅ Modal closes automatically
- ✅ Balance updated in UI
- ✅ No errors in browser console

---

### Test 8: ExtendLearning - Error Handling

**Prerequisites:**
- Backend not running OR student has 0 balance
- Modal open with selection ready

**Steps:**
1. Click "Add X Lessons"
2. Expect error response
3. Check for:
   - Error message displayed in modal
   - Modal stays open (doesn't close)
   - Button reverts to normal (not disabled)
   - Can try again or close

**Expected Result:**
- ✅ Error message shown clearly
- ✅ Modal remains open for retry
- ✅ Network errors handled gracefully

---

## 🔗 Integration Tests

### Integration Test 1: Complete Lesson Purchase Flow

**Full scenario:**
1. Start: Student logged in, viewing group with lessons
2. Click "Extend Learning"
3. Select "6 lessons"
4. Click "Add 6 Lessons"
5. Payment processed
6. Verify:
   - Backend call to `/api/v1/lesson-payments/extend_learning/`
   - Database: New LessonPayment record created
   - Database: Student balance decreased
   - Frontend: Toast shows success
   - Frontend: LessonsTable refreshed with new lessons

**Success Criteria:**
- ✅ All 4 new lessons appear in table
- ✅ Student balance in header/profile updated
- ✅ Refresh page → data persists
- ✅ Database shows LessonPayment record

---

### Integration Test 2: Schedule Type Persists

**Test:**
1. Create group with "Even Days" schedule
2. Navigate away and back to group detail
3. Verify schedule_type still shows "Even Days"
4. Check API response includes schedule_type field

**Success Criteria:**
- ✅ GroupDetail displays correct schedule type
- ✅ API response includes schedule_type in Group data

---

## 🐛 Common Issues & Solutions

### Issue: "ExtendLearning button not showing"
**Possible Causes:**
- User logged in as admin/teacher (button only shows for students)
- Group missing `price_per_lesson` field
- Student has 0 balance

**Solution:**
- Log in as student
- Verify group has price_per_lesson set
- Check student.balance > 0

---

### Issue: "Modal closes but balance not updated"
**Possible Causes:**
- `onExtendSuccess` callback not called
- State not updating in GroupDetail
- API response format mismatch

**Solution:**
- Check browser console for errors
- Verify API returns `new_balance` field
- Check that callback was wired correctly in GroupDetail

---

### Issue: "Lessons table shows empty"
**Possible Causes:**
- No lessons created for group
- API endpoint not working
- CORS issues with API call

**Solution:**
```bash
# Verify lessons exist in database
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/v1/lessons/by_group/?group_id=1"
```

---

## 📊 API Response Format Verification

### Verify Group API includes schedule_type
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/v1/groups/1/"
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "Test Group",
  "schedule_type": "odd",
  "price_per_lesson": 10.00,
  ...
}
```

---

### Verify Lessons API
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/v1/lessons/by_group/?group_id=1"
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "group": 1,
    "lesson_number": 1,
    "scheduled_date": "2024-01-15",
    "duration_minutes": 60,
    "is_completed": false,
    "notes": "First lesson"
  },
  ...
]
```

---

### Verify Extend Learning API
```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "group_id": 1, "lessons_to_add": 1}' \
  "http://localhost:8000/api/v1/lesson-payments/extend_learning/"
```

**Expected Response (Success):**
```json
{
  "message": "Lessons added successfully",
  "new_balance": 40.00,
  "lessons_remaining": 11,
  "payment_id": 123
}
```

**Expected Response (Insufficient Balance):**
```
HTTP 402 Payment Required
{
  "detail": "Insufficient balance"
}
```

---

## ✅ Sign-Off Checklist

- [ ] Test 1-4 pass (Display & Structure)
- [ ] Test 5-7 pass (Interaction & Purchase)
- [ ] Test 8 passes (Error Handling)
- [ ] Integration Test 1 passes (Full Flow)
- [ ] Integration Test 2 passes (Data Persistence)
- [ ] API responses match format
- [ ] No console errors
- [ ] No network errors
- [ ] Mobile responsive on test (Test 9 optional)
- [ ] All components properly styled

---

## 🚀 Ready for Next Phase?

Once all tests pass, you're ready to:
1. ✅ Create admin lesson management UI (edit/delete lessons)
2. ✅ Build AdminDashboard lessons tab
3. ✅ Add lesson bulk creation with auto-scheduling
4. ✅ Create payment history view for students

