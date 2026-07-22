from django.apps import AppConfig


class ConfigappConfig(AppConfig):
    name = 'configapp'
    
    def ready(self):
        import configapp.signals  # noqa
