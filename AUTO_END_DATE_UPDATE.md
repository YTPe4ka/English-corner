# 🎓 AUTO END_DATE CALCULATION - Обновление

## 📝 Что изменилось

### **Фронтенд (React/TypeScript)**

**CreateGroupModal.tsx** был обновлен:

1. **Убрали поле `end_date`** - пользователь больше не выбирает конец курса вручную
2. **Добавили автоматический расчет** - на основе `start_date` и `schedule_type`
3. **Добавили визуальный preview** - перед ней показывается рассчитанный промежуток

#### Как это выглядит в форме:

```
Поля для заполнения:
├── Group Name *
├── Description
├── Teacher *
├── Schedule Type * (выбор между odd/even)
├── Start Date * (только это нужно выбрать!)
│
└── 📅 PREVIEW (автоматически показывает):
    Start: 13.04.2026
    End: 08.05.2026 (рассчитано автоматически!)
    (12 lessons on Mon/Wed/Fri)
    
└── Max Students
└── Price per Month
```

#### Код логики (JavaScript):

```typescript
// calculateEndDate() - вычисляет конец курса
const calculateEndDate = (startDate: string, scheduleType: 'odd' | 'even'): string => {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  let lessonsGenerated = 0;
  let currentDate = new Date(start);
  
  // Ищем 12 дней расписания (Mon/Wed/Fri или Tue/Thu/Sat)
  while (lessonsGenerated < 12) {
    const weekday = currentDate.getDay();
    const isOddDay = weekday === 1 || weekday === 3 || weekday === 5;  // Пн, Ср, Пт
    const isEvenDay = weekday === 2 || weekday === 4 || weekday === 6; // Вт, Чт, Сб
    
    if ((scheduleType === 'odd' && isOddDay) || (scheduleType === 'even' && isEvenDay)) {
      lessonsGenerated++;
    }
    
    if (lessonsGenerated < 12) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return currentDate.toISOString().split('T')[0];
};
```

---

### **Бэкенд (Django/DRF)**

**lesson_utils.py** была добавлена новая функция:

```python
def calculate_end_date(start_date: datetime, lessons_count: int = 12, schedule_type: str = 'odd') -> datetime:
    """
    Вычислить дату окончания курса на основе даты начала и расписания
    
    Args:
        start_date: дата начала курса
        lessons_count: количество уроков (по умолчанию 12)
        schedule_type: 'odd' (ПН/СР/ПТ) или 'even' (ВТ/ЧТ/СБ)
    
    Returns:
        дата последнего урока
    """
    lesson_dates = generate_lesson_dates(start_date, lessons_count, schedule_type)
    if lesson_dates:
        return lesson_dates[-1]  # Возвращаем дату последнего урока
    return start_date
```

**serializers.py** (GroupSerializer) была обновлена:

```python
class GroupSerializer(serializers.ModelSerializer):
    end_date = serializers.DateTimeField(required=False, allow_null=True)  # Теперь опциональный
    
    def create(self, validated_data):
        """При создании группы, если end_date не указан, вычислить его автоматически"""
        from .lesson_utils import calculate_end_date
        
        # Если end_date не передан, вычисляем его
        if not validated_data.get('end_date'):
            start_date = validated_data.get('start_date')
            schedule_type = validated_data.get('schedule_type', 'odd')
            if start_date:
                end_date = calculate_end_date(start_date, 12, schedule_type)
                validated_data['end_date'] = end_date
        
        return super().create(validated_data)
```

---

## 🧪 Пример использования

### Через API

```bash
curl -X POST "http://localhost:8000/api/v1/groups/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "English A1",
    "description": "Beginner English course",
    "teacher": 1,
    "start_date": "2026-04-13T09:00:00Z",
    "schedule_type": "odd",
    "max_students": 15,
    "price_per_month": 100
  }'

# Ответ содержит:
{
  "id": 1,
  "name": "English A1",
  "start_date": "2026-04-13T09:00:00Z",
  "end_date": "2026-05-08T00:00:00Z",  # ← АВТОМАТИЧЕСКИ ВЫЧИСЛЕНО!
  "schedule_type": "odd",
  ...
}
```

### Через Django Shell

```python
from configapp.models import Group
from configapp.lesson_utils import calculate_end_date

# При создании группы
group = Group.objects.create(
    name="English A1",
    start_date=datetime(2026, 4, 13),
    schedule_type="odd",
    teacher=Teacher.objects.first(),
    end_date=None  # Может быть None, рассчитается в serializer
)

# Или явно вычислить
group.end_date = calculate_end_date(group.start_date, 12, group.schedule_type)
group.save()
```

---

## 📊 Примеры вычисления

### Сценарий 1: ПН/СР/ПТ (odd)
```
Start: 13.04.2026 (понедельник)
Уроки:
  1. 13.04 (ПН)
  2. 15.04 (СР)
  3. 17.04 (ПТ)
  4. 20.04 (ПН)
  5. 22.04 (СР)
  6. 24.04 (ПТ)
  7. 27.04 (ПН)
  8. 29.04 (СР)
  9. 01.05 (ПТ)
  10. 04.05 (ПН)
  11. 06.05 (СР)
  12. 08.05 (ПТ)  ← КОНЕЦ

Duration: 13.04 - 08.05 = 25 дней
```

### Сценарий 2: ВТ/ЧТ/СБ (even)
```
Start: 13.04.2026 (понедельник)
Уроки:
  1. 14.04 (ВТ)
  2. 16.04 (ЧТ)
  3. 18.04 (СБ)
  4. 21.04 (ВТ)
  5. 23.04 (ЧТ)
  6. 25.04 (СБ)
  7. 28.04 (ВТ)
  8. 30.04 (ЧТ)
  9. 02.05 (СБ)
  10. 05.05 (ВТ)
  11. 07.05 (ЧТ)
  12. 09.05 (СБ)  ← КОНЕЦ

Duration: 14.04 - 09.05 = 26 дней
```

---

## ✅ Проверено

- ✅ Вычисления работают корректно на фронтенде
- ✅ Бэкенд автоматически рассчитывает end_date
- ✅ 12 уроков правильно распределяются по расписанию
- ✅ Визуальный preview показывает корректные даты

---

## 🔄 Миграция данных (если нужна)

Если у вас уже есть группы без end_date:

```python
from configapp.models import Group
from configapp.lesson_utils import calculate_end_date

# Заполнить end_date для всех групп без конца
for group in Group.objects.filter(end_date__isnull=True):
    group.end_date = calculate_end_date(group.start_date, 12, group.schedule_type)
    group.save()
    print(f"✅ Updated {group.name}: {group.end_date}")
```

---

## 🎯 Результат

**До:**
- Админ должен был вручную вычислять конец курса
- Риск ошибок в расчетах
- Два поля для ввода дат

**После:**
- Система автоматически вычисляет конец курса
- Все расчеты проверены и надежны
- Админ выбирает только начало, остальное система считает
- Удобный preview перед созданием группы
- **Интуитивный UX** ✨
