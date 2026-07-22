import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from configapp.models import Payment, Student

student_id = 3
s = Student.objects.filter(id=student_id).first()
print('student:', s)
qs = Payment.objects.filter(student_id=student_id).order_by('-payment_date')[:20]
print('payments count:', qs.count())
for p in qs:
    print(p.id, p.amount, p.payment_type, p.payment_date, p.group_id)
