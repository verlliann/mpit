"""
Qwen model service for document classification
Согласно архитектуре:
- При загрузке: получает метрики от RAG, классифицирует, формирует обратные метрики, сохраняет документы в Redis
- При поиске: обращается к RAG/Postgres, формирует ответ, получает документы из Redis
"""
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from typing import List, Optional, Dict, Any
import logging
import os
import json
from app.core.config import settings

logger = logging.getLogger(__name__)


class QwenService:
    """Service for Qwen model operations"""
    
    _instance = None
    _model = None
    _tokenizer = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(QwenService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Lazy loading - model will be loaded on first use
        # This prevents blocking startup if model download is needed
        pass
    
    def _ensure_model_loaded(self):
        """Ensure model is loaded (lazy loading) - вызывается только при первом использовании"""
        if self._model is None or self._tokenizer is None:
            logger.info("🔄 Загрузка модели Qwen из локальной папки (lazy loading, первый запрос)...")
            try:
                self._load_model()
            except Exception as e:
                logger.error(f"❌ Failed to load Qwen model: {e}", exc_info=True)
                raise
    
    def _load_model(self):
        """Load Qwen model - вызывается только при первом использовании (lazy loading)"""
        logger.info("🔄 Начинаю загрузку модели Qwen (lazy loading)...")
        
        # Проверяем наличие локальной модели
        # Используем Qwen3-4B по умолчанию (как в предыдущем проекте)
        model_name = settings.QWEN_MODEL_NAME
        use_local = False
        
        # Проверяем локальную модель (только проверка файлов, без загрузки)
        if settings.QWEN_MODEL_PATH:
            model_path = settings.QWEN_MODEL_PATH
            index_file = os.path.join(model_path, "model.safetensors.index.json")
            
            # Быстрая проверка без чтения больших файлов
            if os.path.isdir(model_path) and os.path.isfile(index_file):
                try:
                    # Только проверяем наличие файлов, не загружаем их
                    with open(index_file, 'r') as f:
                        index_data = json.load(f)
                    
                    weight_map = index_data.get('weight_map', {})
                    required_files = set(weight_map.values())
                    # Проверяем только существование файлов, не загружаем
                    all_files_exist = all(
                        os.path.isfile(os.path.join(model_path, fname))
                        for fname in required_files
                    )
                    
                    if all_files_exist:
                        use_local = True
                        model_name = model_path
                        logger.info(f"✅ Найдена локальная модель: {model_path}, начинаю загрузку...")
                    else:
                        missing = [f for f in required_files if not os.path.isfile(os.path.join(model_path, f))]
                        logger.warning(f"⚠️ Локальная модель неполная, отсутствуют файлы: {missing[:5]}")
                except Exception as e:
                    logger.warning(f"⚠️ Ошибка при проверке локальной модели: {e}")
            else:
                logger.info(f"📥 Локальная модель не найдена в {model_path}, загружаем из Hugging Face")
        
        if not use_local:
            logger.info(f"📥 Загрузка модели из Hugging Face: {model_name}")
            logger.warning("⚠️ Это может занять несколько минут при первом запуске...")
        
        device = self._get_best_device()
        logger.info(f"Инициализация модели {model_name} на устройстве {device}")
        
        model_kwargs = {
            "dtype": torch.float32,  # Always use float32 for CPU compatibility
            "device_map": None,  # Explicitly set to None for CPU
            "trust_remote_code": True
        }
        
        # Quantization для экономии памяти (особенно полезно для Mac)
        if settings.QWEN_LOAD_IN_8BIT:
            model_kwargs["load_in_8bit"] = True
            logger.info("Используется 8-bit quantization")
        elif settings.QWEN_LOAD_IN_4BIT:
            model_kwargs["load_in_4bit"] = True
            logger.info("Используется 4-bit quantization (рекомендуется для Mac)")
        
        try:
            logger.info("📥 Загрузка токенизатора...")
            # Для Qwen3 используем Qwen2Tokenizer (Qwen3 использует тот же токенизатор)
            try:
                from transformers import Qwen2Tokenizer
                logger.info("Используем Qwen2Tokenizer для Qwen3 модели...")
                self._tokenizer = Qwen2Tokenizer.from_pretrained(
                    model_name,
                    trust_remote_code=True
                )
            except (ImportError, Exception) as tokenizer_error:
                logger.warning(f"⚠️ Qwen2Tokenizer недоступен ({tokenizer_error}), пробуем AutoTokenizer...")
                # Fallback на AutoTokenizer
                self._tokenizer = AutoTokenizer.from_pretrained(
                    model_name,
                    trust_remote_code=True
                )
            
            logger.info("📥 Загрузка модели (это может занять время)...")
            try:
                self._model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    **model_kwargs
                )
            except Exception as model_error:
                logger.error(f"❌ Ошибка при загрузке модели: {model_error}")
                # Если модель не загрузилась, но токенизатор загружен, 
                # устанавливаем модель в None для использования fallback
                logger.warning("⚠️ Модель не загружена, будет использован fallback режим")
                self._model = None
                if self._tokenizer:
                    if self._tokenizer.pad_token is None:
                        self._tokenizer.pad_token = self._tokenizer.eos_token
                return  # Выходим, модель будет None, но токенизатор загружен
            
            # Explicitly move model to device if CPU
            if device == "cpu":
                self._model = self._model.to("cpu")
            self._model.eval()  # Set to evaluation mode
            
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token
            
            logger.info(f"✅ Модель Qwen успешно загружена на устройстве {device}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при загрузке модели: {e}")
            # Устанавливаем модель в None для fallback режима
            self._model = None
            if self._tokenizer and self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token
            logger.warning("⚠️ Модель не загружена, будет использован fallback режим (классификация по ключевым словам)")
    
    def _get_best_device(self) -> str:
        """Get best available device"""
        # Check if device is forced via settings
        if settings.QWEN_DEVICE and settings.QWEN_DEVICE.lower() != "auto":
            device = settings.QWEN_DEVICE.lower()
            if device == "cpu":
                return "cpu"
            elif device == "cuda" and torch.cuda.is_available():
                return "cuda"
            elif device == "mps" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
            else:
                logger.warning(f"Requested device '{device}' not available, falling back to CPU")
                return "cpu"
        
        # Auto-detect best device
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    
    async def classify_metrics_from_rag(
        self,
        metrics: Dict[str, any]
    ) -> Dict[str, Any]:
        """
        Классифицировать метрики, полученные от RAG
        Согласно архитектуре: RAG передает метрики → Qwen классифицирует → формирует обратные метрики
        
        Args:
            metrics: Метрики документа от RAG
            
        Returns:
            Результат классификации (обратные метрики для RAG → Postgres)
        """
        text = metrics.get("text", "")
        filename = metrics.get("filename", "")
        
        # Try to load model, but use fallback if it fails
        try:
            self._ensure_model_loaded()
        except Exception as e:
            logger.warning(f"Failed to load Qwen model, using fallback classification: {e}")
            return {
                "classification": self._fallback_classify(text, filename),
                "processed": False,
                "error": f"Model not available: {str(e)}",
                "chunks_count": metrics.get("chunks_count", 0),
                "text_length": metrics.get("text_length", 0)
            }
        
        prompt = f"""Проанализируй следующий документ и определи:
1. Тип документа (contract, invoice, act, order, email, scan)
2. Название организации-контрагента (если есть)
3. Дату документа (если есть)
4. Приоритет (high, medium, low)
5. Краткое описание (1-2 предложения)

Текст документа:
{text[:2000]}

Ответь в формате JSON:
{{
    "type": "тип документа",
    "counterparty_name": "название организации или null",
    "date": "YYYY-MM-DD или null",
    "priority": "high/medium/low",
    "description": "краткое описание"
}}"""
        
        try:
            response = self._generate_text(
                prompt=prompt,
                max_new_tokens=256,
                temperature=0.3
            )
            
            # Parse JSON from response
            import re
            json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if json_match:
                classification = json.loads(json_match.group())
            else:
                classification = self._fallback_classify(text, filename)
            
            # Формируем обратные метрики для RAG → Postgres
            reverse_metrics = {
                "classification": classification,
                "processed": True,
                "chunks_count": metrics.get("chunks_count", 0),
                "text_length": metrics.get("text_length", 0)
            }
            
            logger.info(f"✅ Qwen классифицировал документ {filename}, сформировал обратные метрики")
            return reverse_metrics
            
        except Exception as e:
            logger.error(f"Ошибка при классификации метрик: {e}")
            return {
                "classification": self._fallback_classify(text, filename),
                "processed": False,
                "error": str(e)
            }
    
    async def save_document_to_redis(
        self,
        document_id: str,
        file_data: bytes,
        metadata: Dict[str, any]
    ):
        """
        Сохранить документ в Redis
        Согласно архитектуре: Qwen → документы → Redis
        
        Args:
            document_id: ID документа
            file_data: Данные файла
            metadata: Метаданные документа
        """
        try:
            from app.core.redis_client import get_redis
            import base64
            
            redis = await get_redis()
            
            # Кодируем файл в base64 для хранения в Redis
            file_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Сохраняем документ
            document_key = f"document:{document_id}"
            await redis.setex(
                document_key,
                86400 * 7,  # 7 дней
                json.dumps({
                    "data": file_base64,
                    "metadata": metadata,
                    "size": len(file_data)
                })
            )
            
            logger.info(f"✅ Qwen сохранил документ {document_id} в Redis")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при сохранении документа в Redis: {e}")
            raise
    
    async def get_document_from_redis(
        self,
        document_id: str
    ) -> Optional[Dict[str, any]]:
        """
        Получить документ из Redis
        Согласно архитектуре: Qwen → обращается в Redis → получает документ
        
        Args:
            document_id: ID документа
            
        Returns:
            Данные документа или None
        """
        try:
            from app.core.redis_client import get_redis
            import base64
            
            redis = await get_redis()
            
            document_key = f"document:{document_id}"
            data = await redis.get(document_key)
            
            if data:
                document_data = json.loads(data)
                # Декодируем файл
                file_data = base64.b64decode(document_data["data"])
                return {
                    "data": file_data,
                    "metadata": document_data.get("metadata", {}),
                    "size": document_data.get("size", 0)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Ошибка при получении документа из Redis: {e}")
            return None
    
    async def process_search_query(
        self,
        query: str,
        rag_service,
        db
    ) -> Dict[str, Any]:
        """
        Обработать поисковый запрос
        Согласно архитектуре: Qwen → RAG → Postgres → Qwen → Redis → ответ
        
        Args:
            query: Поисковый запрос
            rag_service: Экземпляр RAG сервиса
            db: Database session
            
        Returns:
            Результат поиска с ответом и документами
        """
        try:
            # Qwen обращается к RAG
            logger.info(f"Qwen обрабатывает поисковый запрос: {query}")
            logger.info(f"🔍 Qwen → RAG → Postgres: начинаю поиск документов...")
            
            # RAG обращается к Postgres - увеличиваем top_k для получения всех релевантных документов
            chunks = await rag_service.search_for_qwen(db, query, top_k=20)
            logger.info(f"✅ RAG → Postgres: найдено {len(chunks)} чанков")
            
            if not chunks:
                return {
                    "answer": "Не найдено релевантных документов.",
                    "documents": [],
                    "chunks": []
                }
            
            # Формируем контекст для ответа (используем больше чанков для лучшего контекста)
            context = "\n\n".join([
                f"Документ: {chunk['document_title']}\n{chunk['text'][:300]}"
                for chunk in chunks[:10]  # Используем топ-10 чанков для контекста
            ])
            
            # Генерируем ответ на основе контекста
            prompt = f"""На основе следующего контекста из документов ответь на вопрос пользователя.

Контекст:
{context}

Вопрос: {query}

Ответь кратко и по делу."""
            
            answer = self._generate_text(
                prompt=prompt,
                max_new_tokens=256,
                temperature=0.7
            )
            
            # Собираем ВСЕ уникальные документы из всех релевантных чанков
            seen_doc_ids = set()
            documents = []
            
            # Проходим по всем чанкам и собираем уникальные документы
            for chunk in chunks:
                doc_id = chunk["document_id"]
                
                # Пропускаем, если уже добавили этот документ
                if doc_id in seen_doc_ids:
                    continue
                
                seen_doc_ids.add(doc_id)
                
                # Пытаемся получить из Redis
                logger.debug(f"🔍 Qwen → Redis: проверяю документ {doc_id}")
                doc_data = await self.get_document_from_redis(doc_id)
                
                # Добавляем документ (даже если нет в Redis, используем данные из чанка)
                documents.append({
                    "document_id": doc_id,
                    "title": chunk["document_title"],
                    "type": chunk["document_type"],
                    "path": chunk.get("document_path"),
                    "available": doc_data is not None,
                    "similarity": chunk.get("similarity", 0.0)  # Добавляем similarity для сортировки
                })
                if doc_data:
                    logger.debug(f"✅ Qwen → Redis: документ {doc_id} найден в Redis")
                else:
                    logger.debug(f"⚠️ Qwen → Redis: документ {doc_id} не найден в Redis (используем данные из Postgres)")
            
            # Сортируем документы по similarity (релевантности)
            documents.sort(key=lambda x: x.get("similarity", 0.0), reverse=True)
            
            logger.info(f"✅ Qwen сформировал ответ на запрос, найдено {len(documents)} уникальных документов из {len(chunks)} чанков")
            
            return {
                "answer": answer,
                "documents": documents,  # Возвращаем ВСЕ найденные документы
                "chunks": chunks,
                "query": query
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке поискового запроса: {e}")
            return {
                "answer": f"Ошибка при обработке запроса: {e}",
                "documents": [],
                "chunks": []
            }
    
    def classify_document(self, text: str, filename: str = "") -> Dict[str, Any]:
        """Legacy method for direct classification"""
        try:
            self._ensure_model_loaded()
            return self._fallback_classify(text, filename)
        except Exception as e:
            logger.warning(f"Model not available, using fallback: {e}")
            return self._fallback_classify(text, filename)
    
    def _generate_text(
        self,
        prompt: str,
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> str:
        """Generate text using Qwen model"""
        if self._model is None or self._tokenizer is None:
            raise RuntimeError("Model not loaded")
        
        try:
            # Всегда используем CPU для генерации, чтобы избежать проблем с MPS
            original_device = next(self._model.parameters()).device
            model_on_cpu = self._model.to("cpu")
            
            inputs = self._tokenizer(
                prompt,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=2048
            )
            
            # Inputs всегда на CPU
            inputs = {k: v.to("cpu") for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = model_on_cpu.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=True,
                    pad_token_id=self._tokenizer.pad_token_id,
                    eos_token_id=self._tokenizer.eos_token_id
                )
            
            # Возвращаем модель на исходное устройство
            self._model = model_on_cpu.to(original_device)
            
            generated_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )
            
            if generated_text.startswith(prompt):
                generated_text = generated_text[len(prompt):].strip()
            
            return generated_text
            
        except Exception as e:
            logger.error(f"Ошибка при генерации текста: {e}")
            raise
    
    def _fallback_classify(self, text: str, filename: str) -> Dict[str, Any]:
        """Fallback classification based on keywords"""
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        doc_type = "scan"
        if any(word in text_lower for word in ["договор", "контракт", "соглашение"]):
            doc_type = "contract"
        elif any(word in text_lower for word in ["счет", "invoice", "счет-фактура"]):
            doc_type = "invoice"
        elif any(word in text_lower for word in ["акт", "приемки", "выполнения"]):
            doc_type = "act"
        elif any(word in text_lower for word in ["приказ", "распоряжение", "order"]):
            doc_type = "order"
        elif any(word in text_lower for word in ["письмо", "email", "сообщение"]):
            doc_type = "email"
        
        priority = "medium"
        if any(word in text_lower for word in ["срочно", "urgent", "важно", "important"]):
            priority = "high"
        elif any(word in text_lower for word in ["низкий", "low", "неважно"]):
            priority = "low"
        
        return {
            "type": doc_type,
            "counterparty_name": None,
            "date": None,
            "priority": priority,
            "description": f"Документ: {filename or 'без названия'}"
        }


# Singleton instance - создается при импорте, но модель НЕ загружается
# Модель загрузится только при первом вызове _ensure_model_loaded()
qwen_service = QwenService()
logger.debug("QwenService singleton created (model not loaded yet - lazy loading)")
