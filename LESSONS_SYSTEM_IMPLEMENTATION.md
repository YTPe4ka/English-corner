# Frontend Lesson System Implementation - Phase 2 Complete

## ✅ Completed Components

### 1. **CreateGroupModal.tsx** (Updated)
- Added `schedule_type` dropdown field to form
- Users can now select between:
  - **Odd Days** (Mon, Wed, Fri)
  - **Even Days** (Tue, Thu, Sat)
- Integrated into group creation workflow
- Form data properly passed to API on submission

**Location:** `frontend/src/components/CreateGroupModal.tsx`

---

### 2. **LessonsTable.tsx** (New Component)
A responsive table component for displaying all lessons in a group.

**Features:**
- Displays lessons sorted by lesson_number (1-12)
- Shows scheduled date, duration, completion status, and notes
- Admin-only edit/delete buttons
- Color-coded status badges (Completed/Pending)
- Mobile-responsive design
- Empty state message when no lessons

**Props:**
```typescript
interface LessonsTableProps {
  lessons: Lesson[];           // Array of lesson objects
  isAdmin: boolean;            // Show admin controls
  onEditLesson?: (lesson) => void;
  onDeleteLesson?: (lessonId) => void;
}
```

**Usage in GroupDetail:**
```tsx
<LessonsTable
  lessons={lessons}
  isAdmin={isAdmin}
  onEditLesson={handleEdit}
  onDeleteLesson={handleDelete}
/>
```

**Location:** 
- Component: `frontend/src/components/LessonsTable.tsx`
- Styling: `frontend/src/components/LessonsTable.css`

---

### 3. **ExtendLearning.tsx** (New Component)
Modal component allowing students to purchase additional lessons using their account balance.

**Features:**
- Displays current balance, lessons remaining, price per lesson
- Allows selecting 1, 6, or 12 lessons to purchase
- Shows calculated cost and new balance preview
- Validates sufficient funds before purchase
- Posts to `/api/v1/lesson-payments/extend_learning/`
- Calls callback with updated balance and lesson count
- Error handling with user-friendly messages (HTTP 402 for insufficient funds)

**Props:**
```typescript
interface ExtendLearningProps {
  studentBalance: number;          // Student's account balance
  lessonsRemaining: number;        // Current lessons remaining
  pricePerLesson: number;          // Price per individual lesson
  groupId: number;                 // Group ID
  studentId: number;               // Student user ID
  onExtendSuccess: (balance, lessons) => void;  // After purchase
  onError?: (error) => void;       // Error callback
  onSuccess?: (message) => void;   // Success message callback
}
```

**API Integration:**
```
POST /api/v1/lesson-payments/extend_learning/
{
  student_id: number,
  group_id: number,
  lessons_to_add: 1|6|12
}
```

**Location:**
- Component: `frontend/src/components/ExtendLearning.tsx`
- Styling: `frontend/src/components/ExtendLearning.css`

---

### 4. **GroupDetail.tsx** (Updated)
Updated to integrate the new lesson system into group detail view.

**New Features:**
- Displays `schedule_type` (Odd/Even days) in group info
- Fetches and displays lessons table with lesson count (X/12)
- Shows ExtendLearning button for students (when applicable)
- Loads student's lesson payment history
- Toast notifications for success/error messages
- Separate logic for admin vs student views

**New Functions:**
```typescript
loadLessons(groupId)          // Fetch lessons by group
loadLessonPayments(groupId)   // Fetch student's lesson purchase history
```

**State Management:**
- `lessons[]` - Array of lesson objects
- `lessonPayments` - Latest lesson payment record
- `studentBalance` - Student's current balance
- `lessonsRemaining` - Lessons remaining for student in this group
- `toastMessage` - Toast notifications

**Layout:**
1. Group info card (with schedule type)
2. **Lessons card** (new) - Shows LessonsTable + ExtendLearning button
3. Students list (existing)
4. Payments history (existing)
5. Performance records (existing)
6. Attendance (existing)

**Location:** `frontend/src/pages/GroupDetail.tsx`

---

## 📊 System Architecture

```
GroupDetail (Page)
├─ LessonsTable (Component)
│  └── Displays Lesson objects in table format
├─ ExtendLearning (Component - Students Only)
│  └── POST /api/v1/lesson-payments/extend_learning/
│      └── Updates student balance & lessons_remaining
└─ Toast (Feedback)
```

---

