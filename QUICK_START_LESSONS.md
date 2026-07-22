# 🚀 Quick Start - Lesson System Development

## 📋 File Locations

### New React Components
```
frontend/src/components/
├── LessonsTable.tsx         ← Display 12 lessons table
├── LessonsTable.css         ← Table styling
├── ExtendLearning.tsx       ← Student purchase modal
├── ExtendLearning.css       ← Modal styling
```

### Updated Components
```
frontend/src/
├── components/CreateGroupModal.tsx     ← Added schedule_type dropdown
└── pages/GroupDetail.tsx               ← Integrated lesson system
```

### Backend (No changes needed - already complete)
```
backend/configapp/
├── models.py                ← Lesson, LessonPayment models
├── serializers.py           ← LessonSerializer, LessonPaymentSerializer
├── views.py                 ← LessonViewSet, LessonPaymentViewSet
├── urls.py                  ← Registered routes
└── migrations/0004_*        ← Applied to database
```

---

## 🔗 Import Examples

### Using LessonsTable
```typescript
import LessonsTable from '../components/LessonsTable';

// In your component:
<LessonsTable
  lessons={lessons}
  isAdmin={user?.user_type === 'admin'}
  onEditLesson={(lesson) => {
    // Handle edit
  }}
  onDeleteLesson={(lessonId) => {
    // Handle delete
  }}
/>
```

### Using ExtendLearning
```typescript
import ExtendLearning from '../components/ExtendLearning';

// In your component:
{isStudent && (
  <ExtendLearning
    studentBalance={50}
    lessonsRemaining={5}
    pricePerLesson={10}
    groupId={groupId}
    studentId={userId}
    onExtendSuccess={(newBalance, newLessons) => {
      setBalance(newBalance);
      setLessons(newLessons);
    }}
    onError={(error) => console.error(error)}
    onSuccess={(message) => showToast(message)}
  />
)}
```

---

## 🔄 Common Tasks

### Task 1: Display Lessons for a Group
```typescript
const [lessons, setLessons] = useState([]);

useEffect(() => {
  const fetchLessons = async () => {
    const res = await fetch(
      `http://localhost:8000/api/v1/lessons/by_group/?group_id=${groupId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setLessons(data);
  };
  fetchLessons();
}, [groupId, token]);

