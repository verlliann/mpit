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
import time
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
                logger.info("✅ Модель загружена, готова к использованию")
            except Exception as e:
                logger.error(f"❌ Failed to load Qwen model: {e}", exc_info=True)
                raise
    
    def get_memory_info(self) -> Dict[str, Any]:
        """Получить информацию об использовании памяти GPU"""
        info = {
            "model_loaded": self._model is not None,
            "tokenizer_loaded": self._tokenizer is not None,
        }
        
        if torch.cuda.is_available():
            info["cuda_available"] = True
            info["gpu_memory_allocated"] = f"{torch.cuda.memory_allocated() / 1024**3:.2f} GB"
            info["gpu_memory_reserved"] = f"{torch.cuda.memory_reserved() / 1024**3:.2f} GB"
            info["gpu_memory_total"] = f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB"
        else:
            info["cuda_available"] = False
        
        return info
    
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
        
        # Настройки для GPU vs CPU
        if device == "cuda":
            # Вычисляем максимальную память для модели (в байтах)
            max_memory_gb = settings.QWEN_MAX_MEMORY_PERCENT / 100.0
            total_memory_bytes = torch.cuda.get_device_properties(0).total_memory
            max_memory_bytes = int(total_memory_bytes * max_memory_gb)
            max_memory = {0: f"{max_memory_bytes // (1024**3)}GiB"}  # Формат для accelerate
            
            model_kwargs = {
                "dtype": torch.float16,  # Используем float16 для GPU (быстрее и меньше памяти)
                "device_map": "auto",  # Автоматическое распределение по GPU
                "max_memory": max_memory,  # Ограничение памяти для модели
                "trust_remote_code": True,
                "local_files_only": use_local,
                "torch_dtype": torch.float16,  # Явно указываем dtype для ускорения
            }
            logger.info(f"💾 Использование памяти GPU: {settings.QWEN_MAX_MEMORY_PERCENT}% для модели, {100 - settings.QWEN_MAX_MEMORY_PERCENT}% для буфера")
        else:
            model_kwargs = {
                "dtype": torch.float32,  # Always use float32 for CPU compatibility
                "device_map": None,  # Explicitly set to None for CPU
                "trust_remote_code": True,
                "local_files_only": use_local
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
                    trust_remote_code=True,
                    local_files_only=use_local
                )
            except (ImportError, Exception) as tokenizer_error:
                logger.warning(f"⚠️ Qwen2Tokenizer недоступен ({tokenizer_error}), пробуем AutoTokenizer...")
                # Fallback на AutoTokenizer
                self._tokenizer = AutoTokenizer.from_pretrained(
                    model_name,
                    trust_remote_code=True,
                    local_files_only=use_local
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
            
            # Проверяем на каком устройстве модель после загрузки
            if device == "cuda":
                # При device_map="auto" модель уже на GPU, проверяем
                try:
                    # Проверяем устройство первого параметра модели
                    first_param = next(self._model.parameters())
                    actual_device = first_param.device
                    logger.info(f"🔍 Модель загружена на устройстве: {actual_device}")
                    
                    if actual_device.type != "cuda":
                        logger.warning(f"⚠️ Модель не на GPU! Текущее устройство: {actual_device}, перемещаем на cuda...")
                        self._model = self._model.to("cuda")
                        logger.info("✅ Модель перемещена на cuda")
                    else:
                        logger.info(f"✅ Модель уже на GPU: {actual_device}")
                except Exception as e:
                    logger.warning(f"⚠️ Не удалось проверить устройство модели: {e}, пробуем переместить на cuda...")
                    try:
                        self._model = self._model.to("cuda")
                        logger.info("✅ Модель перемещена на cuda")
                    except Exception as move_error:
                        logger.error(f"❌ Не удалось переместить модель на cuda: {move_error}")
            elif device == "cpu":
                self._model = self._model.to("cpu")
                logger.info("✅ Модель на CPU")
            
            self._model.eval()  # Set to evaluation mode
            
            # Финальная проверка устройства
            try:
                final_device = next(self._model.parameters()).device
                logger.info(f"✅ Финальная проверка: модель на устройстве {final_device}")
            except Exception as e:
                logger.warning(f"⚠️ Не удалось проверить финальное устройство: {e}")
            
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
1. Тип документа (contract, invoice, act, order, email, scan, document, presentation, report)
2. Название организации-контрагента (если есть)
3. Дату документа (если есть)
4. Приоритет (high, medium, low)
5. Краткое описание (1-2 предложения)
6. Теги - выдели 3-7 ключевых слов/фраз, которые характеризуют документ (например: "договор", "поставка", "2024", "ООО Рога", "техническая документация")

Текст документа:
{text[:2000]}

Ответь в формате JSON:
{{
    "type": "тип документа",
    "counterparty_name": "название организации или null",
    "date": "YYYY-MM-DD или null",
    "priority": "high/medium/low",
    "description": "краткое описание",
    "tags": ["тег1", "тег2", "тег3"]
}}"""
        
        try:
            logger.info(f"🔄 Начинаю генерацию классификации для {filename}...")
            import asyncio
            import signal
            
            # Запускаем генерацию с таймаутом
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._generate_text,
                        prompt=prompt,
                        max_new_tokens=256,
                        temperature=0.3
                    ),
                    timeout=60.0  # 60 секунд таймаут
                )
                logger.info(f"✅ Генерация завершена для {filename}")
            except asyncio.TimeoutError:
                logger.error(f"⏱️ Таймаут генерации для {filename} (>60 сек), используем fallback")
                classification = self._fallback_classify(text, filename)
                return {
                    "classification": classification,
                    "processed": False,
                    "error": "Generation timeout",
                    "chunks_count": metrics.get("chunks_count", 0),
                    "text_length": metrics.get("text_length", 0)
                }
            
            # Parse JSON from response
            import re
            # Ищем JSON объект в ответе (может быть многострочным)
            json_match = re.search(r'\{.*?"tags".*?\}', response, re.DOTALL)
            if not json_match:
                # Пробуем найти любой JSON объект
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
            
            if json_match:
                try:
                    classification = json.loads(json_match.group())
                    # Убеждаемся, что tags - это список
                    if "tags" in classification and not isinstance(classification["tags"], list):
                        if isinstance(classification["tags"], str):
                            # Если теги в виде строки, разбиваем по запятым
                            classification["tags"] = [t.strip() for t in classification["tags"].split(",") if t.strip()]
                        else:
                            classification["tags"] = []
                    elif "tags" not in classification:
                        classification["tags"] = []
                except json.JSONDecodeError as e:
                    logger.warning(f"⚠️ Не удалось распарсить JSON ответ: {e}, используем fallback")
                    classification = self._fallback_classify(text, filename)
            else:
                classification = self._fallback_classify(text, filename)
                classification["tags"] = []
            
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
            # Используем больше чанков для лучшего покрытия всех документов
            chunks = await rag_service.search_for_qwen(db, query, top_k=30)
            logger.info(f"✅ RAG → Postgres: найдено {len(chunks)} чанков")
            
            if not chunks:
                return {
                    "answer": "Не найдено релевантных документов.",
                    "documents": [],
                    "chunks": []
                }
            
            # Формируем контекст для ответа (используем больше чанков для лучшего контекста)
            # Сортируем чанки по similarity для приоритета наиболее релевантных
            sorted_chunks = sorted(chunks, key=lambda x: x.get('similarity', 0.0), reverse=True)
            
            context = "\n\n".join([
                f"Документ: {chunk['document_title']} (релевантность: {chunk.get('similarity', 0.0):.3f})\n{chunk['text'][:400]}"
                for chunk in sorted_chunks[:10]  # Используем топ-10 наиболее релевантных чанков
            ])
            
            # Генерируем ответ на основе контекста с акцентом на релевантность
            prompt = f"""На основе следующего контекста из документов ответь на вопрос пользователя.

ВАЖНО: 
- Используй ТОЛЬКО документы, которые ДЕЙСТВИТЕЛЬНО относятся к запросу пользователя
- Игнорируй документы, которые не имеют отношения к запросу, даже если они есть в контексте
- Если ни один документ не релевантен, скажи что документы не найдены

Контекст из документов (отсортированы по релевантности):
{context}

Вопрос пользователя: {query}

Ответь кратко и точно. Если документ не относится к запросу, НЕ упоминай его.
Если релевантных документов нет, скажи "По вашему запросу документы не найдены"."""
            
            answer = self._generate_text(
                prompt=prompt,
                max_new_tokens=256,
                temperature=0.7
            )
            
            # Собираем уникальные документы из релевантных чанков
            # Группируем чанки по документам и берем максимальную similarity для каждого документа
            seen_doc_ids = {}
            documents = []
            
            # Проходим по всем чанкам и собираем уникальные документы с максимальной similarity
            for chunk in sorted_chunks:  # Используем уже отсортированные чанки
                doc_id = chunk["document_id"]
                similarity = chunk.get("similarity", 0.0)
                
                # Если документ уже добавлен, обновляем similarity если текущий чанк более релевантен
                if doc_id in seen_doc_ids:
                    if similarity > seen_doc_ids[doc_id].get("similarity", 0.0):
                        seen_doc_ids[doc_id]["similarity"] = similarity
                    continue
                
                # Пытаемся получить из Redis
                logger.debug(f"🔍 Qwen → Redis: проверяю документ {doc_id}")
                doc_data = await self.get_document_from_redis(doc_id)
                
                # Добавляем документ с максимальной similarity
                doc_info = {
                    "document_id": doc_id,
                    "title": chunk["document_title"],
                    "type": chunk["document_type"],
                    "path": chunk.get("document_path"),
                    "available": doc_data is not None,
                    "similarity": similarity
                }
                seen_doc_ids[doc_id] = doc_info
                documents.append(doc_info)
                
                if doc_data:
                    logger.debug(f"✅ Qwen → Redis: документ {doc_id} найден в Redis")
                else:
                    logger.debug(f"⚠️ Qwen → Redis: документ {doc_id} не найден в Redis (используем данные из Postgres)")
            
            # Сортируем документы по similarity (релевантности) - наиболее релевантные первыми
            documents.sort(key=lambda x: x.get("similarity", 0.0), reverse=True)
            
            # Фильтруем документы с очень низкой релевантностью
            # Используем более строгий порог (0.85) из-за высокой similarity между всеми документами
            # Также логируем similarity для отладки
            logger.info(f"📊 Найдено документов до фильтрации: {len(documents)}")
            for doc in documents:
                logger.info(f"  - {doc['title']}: similarity={doc.get('similarity', 0.0):.3f}")
            
            # Используем более строгий порог и берем только топ документы
            # Если есть документы с similarity > 0.9, берем только их
            high_relevance = [doc for doc in documents if doc.get("similarity", 0.0) >= 0.90]
            if high_relevance:
                filtered_documents = high_relevance
                logger.info(f"📊 Найдено документов с высокой релевантностью (similarity >= 0.90): {len(filtered_documents)}")
            else:
                # Если нет очень релевантных, берем топ-1 наиболее релевантный
                filtered_documents = documents[:1] if documents else []
                logger.info(f"⚠️ Нет документов с similarity >= 0.90, берем топ-1: {len(filtered_documents)}")
            
            documents = filtered_documents
            
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
        """Legacy method for direct classification - использует fallback для скорости"""
        # Используем fallback для быстрой классификации без генерации
        # Если нужна генерация, используйте classify_metrics_from_rag
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
            # Используем устройство на котором находится модель (GPU или CPU)
            device = next(self._model.parameters()).device
            logger.info(f"🚀 Генерация на устройстве: {device}")
            logger.info(f"📝 Длина промпта: {len(prompt)} символов, max_new_tokens: {max_new_tokens}")
            
            inputs = self._tokenizer(
                prompt,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=2048
            )
            
            # Inputs на том же устройстве что и модель
            inputs = {k: v.to(device) for k, v in inputs.items()}
            logger.info(f"🔄 Начинаю generate() на {device}...")
            
            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=True,
                    pad_token_id=self._tokenizer.pad_token_id,
                    eos_token_id=self._tokenizer.eos_token_id,
                    repetition_penalty=1.2
                )
            
            logger.info(f"✅ generate() завершен, длина вывода: {outputs.shape}")
            
            generated_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )
            
            # Убираем промпт из ответа
            if generated_text.startswith(prompt):
                generated_text = generated_text[len(prompt):].strip()
            
            # Убираем "думающий" режим Qwen3 (теги <think>)
            import re
            generated_text = re.sub(r'<think>.*?</think>', '', generated_text, flags=re.DOTALL)
            generated_text = re.sub(r'<\|.*?\|>', '', generated_text)  # Убираем спец. токены
            
            # Берем только первый абзац если есть повторения
            lines = generated_text.strip().split('\n')
            if lines:
                # Находим первую непустую строку
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('Answer:') and not line.startswith('Ответ:'):
                        generated_text = line
                        break
            
            return generated_text.strip()
            
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
        
        # Извлекаем простые теги из текста и названия файла
        from pathlib import Path
        fallback_tags = []
        if filename:
            # Добавляем расширение файла как тег
            file_ext = Path(filename).suffix.lower()
            if file_ext:
                fallback_tags.append(file_ext.replace('.', ''))
        # Добавляем тип документа как тег
        if doc_type != "scan":
            fallback_tags.append(doc_type)
        
        return {
            "type": doc_type,
            "counterparty_name": None,
            "date": None,
            "priority": priority,
            "description": f"Документ: {filename or 'без названия'}",
            "tags": fallback_tags
        }


# Singleton instance - создается при импорте, но модель НЕ загружается
# Модель загрузится только при первом вызове _ensure_model_loaded()
qwen_service = QwenService()
logger.debug("QwenService singleton created (model not loaded yet - lazy loading)")