## 🔄 User Flows

### Flow 1: View Lessons (Admin/Student)
1. Open Group Detail
2. See lessons table with 12 rows (1-12)
3. View schedule, duration, completion status
4. Admin: Edit/Delete buttons available

### Flow 2: Extend Learning (Student Only)
1. In GroupDetail, click "Extend Learning" button
2. Modal opens showing:
   - Balance: $50.00
   - Lessons remaining: 5
   - Price per lesson: $10.00
3. Select lessons (1, 6, or 12)
4. System calculates: 6 lessons × $10 = $60 cost
5. If insufficient balance (e.g., only $50): Error shown, submit disabled
6. Click "Add 6 Lessons"
7. Backend deducts $10, creates LessonPayment record
8. New balance: $40.00, Lessons remaining: 11
9. Toast notification: "Successfully added 6 lessons! New balance: $40.00"
10. LessonsTable refreshes with new lessons

---

## 🎯 API Endpoints Used

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/v1/lessons/by_group/?group_id=X` | GET | Fetch lessons for group | ✓ |
| `/api/v1/lesson-payments/student_lesson_payments/?student_id=X&group_id=Y` | GET | Get student's lesson history | ✓ |
| `/api/v1/lesson-payments/extend_learning/` | POST | Purchase lessons with balance | ✓ |

---

## ⚙️ Environment Variables

Both ExtendLearning and GroupDetail use:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Ensure `.env` file contains:
```
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Next Implementation Steps

### Priority 1: Admin Lesson Management
- [ ] Create `CreateLessonModal.tsx` for admin to add lessons
- [ ] Create `EditLessonModal.tsx` for admin to edit lessons
- [ ] Add delete lesson function with confirmation
- [ ] Implement bulk lesson generation (auto-scheduling based on schedule_type)

### Priority 2: AdminDashboard Lessons Tab
- [ ] Create lessons management tab in admin dashboard
- [ ] Show all lessons across all groups
- [ ] Bulk create lessons for a group (generate 12 dates based on odd/even pattern)

### Priority 3: EditGroupModal Enhancement
- [ ] Allow changing schedule_type after group creation
- [ ] Show warning if existing lessons will be affected

### Priority 4: LessonPayments Tab (Student View)
- [ ] Display payment history per group
- [ ] Show price breakdown (lessons purchased, per-lesson price, total cost)

### Priority 5: Testing & Refinement
- [ ] Test extend learning with various balances
- [ ] Test admin lesson CRUD operations
- [ ] Test lesson generation with proper scheduling

---

## 💾 File Summary

| File | Type | Status |
|------|------|--------|
| `CreateGroupModal.tsx` | Updated | ✅ |
| `GroupDetail.tsx` | Updated | ✅ |
| `LessonsTable.tsx` | New | ✅ |
| `LessonsTable.css` | New | ✅ |
| `ExtendLearning.tsx` | New | ✅ |
| `ExtendLearning.css` | New | ✅ |

**Backend Status:** ✅ Complete
- Lesson model with 12-lesson structure
- LessonPayment model for tracking purchases
- LessonViewSet for CRUD operations
- LessonPaymentViewSet with `extend_learning` action
- All migrations applied

---

## 📝 Notes

1. **Lesson Scheduling Logic**: The `schedule_type` on Group indicates when lessons should be scheduled (odd or even days), but actual lesson date generation is typically done by admin bulk import or automated scheduler.

2. **Balance Deduction**: The `extend_learning` endpoint deducts from `student.balance` field, so ensure the Student model has a `balance` field (likely part of UserInfo/StudentProfile).

3. **Pricing**: Each group has `price_per_lesson` that's used to calculate costs for extending. Make sure this is set during group creation.

4. **Toast Component**: GroupDetail uses the existing `Toast` component from `src/components/Toast.tsx` for notifications. Ensure it exists or update to use your notification system.

5. **API Error Handling**: HTTP 402 (Payment Required) is used when student balance is insufficient.

---

## ✨ Key Design Decisions

1. **Component Separation**: LessonsTable and ExtendLearning are separate for reusability
2. **User-Type Conditional Rendering**: Admin gets edit/delete buttons, students get extend button
3. **Real-time Updates**: After extend, LessonsTable refreshes to show new lessons
4. **Validation**: Frontend checks balance before submit, backend validates again
5. **Responsive Design**: Mobile-friendly tables and modals with proper spacing

