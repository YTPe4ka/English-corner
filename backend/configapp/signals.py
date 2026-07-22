"""
Django signals для автоматизации процессов
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Group, StudentLesson
from .lesson_utils import create_group_lessons
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Group)
def generate_lessons_on_group_creation(sender, instance, created, **kwargs):
    """
    Сигнал: при создании группы автоматически генерируем 12 уроков
    """
    if created:
        try:
            create_group_lessons(instance)
            logger.info(f"Created 12 lessons for group {instance.id} ({instance.name})")
        except Exception as e:
            logger.error(f"Error creating lessons for group {instance.id}: {str(e)}")