// Then use LessonsTable to display
```

### Task 2: Check Student Lesson Purchases
```typescript
const fetchLessonPayments = async () => {
  const res = await fetch(
    `http://localhost:8000/api/v1/lesson-payments/student_lesson_payments/?student_id=${studentId}&group_id=${groupId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.ok) {
    const data = await res.json();
    console.log('Lessons remaining:', data.lessons_remaining);
  }
};
```

### Task 3: Get All Lessons in Admin
```typescript
// Option 1: By group (for GroupDetail)
fetch(`/api/v1/lessons/by_group/?group_id=${groupId}`, ...)

// Option 2: All lessons (for AdminDashboard)
fetch(`/api/v1/lessons/`, ...)
```

---

## 🎨 Styling Notes

### Color Scheme
- **Primary (Green):** `#10b981` - Extend Learning button
- **Primary Dark:** `#059669` - Button hover
- **Status Complete:** `#dcfce7` (bg) `#166534` (text) - Green
- **Status Pending:** `#fef3c7` (bg) `#92400e` (text) - Yellow
- **Error:** `#fee2e2` (bg) `#991b1b` (text) - Red
- **Admin:** `#3b82f6` (blue) - Edit button
- **Delete:** `#ef4444` (red) - Delete button

### CSS Classes to Use/Extend
```css
.btn-extend-learning   /* Green button with badge */
.status-badge          /* Colored status indicator */
.lessons-table         /* Main table styling */
.lesson-row            /* Table row (completed/pending) */
.extend-modal-overlay  /* Modal background */
.extend-modal-content  /* Modal container */
.extend-modal-header   /* Modal title bar */
.extend-modal-body     /* Modal content area */
.extend-modal-footer   /* Modal buttons */
```

---

## 🧪 Testing Quick Reference

### Test LessonsTable
```bash
# Check if component renders without errors
# Verify lessons are sorted by lesson_number
# Confirm status colors apply correctly
# Test admin buttons visibility
```

### Test ExtendLearning
```bash
# Verify button appears for students only
# Test modal opens/closes
# Try purchasing with sufficient balance → Success
# Try purchasing with insufficient balance → Error shown
# Verify balance updates on success
```

### Test Full Integration
```bash
# 1. Create group with schedule_type
# 2. Add lessons to group
# 3. As student, view group detail
# 4. See lessons in table
# 5. Click extend learning
# 6. Purchase lessons
# 7. Verify balance deducted
# 8. Verify lessons_remaining updated
# 9. Verify new lessons in table
```

---

## 🐛 Debugging Checklist

### If ExtendLearning button doesn't show
- [ ] Logged in as student (not admin/teacher)
- [ ] Group has `price_per_lesson` set
- [ ] Student has `balance` field > 0
- [ ] Check browser console for JS errors

### If Lessons table is empty
- [ ] Verify lessons exist in DB: `SELECT * FROM configapp_lesson WHERE group_id = X;`
- [ ] Check API response: `curl ...api/v1/lessons/by_group/?group_id=1`
- [ ] Check browser network tab for API errors

### If balance not updating
- [ ] Verify API returns `new_balance` field
- [ ] Check `onExtendSuccess` callback is wired
- [ ] Verify state setter is called
- [ ] Check Student model has `balance` field

### If schedule_type not displaying
- [ ] Verify Group has `schedule_type` field in DB
- [ ] Check API response includes field
- [ ] Verify GroupDetail shows it (conditional render)

---

## 📊 Data Models Quick Reference

### Lesson Model
```python
class Lesson(models.Model):
    group = ForeignKey(Group)
    lesson_number = IntegerField(1-12)
    scheduled_date = DateField
    duration_minutes = IntegerField
    is_completed = BooleanField
    notes = TextField (optional)
```

### LessonPayment Model
```python
class LessonPayment(models.Model):
    student = ForeignKey(Student)
    group = ForeignKey(Group)
    lessons_purchased = IntegerField(1, 6, or 12)
    total_amount = DecimalField
    price_per_lesson = DecimalField
    lessons_remaining = IntegerField
    status = CharField('completed', 'pending')
    payment_date = DateTimeField
    processed_by = ForeignKey(User)  # Admin/Superadmin
```

### Group Model (Extended)
```python
class Group(models.Model):
    # ... existing fields ...
    schedule_type = CharField(
        choices=[('odd', 'Odd'), ('even', 'Even')],
        default='odd'
    )
    price_per_lesson = DecimalField  # Optional, for extend_learning
```

---

## 🔌 API Endpoints Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/lessons/by_group/?group_id=X` | GET | Fetch lessons | ✓ |
| `/lessons/` | GET | All lessons | ✓ |
| `/lessons/` | POST | Create lesson | ✓ Admin |
| `/lessons/{id}/` | PATCH | Update lesson | ✓ Admin |
| `/lessons/{id}/` | DELETE | Delete lesson | ✓ Admin |
| `/lesson-payments/` | GET | List payments | ✓ Admin |
| `/lesson-payments/` | POST | Create payment | ✓ Admin |
| `/lesson-payments/student_lesson_payments/` | GET | Student history | ✓ |
| `/lesson-payments/extend_learning/` | POST | Purchase lessons | ✓ Student |

---

## 📝 Next Implementation Tasks

### High Priority
- [ ] Create `EditLessonModal.tsx`
- [ ] Create `CreateLessonModal.tsx` (single + bulk)
- [ ] Add lesson delete/edit to LessonsTable
- [ ] Admin lesson management tab

### Medium Priority
- [ ] EditGroupModal add schedule_type editing
- [ ] Bulk lesson generation with auto-dating
- [ ] Payment history view for students

### Low Priority (Nice-to-have)
- [ ] Lesson search/filter
- [ ] Export lessons as PDF
- [ ] Email reminder for upcoming lessons
- [ ] Attendance tracking per lesson

---

## 🎯 Development Workflow

### Setting Up
```bash
# Terminal 1: Django
cd backend
source venv_new/Scripts/activate
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database (if using CLI)
sqlite3 db.sqlite3
# or for PostgreSQL:
psql -U postgres -d english_corner
```

### Making Changes
```bash
# Edit component
vim frontend/src/components/LessonsTable.tsx

# Check TypeScript (optional - Vite will catch errors)
npm run build

# Test in browser
# Open http://localhost:5173
# Navigate to group detail with lessons
# Verify changes visually
```

### Testing API
```bash
# Get token
curl -X POST http://localhost:8000/api/v1/token/ \
  -d "username=admin&password=password"

# Use token in requests
TOKEN="eyJ0eXAi..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/lessons/by_group/?group_id=1
```

---

## 💡 Pro Tips

1. **Use React DevTools** to inspect component state
   - Check `lessons` array structure
   - Verify `isAdmin` permission flag

2. **Network Tab** is your friend
   - Watch API requests/responses
   - Check for 402 (Payment Required) errors
   - Verify response includes expected fields

3. **Console Logs** for debugging
   ```typescript
   console.log('Lessons:', lessons);
   console.log('Balance:', studentBalance);
   console.log('Extending with:', selectedLessons);
   ```

4. **Use `.map()` to transform data**
   ```typescript
   sortedLessons = lessons.sort((a, b) => a.lesson_number - b.lesson_number);
   ```

5. **Handle async/await properly**
   ```typescript
   // ✓ Good
   const data = await res.json();
   
   // ✗ Avoid
   const data = res.json(); // Missing await!
   ```

---

## 📞 Quick Reference Links

- **Component Props:** See component .tsx files
- **CSS Styling:** See component .css files
- **API Details:** LESSONS_IMPLEMENTATION.md
- **Testing:** LESSONS_TESTING_GUIDE.md
- **Full Summary:** PHASE_2_SUMMARY.md

---

## ✨ You're All Set!

The frontend lesson system is ready to use. Start with testing (see LESSONS_TESTING_GUIDE.md), then move to admin lesson management in Phase 3.

Happy coding! 🚀

