# Lesson and LessonPayment ViewSets - добавить в views.py

class LessonViewSet(viewsets.ModelViewSet):
    """ViewSet для управления уроками группы"""
    queryset = Lesson.objects.select_related('group')
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Только админы и суперадмины могут создавать/обновлять/удалять уроки"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Фильтровать уроки по группе"""
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset
    
    @extend_schema(summary="Список уроков группы")
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Получить уроки конкретной группы"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response({'error': 'group_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        lessons = Lesson.objects.filter(group_id=group_id).order_by('lesson_number')
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Создать урок"""
        serializer.save()


class LessonPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet для управления платежами за уроки"""
    queryset = LessonPayment.objects.select_related('student', 'group')
    serializer_class = LessonPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Только админы могут создавать платежи"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Фильтровать платежи"""
        student_id = self.request.query_params.get('student_id')
        group_id = self.request.query_params.get('group_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        return queryset
    
    @extend_schema(summary="Платежи за уроки студента")
    @action(detail=False, methods=['get'])
    def student_lesson_payments(self, request):
        """Получить платежи студента за уроки в конкретной группе"""
        student_id = request.query_params.get('student_id')
        group_id = request.query_params.get('group_id')
        
        if not student_id or not group_id:
            return Response(
                {'error': 'student_id and group_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = LessonPayment.objects.filter(
            student_id=student_id,
            group_id=group_id
        ).order_by('-payment_date')
        
        serializer = self.get_serializer(payments, many=True)
        
        # Get current lessons remaining
        latest_payment = payments.first()
        lessons_remaining = latest_payment.lessons_remaining if latest_payment else 0
        
        return Response({
            'lessons_remaining': lessons_remaining,
            'payment_history': serializer.data
        })
    
    @extend_schema(summary="Продлить обучение студента")
    @action(detail=False, methods=['post'])
    def extend_learning(self, request):
        """Продлить обучение студента (добавить уроки при наличии средств)"""
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        lessons_to_add = request.data.get('lessons_to_add', 1)
        
        if not all([student_id, group_id]):
            return Response(
                {'error': 'student_id, group_id, lessons_to_add required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get latest payment for this student in this group
        latest_payment = LessonPayment.objects.filter(
            student=student,
            group=group
        ).order_by('-payment_date').first()
        
        if not latest_payment:
            return Response(
                {'error': 'No existing lesson payments for this student in this group'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate cost
        cost = latest_payment.price_per_lesson * lessons_to_add
        
        if student.balance < cost:
            return Response(
                {
                    'error': 'Insufficient balance',
                    'required': float(cost),
                    'available': float(student.balance)
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Deduct from balance and add lessons
        student.balance -= cost
        student.save()
        
        # Update lesson payment record
        new_payment = LessonPayment.objects.create(
            student=student,
            group=group,
            lessons_purchased=lessons_to_add,
            total_amount=cost,
            price_per_lesson=latest_payment.price_per_lesson,
            lessons_remaining=latest_payment.lessons_remaining + lessons_to_add,
            status='completed',
            processed_by=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        )
        
        serializer = self.get_serializer(new_payment)
        return Response({
            'message': f'Added {lessons_to_add} lessons successfully',
            'payment': serializer.data,
            'new_balance': float(student.balance)
        })
