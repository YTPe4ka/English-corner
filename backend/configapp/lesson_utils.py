"""
Вспомогательные функции для работы с логикой уроков и платежей
"""
from datetime import datetime, timedelta, time
from django.utils import timezone
from .models import Group, Lesson, StudentLesson, LessonPayment, ActionLog, GroupStudent, Notification


def _get_student_join_date(student, group):
    """Возвращает дату добавления студента в группу."""
    relation = GroupStudent.objects.filter(student=student, group=group).first()
    if relation and relation.joined_at:
        return relation.joined_at.date()
    return group.start_date.date()


def _parse_time(value):
    """Преобразовать строковое или временное значение в datetime.time."""
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.strptime(value, '%H:%M:%S').time()
    if isinstance(value, time):
        return value
    return value


def _sync_student_lesson_status(student_lesson):
    """Синхронизировать статус урока с датой урока, датой добавления студента и текущей датой."""
    if student_lesson.status in ['paid', 'bonus', 'removed']:
        return student_lesson

    lesson_date = student_lesson.lesson.scheduled_date.date()
    today = timezone.now().date()
    join_date = _get_student_join_date(student_lesson.student, student_lesson.group)

    # Правило:
    # - до даты урока -> future
    # - после даты урока и не оплачен -> unpaid
    # - для позднего добавления в группу: все уроки до даты добавления сразу unpaid
    if lesson_date < join_date or lesson_date < today:
        new_status = 'unpaid'
    else:
        new_status = 'future'

    if student_lesson.status != new_status:
        student_lesson.status = new_status
        student_lesson.save(update_fields=['status'])

    return student_lesson


def is_odd_day(date: datetime) -> bool:
    """Проверить четный/нечетный день недели (1=Пн, 7=Вс)"""
    weekday = date.weekday()  # 0=Пн, 6=Вс
    return weekday in [0, 2, 4]  # Пн, Ср, Пт = нечетные


def is_even_day(date: datetime) -> bool:
    """Проверить четный/нечетный день недели"""
    weekday = date.weekday()  # 0=Пн, 6=Вс
    return weekday in [1, 3, 5]  # Вт, Чт, Сб = четные


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


def generate_lesson_dates(start_date: datetime, lessons_count: int = 12, schedule_type: str = 'odd') -> list:
    """
    Генерировать даты уроков на основе расписания
    
    Args:
        start_date: дата начала
        lessons_count: количество уроков (по умолчанию 12)
        schedule_type: 'odd' (ПН/СР/ПТ) или 'even' (ВТ/ЧТ/СБ)
    
    Returns:
        список дат уроков
    """
    lesson_dates = []
    tzinfo = start_date.tzinfo if hasattr(start_date, 'tzinfo') else None
    current_date = datetime.combine(start_date.date(), datetime.min.time(), tzinfo=tzinfo)
    
    while len(lesson_dates) < lessons_count:
        if schedule_type == 'odd' and is_odd_day(current_date):
            lesson_dates.append(current_date)
        elif schedule_type == 'even' and is_even_day(current_date):
            lesson_dates.append(current_date)
        
        current_date += timedelta(days=1)
    
    return lesson_dates


def create_group_lessons(group):
    """
    Создать уроки для группы при создании группы
    
    Args:
        group: объект Group
    """
    # Генерируем 12 уроков
    lesson_dates = generate_lesson_dates(
        group.start_date,
        lessons_count=12,
        schedule_type=group.schedule_type
    )
    start_time = _parse_time(group.start_time)
    end_time = _parse_time(group.end_time)
    tzinfo = group.start_date.tzinfo if hasattr(group.start_date, 'tzinfo') else None
    
    for i, date in enumerate(lesson_dates, 1):
        if start_time:
            scheduled_date = datetime.combine(date.date(), start_time, tzinfo=tzinfo)
        else:
            scheduled_date = datetime.combine(
                date.date(),
                group.start_date.time(),
                tzinfo=tzinfo
            )

        duration_minutes = 90
        if start_time and end_time:
            duration = datetime.combine(date.date(), end_time, tzinfo=tzinfo) - datetime.combine(date.date(), start_time, tzinfo=tzinfo)
            duration_minutes = max(int(duration.total_seconds() // 60), 30)

        Lesson.objects.get_or_create(
            group=group,
            lesson_number=i,
            defaults={
                'scheduled_date': scheduled_date,
                'duration_minutes': duration_minutes,
            }
        )


def initialize_student_lessons(student, group):
    """
    Инициализировать статусы уроков студента при добавлении в существующую группу.

    Правила:
    - до даты занятия -> future
    - после даты занятия и без оплаты -> unpaid
    - если студент добавлен позже, уроки до даты добавления сразу unpaid
    """
    lessons = Lesson.objects.filter(group=group).order_by('scheduled_date')
    for lesson in lessons:
        student_lesson, created = StudentLesson.objects.get_or_create(
            student=student,
            lesson=lesson,
            group=group,
            defaults={'status': 'future'}
        )
        if created:
            _sync_student_lesson_status(student_lesson)
        else:
            _sync_student_lesson_status(student_lesson)


def distribute_payment_to_lessons(student, group, lessons_count: int, payment_obj, admin=None):
    """
    Распределить платеж по урокам студента
    Логика: переносим платеж на будущие уроки, или закрываем прошлые
    
    Args:
        student: объект Student
        group: объект Group
        lessons_count: количество оплаченных уроков (1, 6, или 12)
        payment_obj: объект LessonPayment
        admin: админ, который произвел платеж
    """
    now = timezone.now()
    
    # Получаем все уроки группы, отсортированные по дате
    lessons = Lesson.objects.filter(group=group).order_by('scheduled_date')
    
    # Находим первый урок, который еще не прошел или сегодня
    future_lessons = []
    past_lessons = []
    
    for lesson in lessons:
        if lesson.scheduled_date.date() <= now.date():
            past_lessons.append(lesson)
        else:
            future_lessons.append(lesson)
    
    lessons_to_mark = []

    # Сначала компенсируем удалённые уроки
    removed_lessons = StudentLesson.objects.filter(
        student=student,
        group=group,
        status='removed'
    ).order_by('lesson__scheduled_date')

    for student_lesson in removed_lessons:
        lessons_to_mark.append(student_lesson)
        if len(lessons_to_mark) >= lessons_count:
            break

    # Если осталось, добавляем старые неоплаченные уроки
    if len(lessons_to_mark) < lessons_count:
        for lesson in past_lessons:
            student_lesson, created = StudentLesson.objects.get_or_create(
                student=student,
                lesson=lesson,
                group=group,
                defaults={'status': 'unpaid'}
            )
            if student_lesson.status not in ['paid', 'bonus', 'removed']:
                lessons_to_mark.append(student_lesson)
                if len(lessons_to_mark) >= lessons_count:
                    break

    # Если осталось, берем будущие уроки
    if len(lessons_to_mark) < lessons_count:
        for lesson in future_lessons:
            student_lesson, created = StudentLesson.objects.get_or_create(
                student=student,
                lesson=lesson,
                group=group,
                defaults={'status': 'unpaid'}
            )
            if student_lesson.status not in ['paid', 'bonus', 'removed']:
                lessons_to_mark.append(student_lesson)
                if len(lessons_to_mark) >= lessons_count:
                    break
    
    # Помечаем уроки как оплаченные
    for student_lesson in lessons_to_mark:
        student_lesson.status = 'paid'
        student_lesson.payment = payment_obj
        student_lesson.save()
    
    # Логируем действие
    if admin:
        ActionLog.objects.create(
            student=student,
            action_type='payment',
            lessons_affected=len(lessons_to_mark),
            amount=payment_obj.total_amount,
            description=f"Payment for {lessons_count} lessons",
            created_by=admin,
            payment=payment_obj
        )


def add_bonus_lessons(student, group, bonus_count: int, admin=None):
    """
    Добавить бонусные уроки студенту
    
    Args:
        student: объект Student
        group: объект Group
        bonus_count: количество бонусных уроков
        admin: админ, который добавил бонусы
    """
    lessons = Lesson.objects.filter(group=group).order_by('scheduled_date')
    marked_count = 0

    # Сначала возьмём удалённые уроки
    removed_lessons = StudentLesson.objects.filter(
        student=student,
        group=group,
        status='removed'
    ).order_by('lesson__scheduled_date')

    for student_lesson in removed_lessons:
        student_lesson.status = 'bonus'
        student_lesson.save()
        marked_count += 1
        if marked_count >= bonus_count:
            break

    if marked_count < bonus_count:
        for lesson in lessons:
            student_lesson, created = StudentLesson.objects.get_or_create(
                student=student,
                lesson=lesson,
                group=group,
                defaults={'status': 'unpaid'}
            )

            if student_lesson.status in ['future', 'unpaid']:
                student_lesson.status = 'bonus'
                student_lesson.save()
                marked_count += 1

            if marked_count >= bonus_count:
                break

    # Логируем действие
    if admin:
        ActionLog.objects.create(
            student=student,
            group=group,
            action_type='bonus',
            lessons_affected=marked_count,
            description=f"Added {marked_count} bonus lesson(s) to group {group.name}",
            created_by=admin
        )


def _decrement_latest_lesson_payment_remaining(student, group, decrement: int = 1):
    if decrement <= 0:
        return

    latest_payment = LessonPayment.objects.filter(student=student, group=group).order_by('-payment_date').first()
    if not latest_payment:
        return

    latest_payment.lessons_remaining = max(0, latest_payment.lessons_remaining - decrement)
    latest_payment.save()


def remove_last_lessons(student, group, lesson_count: int = 1, admin=None):
    """
    Удалить последние уроки у студента (пометить как removed).

    Удаляются только уроки со статусами paid/bonus.
    Уроки со статусами unpaid/future не затрагиваются.
    """
    lesson_count = int(lesson_count or 1)
    if lesson_count < 1:
        return 0

    lessons = Lesson.objects.filter(group=group).order_by('-lesson_number')
    removed_lessons = []
    paid_lessons_removed = 0

    for lesson in lessons:
        student_lesson, _ = StudentLesson.objects.get_or_create(
            student=student,
            lesson=lesson,
            group=group,
            defaults={'status': 'future'}
        )

        if student_lesson.status == 'removed':
            continue

        if student_lesson.status not in ['paid', 'bonus']:
            continue

        student_lesson.status = 'removed'
        student_lesson.save(update_fields=['status'])
        removed_lessons.append(student_lesson)
        paid_lessons_removed += 1

        if len(removed_lessons) >= lesson_count:
            break

    if not removed_lessons:
        return 0

    if paid_lessons_removed > 0:
        _decrement_latest_lesson_payment_remaining(student, group, paid_lessons_removed)

    if admin:
        ActionLog.objects.create(
            student=student,
            group=group,
            action_type='remove_lesson',
            lessons_affected=len(removed_lessons),
            description=f"Removed {len(removed_lessons)} last lesson(s) from group {group.name}",
            created_by=admin
        )

    return len(removed_lessons)


def remove_lesson(student, group, lesson_id: int, admin=None):
    """
    Удалить урок у студента (пометить как removed)
    
    Args:
        student: объект Student
        group: объект Group
        lesson_id: ID урока для удаления
        admin: админ, который удалил урок
    """
    try:
        lesson = Lesson.objects.get(id=lesson_id, group=group)
        student_lesson, created = StudentLesson.objects.get_or_create(
            student=student,
            lesson=lesson,
            group=group,
            defaults={'status': 'future'}
        )

        if student_lesson.status == 'removed':
            return False

        if student_lesson.status not in ['paid', 'bonus']:
            return False

        student_lesson.status = 'removed'
        student_lesson.save(update_fields=['status'])
        _decrement_latest_lesson_payment_remaining(student, group, 1)
        
        # Логируем действие
        if admin:
            ActionLog.objects.create(
                student=student,
                group=group,
                action_type='remove_lesson',
                lessons_affected=1,
                description=f"Removed lesson {lesson.lesson_number} from group {group.name}",
                created_by=admin
            )
        
        return True
    except Lesson.DoesNotExist:
        return False


def get_student_lesson_table(group):
    """
    Получить таблицу статусов всех студентов в группе по урокам
    
    Returns:
        {
            'lessons': [
                {'id': 1, 'number': 1, 'date': '16.03.2026'},
                {'id': 2, 'number': 2, 'date': '18.03.2026'},
                ...
            ],
            'students': [
                {
                    'id': 1,
                    'name': 'Абдурауф',
                    'lessons_status': ['paid', 'paid', 'unpaid', 'unpaid', ...]
                },
                ...
            ]
        }
    """
    lessons = Lesson.objects.filter(group=group).order_by('lesson_number')
    students = group.students.filter(is_active=True)
    
    lessons_data = []
    for lesson in lessons:
        lessons_data.append({
            'id': lesson.id,
            'number': lesson.lesson_number,
            'date': lesson.scheduled_date.strftime('%d.%m.%Y'),
            'time': lesson.scheduled_date.strftime('%H:%M'),
        })
    
    students_data = []
    for group_student in students:
        student = group_student.student
        student_lessons = StudentLesson.objects.filter(
            student=student,
            group=group
        ).order_by('lesson__lesson_number')

        lessons_by_id = {sl.lesson_id: sl for sl in student_lessons}
        statuses = []
        expired = False

        for lesson in lessons:
            sl = lessons_by_id.get(lesson.id)
            if sl:
                _sync_student_lesson_status(sl)
                statuses.append(sl.status)
                if sl.is_expired():
                    expired = True
            else:
                join_date = _get_student_join_date(student, group)
                lesson_date = lesson.scheduled_date.date()
                if lesson_date < join_date or lesson_date < timezone.now().date():
                    statuses.append('unpaid')
                else:
                    statuses.append('future')
                if lesson_date < timezone.now().date():
                    expired = True

        students_data.append({
            'id': student.id,
            'name': student.user.get_full_name() or student.user.username,
            'email': student.user.email,
            'lessons_status': statuses,
            'is_expired': expired
        })
    
    return {
        'group': {
            'id': group.id,
            'name': group.name,
            'schedule_type': group.schedule_type,
        },
        'lessons': lessons_data,
        'students': students_data,
    }


def mark_lessons_consumed_today():
    """
    Ежедневная задача: отметить уроки как потребленные (на дату)
    Если урок был на дату, и он был оплачен - помечаем как использованный
    """
    from django.db.models import Q
    
    today = timezone.now().date()
    lessons_today = Lesson.objects.filter(scheduled_date__date=today)
    
    for lesson in lessons_today:
        # Найти студентов с оплаченными уроками
        student_lessons = StudentLesson.objects.filter(
            lesson=lesson,
            status__in=['paid', 'bonus']
        )
        
        for sl in student_lessons:
            # Отмечаем как использованный (урок прошел)
            pass  # В этом примере просто отмечаем дату, статус остается paid


def check_expired_students():
    """
    Ежедневная задача: проверить и отметить просроченных студентов
    Студент просроченный если нет оплаченных уроков на текущую дату и будущие даты
    """
    from django.db import models
    
    today = timezone.now().date()
    
    # Найти все студент-группа связи
    group_students = GroupStudent.objects.filter(is_active=True)
    
    for group_student in group_students:
        student = group_student.student
        group = group_student.group
        
        # Проверить есть ли оплаченные уроки на сегодня или позже
        has_paid_future = StudentLesson.objects.filter(
            student=student,
            group=group,
            status__in=['paid', 'bonus'],
            lesson__scheduled_date__gte=timezone.now()
        ).exists()
        
        if not has_paid_future:
            # Студент просроченный
            # Можно отправить уведомление admin
            pass


def create_unpaid_lesson_notifications(user):
    """Создать одноразовое уведомление о просроченных неоплаченных уроках."""
    unpaid_lessons = StudentLesson.objects.filter(
        student__user=user,
        status='unpaid',
        lesson__scheduled_date__lt=timezone.now()
    ).select_related('group').order_by('lesson__scheduled_date')

    if not unpaid_lessons.exists():
        return []

    notifications = []
    for group_id in unpaid_lessons.values_list('group_id', flat=True).distinct():
        group = Group.objects.filter(id=group_id).first()
        if not group:
            continue

        message = (
            f"You have unpaid lessons in the group '{group.name}'. "
            "Please settle the payment to avoid interruption."
        )
        notification, created = Notification.objects.get_or_create(
            recipient=user,
            group=group,
            notification_type='unpaid_lessons',
            message=message,
            defaults={'is_read': False}
        )
        if created:
            notifications.append(notification)

    return notifications
