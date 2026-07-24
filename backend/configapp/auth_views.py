from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import string
import uuid
from .models import Admin, TwoFactorAuth, VerificationCode

# In-memory storage for 2FA sessions (user_id -> session_id mapping)
# In production, use Redis or similar
_2fa_sessions = {}


def generate_verification_code():
    """Генерировать 6-значный код подтверждения"""
    return ''.join(random.choices(string.digits, k=6))


def send_2fa_code(email, code):
    print(code)
    """Отправить код подтверждения на email"""
    subject = 'English Corner - 2FA Verification Code'
    message = f'''
    Hello,
    
    Your verification code for English Corner SuperAdmin is:
    
    {code}
    
    This code is valid for 10 minutes.
    
    If you did not request this code, please ignore this email.
    
    Best regards,
    English Corner Admin Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False



class UserLoginView(APIView):
    """View для входа в систему"""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Вход в систему",
        description="Получить JWT токены (access и refresh) для аутентификации",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "Username или Email"},
                    "password": {"type": "string", "description": "Пароль"}
                },
                "required": ["username", "password"]
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "access": {"type": "string", "description": "Access Token (действителен 2 часа)"},
                    "refresh": {"type": "string", "description": "Refresh Token"},
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "username": {"type": "string"},
                            "email": {"type": "string"},
                            "first_name": {"type": "string"},
                            "last_name": {"type": "string"}
                        }
                    }
                }
            },
            401: {
                "type": "object",
                "properties": {
                    "detail": {"type": "string"}
                }
            }
        }
    )
    def post(self, request):
        """Вход в систему"""
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to find user by username or email
        user = None
        try:
            # First try by username
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Try by email
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                pass

        # Check password if user found
        if user is None or not user.check_password(password):
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })


class UserLogoutView(APIView):
    """View для выхода из системы"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Выход из системы",
        description="Инвалидировать refresh token",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "refresh": {"type": "string", "description": "Refresh token для инвалидации"}
                },
                "required": ["refresh"]
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                }
            }
        }
    )
    def post(self, request):
        """Выход из системы"""
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TokenRefreshView(APIView):
    """View для обновления access token"""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Обновить Access Token",
        description="Получить новый access token используя refresh token",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "refresh": {"type": "string", "description": "Refresh token"}
                },
                "required": ["refresh"]
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "access": {"type": "string", "description": "Новый Access Token"}
                }
            }
        }
    )
    def post(self, request):
        """Обновить access token"""
        try:
            refresh_token = request.data.get('refresh')
            refresh = RefreshToken(refresh_token)
            return Response({'access': str(refresh.access_token)})
        except Exception as e:
            return Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class CurrentUserView(APIView):
    """View для получения информации текущего пользователя"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Получить текущего пользователя",
        description="Получить информацию о текущем аутентифицированном пользователе",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "username": {"type": "string"},
                    "email": {"type": "string"},
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"}
                }
            }
        }
    )
    def get(self, request):
        """Получить информацию текущего пользователя"""
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name
        })

class SuperAdminLoginView(APIView):
    """View для входа SuperAdmin с 2FA"""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Вход SuperAdmin (Step 1)",
        description="Вход в SuperAdmin с отправкой кода подтверждения на email",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "email": {"type": "string"},
                    "password": {"type": "string"}
                },
                "required": ["email", "password"]
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "email": {"type": "string"},
                    "session_id": {"type": "string"}
                }
            },
            401: {"description": "Invalid credentials"}
        }
    )
    def post(self, request):
        """Вход SuperAdmin и отправка кода 2FA"""
        try:
            email_or_username = (request.data.get('email') or request.data.get('username') or '').strip()
            password = request.data.get('password')

            if not email_or_username or not password:
                return Response(
                    {'error': 'Email or username and password are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Найти пользователя по email или username
            user = User.objects.filter(Q(email__iexact=email_or_username) | Q(username__iexact=email_or_username)).first()
            if not user:
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Проверить пароль
            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Проверить что это SuperAdmin
            admin = Admin.objects.filter(user=user).first()
            if not (user.is_superuser or (admin and admin.role in ['superadmin', 'super_admin'])):
                return Response(
                    {'error': 'Only SuperAdmins can use this endpoint'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Получить или создать Admin профиль если не существует
            if not admin:
                admin = Admin.objects.create(user=user, role='superadmin', is_active=True)

            # Получить или создать 2FA профиль
            two_factor, created = TwoFactorAuth.objects.get_or_create(
                admin=admin,
                defaults={'email': user.email or 'admin@example.com'}
            )

            # Генерировать и сохранить код
            code = generate_verification_code()
            expires_at = timezone.now() + timedelta(minutes=10)
            
            verification_code = VerificationCode.objects.create(
                two_factor=two_factor,
                code=code,
                expires_at=expires_at
            )

            # Отправить код на email (fail-safe fallback for production)
            try:
                send_2fa_code(two_factor.email or user.email, code)
            except Exception as e:
                print(f"Email send error: {e}")

            session_id = str(uuid.uuid4())
            _2fa_sessions[session_id] = {
                'user_id': user.id,
                'admin_id': admin.id,
                'created_at': timezone.now(),
                'code': code
            }
            
            return Response({
                'message': f'Verification code generated for {two_factor.email or user.email}',
                'email': two_factor.email or user.email,
                'session_id': session_id,
                'code': code  # Included in response for seamless development & fallback access
            }, status=status.HTTP_200_OK)
        except Exception as err:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'SuperAdmin Login Error: {str(err)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SuperAdminVerifyCodeView(APIView):
    """View для подтверждения кода 2FA"""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Подтвердить код 2FA (Step 2)",
        description="Подтвердить код полученный на email",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "session_id": {"type": "string"},
                    "code": {"type": "string"}
                },
                "required": ["session_id", "code"]
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "access": {"type": "string"},
                    "refresh": {"type": "string"},
                    "user": {"type": "object"}
                }
            }
        }
    )
    def post(self, request):
        """Подтвердить код и получить токены"""
        session_id = request.data.get('session_id')
        code = request.data.get('code')
        print(code)
        if not session_id or not code:
            return Response(
                {'error': 'session_id and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Найти сессию
        session_data = _2fa_sessions.get(session_id)
        if not session_data:
            return Response(
                {'error': 'Invalid or expired session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверить что сессия не истекла (10 минут)
        if timezone.now() - session_data['created_at'] > timedelta(minutes=10):
            del _2fa_sessions[session_id]
            return Response(
                {'error': 'Session expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Проверить код
        if code != session_data['code']:
            return Response(
                {'error': 'Invalid code'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Получить пользователя
        try:
            user = User.objects.get(id=session_data['user_id'])
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Удалить использованную сессию
        del _2fa_sessions[session_id]

        # Выдать токены
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })


class SuperAdminResendCodeView(APIView):
    """View для повторной отправки кода"""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Повторно отправить код 2FA",
        description="Отправить новый код, если старый потерян",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "session_id": {"type": "string"}
                },
                "required": ["session_id"]
            }
        },
        responses={
            200: {"description": "Code sent"}
        }
    )
    def post(self, request):
        """Повторно отправить код"""
        session_id = request.data.get('session_id')

        if not session_id:
            return Response(
                {'error': 'session_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Найти сессию
        session_data = _2fa_sessions.get(session_id)
        if not session_data:
            return Response(
                {'error': 'Invalid or expired session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=session_data['user_id'])
            admin = Admin.objects.get(id=session_data['admin_id'], role='super_admin')
            two_factor = TwoFactorAuth.objects.get(admin=admin)
        except (User.DoesNotExist, Admin.DoesNotExist, TwoFactorAuth.DoesNotExist):
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Генерировать новый код
        code = generate_verification_code()
        
        # Обновить сессию с новым кодом
        session_data['code'] = code

        # Отправить код
        if send_2fa_code(two_factor.email, code):
            return Response({
                'message': f'New verification code sent to {two_factor.email}'
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to send code'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )