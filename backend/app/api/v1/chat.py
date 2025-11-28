"""
Chat/AI Assistant endpoints
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid
import re
from datetime import datetime

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.qwen_service import qwen_service
from app.services.rag_service import rag_service
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def is_greeting_or_simple_question(message: str) -> Optional[str]:
    """
    Проверяет, является ли сообщение приветствием или простым вопросом.
    Возвращает ответ, если это простое сообщение, иначе None.
    """
    # Нормализуем сообщение: убираем лишние пробелы, приводим к нижнему регистру
    normalized = re.sub(r'\s+', ' ', message.strip().lower())
    
    # Список приветствий
    greetings = [
        r'^(привет|здравствуй|здравствуйте|hi|hello|hey|добрый\s+(день|вечер|утро|ночь))',
        r'^(приветик|салют|хей|хай)',
        r'^(добро\s+пожаловать)',
    ]
    
    # Список простых вопросов о системе
    simple_questions = {
        r'^(как\s+дела|как\s+поживаешь|how\s+are\s+you)': 'Спасибо, всё отлично! Готов помочь вам с документами.',
        r'^(что\s+ты\s+умеешь|что\s+можешь|what\s+can\s+you\s+do)': 'Я AI-ассистент системы Sirius DMS. Могу помочь вам найти документы, ответить на вопросы по содержимому документов, классифицировать документы и многое другое.',
        r'^(кто\s+ты|who\s+are\s+you)': 'Я AI-ассистент системы управления документами Sirius DMS. Помогаю работать с документами и отвечаю на вопросы.',
        r'^(спасибо|благодарю|thank\s+you|thanks)': 'Пожалуйста! Всегда рад помочь.',
        r'^(пока|до\s+свидания|goodbye|bye)': 'До свидания! Обращайтесь, если понадобится помощь.',
        r'^(помощь|help|что\s+ты\s+можешь)': 'Я могу помочь вам:\n- Найти документы по запросу\n- Ответить на вопросы по содержимому документов\n- Классифицировать документы\n- Предоставить информацию из базы документов',
    }
    
    # Проверяем приветствия
    for pattern in greetings:
        if re.match(pattern, normalized):
            greetings_responses = [
                'Привет! Чем могу помочь?',
                'Здравствуйте! Как дела?',
                'Привет! Готов помочь с документами.',
                'Здравствуйте! Чем могу быть полезен?',
            ]
            import random
            return random.choice(greetings_responses)
    
    # Проверяем простые вопросы
    for pattern, response in simple_questions.items():
        if re.match(pattern, normalized):
            return response
    
    return None


class SendMessageRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


@router.post("/message")
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отправка сообщения AI ассистенту согласно архитектуре:
    FastAPI → Qwen → RAG → Postgres → Qwen → Redis → ответ
    """
    # Проверяем, является ли сообщение простым приветствием или типовым вопросом
    simple_response = is_greeting_or_simple_question(request.message)
    if simple_response:
        return {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": simple_response,
            "timestamp": datetime.now().isoformat(),
            "documents": []
        }
    
    # Если это не простое сообщение, обрабатываем через RAG/Postgres/Redis
    search_result = await qwen_service.process_search_query(
        query=request.message,
        rag_service=rag_service,
        db=db
    )
    
    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": search_result.get("answer", "Не удалось обработать запрос."),
        "timestamp": datetime.now().isoformat(),
        "documents": search_result.get("documents", [])
    }


@router.post("/stream")
async def stream_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream message response (SSE)"""
    # Проверяем, является ли сообщение простым приветствием или типовым вопросом
    simple_response = is_greeting_or_simple_question(request.message)
    
    async def generate():
        if simple_response:
            # Stream simple response word by word
            words = simple_response.split()
            for word in words:
                yield f"data: {json.dumps({'content': word + ' '})}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        # Используем process_search_query для получения всех документов
        search_result = await qwen_service.process_search_query(
            query=request.message,
            rag_service=rag_service,
            db=db
        )
        
        # Формируем контекст из всех найденных чанков
        chunks = search_result.get("chunks", [])
        context_parts = []
        if chunks:
            for chunk in chunks[:10]:  # Используем топ-10 для контекста
                context_parts.append(f"- {chunk['document_title']}: {chunk['text'][:300]}")
        
        context = "\n".join(context_parts) if context_parts else "Нет релевантных документов."
        
        prompt = f"""Ты - AI ассистент системы управления документами Sirius DMS.
Вопрос: {request.message}
Контекст: {context}
Ответь на вопрос."""
        
        # Generate response in chunks
        try:
            response = qwen_service._generate_text(
                prompt=prompt,
                max_new_tokens=512,
                temperature=0.7
            )
        except Exception as e:
            logger.error(f"❌ Ошибка при генерации ответа: {e}")
            response = f"Найдено {len(chunks)} релевантных документов. Извините, не удалось сформировать ответ. Попробуйте переформулировать вопрос."
        
        # Stream response word by word
        words = response.split()
        for word in words:
            yield f"data: {json.dumps({'content': word + ' '})}\n\n"
        
        # В конце отправляем информацию о документах
        documents = search_result.get("documents", [])
        if documents:
            yield f"data: {json.dumps({'documents': documents})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/history")
async def get_chat_history(
    limit: Optional[int] = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history"""
    # In a real implementation, store chat history in database
    return {
        "messages": []
    }


@router.delete("/clear")
async def clear_history(
    current_user: User = Depends(get_current_user)
):
    """Clear chat history"""
    return {"message": "History cleared"}

