
import { Document, Counterparty } from './types';
import { FileText, Receipt, ScrollText, Mail, Image, Files } from 'lucide-react';

export const GLASS_STYLES = {
  // Level 1: Sidebar, Dashboard containers - Base layer
  panel: "bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm",
  
  // Level 2: Cards, Active elements - Middle layer
  card: "bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-lg",
  
  // Level 3: Modals, Slide-overs - Top layer
  modal: "bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl",
  
  // Interactive elements
  interactive: "hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 active:scale-95",
  
  // Inputs
  input: "bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/10 focus:bg-white/90 dark:focus:bg-slate-800/90 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 backdrop-blur-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 dark:text-white",
};

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    title: 'Договор №123/2025.pdf',
    type: 'contract',
    counterparty: 'ООО "Рога и Копыта"',
    date: '2025-01-15',
    priority: 'high',
    pages: 12,
    department: 'Юридический',
    status: 'processed',
    size: '2.4 MB',
    uploadedBy: 'Иванов А.А.',
    path: 's3://bucket/contracts/2025/01/doc-1.pdf',
    version: 3,
    isFavorite: true,
    tags: ['Важное', '2025'],
    description: 'Основной рамочный договор поставки на 2025 год. Согласован с финансовым директором.',
    history: [
      { id: 'h1', date: '2025-01-15T10:00:00', user: 'Иванов А.А.', action: 'Загружен документ', type: 'info' },
      { id: 'h2', date: '2025-01-15T10:05:00', user: 'Система', action: 'Автоматическое распознавание', type: 'info' },
      { id: 'h3', date: '2025-01-15T14:30:00', user: 'Петрова С.В.', action: 'Документ согласован', type: 'success' },
    ]
  },
  {
    id: 'doc-2',
    title: 'Счет на оплату 456.pdf',
    type: 'invoice',
    counterparty: 'ИП Иванов И.И.',
    date: '2025-01-14',
    priority: 'medium',
    pages: 1,
    department: 'Бухгалтерия',
    status: 'processing',
    size: '156 KB',
    uploadedBy: 'Петрова С.В.',
    path: 's3://bucket/invoices/2025/01/doc-2.pdf',
    version: 1,
    tags: ['Срочно', 'На оплату'],
    description: 'Оплата клининговых услуг за декабрь.',
    history: [
      { id: 'h4', date: '2025-01-14T09:15:00', user: 'Петрова С.В.', action: 'Загружен документ', type: 'info' },
      { id: 'h5', date: '2025-01-14T09:16:00', user: 'Система', action: 'Отправлен на распознавание', type: 'info' },
    ]
  },
  {
    id: 'doc-3',
    title: 'Акт выполненных работ 789.pdf',
    type: 'act',
    counterparty: 'ООО "Вектор"',
    date: '2025-01-10',
    priority: 'low',
    pages: 2,
    department: 'Бухгалтерия',
    status: 'review',
    size: '1.1 MB',
    uploadedBy: 'Сидоров К.К.',
    path: 's3://bucket/acts/2025/01/doc-3.pdf',
    version: 1,
    isArchived: true,
    tags: ['Q1'],
    description: 'Акт сверки за 1 квартал.',
    history: [
      { id: 'h6', date: '2025-01-10T16:00:00', user: 'Сидоров К.К.', action: 'Загружен документ', type: 'info' },
      { id: 'h7', date: '2025-01-11T10:00:00', user: 'Система', action: 'Обнаружено расхождение сумм', type: 'warning' },
    ]
  },
  {
    id: 'doc-4',
    title: 'Скан старого договора.jpg',
    type: 'scan',
    counterparty: 'Неизвестно',
    date: '2024-12-28',
    priority: 'medium',
    pages: 5,
    department: 'Архив',
    status: 'error',
    size: '5.2 MB',
    uploadedBy: 'Система',
    path: 's3://bucket/scans/2024/12/scan-99.jpg',
    version: 1,
    isDeleted: true,
    history: [
      { id: 'h8', date: '2024-12-28T12:00:00', user: 'Сканер #4', action: 'Автоматическая загрузка', type: 'info' },
      { id: 'h9', date: '2024-12-28T12:05:00', user: 'Система', action: 'Ошибка распознавания текста', type: 'danger' },
    ]
  },
  {
    id: 'doc-5',
    title: 'Письмо от ФНС.msg',
    type: 'email',
    counterparty: 'ФНС России',
    date: '2025-01-16',
    priority: 'high',
    pages: 3,
    department: 'Администрация',
    status: 'processed',
    size: '45 KB',
    uploadedBy: 'Иванов А.А.',
    path: 's3://bucket/email/2025/01/msg-1.msg',
    version: 1,
    isFavorite: true,
    tags: ['Налоги'],
    description: 'Требование о предоставлении документов.',
    history: [
      { id: 'h10', date: '2025-01-16T08:30:00', user: 'Email Bot', action: 'Импорт из почты', type: 'info' },
      { id: 'h11', date: '2025-01-16T08:35:00', user: 'Иванов А.А.', action: 'Установлен высокий приоритет', type: 'warning' },
    ]
  },
  {
    id: 'doc-6',
    title: 'Приказ о премировании.pdf',
    type: 'order',
    counterparty: 'Внутренний',
    date: '2025-01-09',
    priority: 'medium',
    pages: 4,
    department: 'HR',
    status: 'processed',
    size: '800 KB',
    uploadedBy: 'HR Отдел',
    path: 's3://bucket/orders/2025/01/ord-1.pdf',
    version: 1,
    tags: ['HR'],
    history: [
      { id: 'h12', date: '2025-01-09T11:00:00', user: 'Смирнова Е.Е.', action: 'Создан документ', type: 'info' },
    ]
  },
  {
    id: 'doc-7',
    title: 'Удаленный черновик.docx',
    type: 'contract',
    counterparty: 'ООО "Тест"',
    date: '2024-11-01',
    priority: 'low',
    pages: 8,
    department: 'Продажи',
    status: 'error',
    size: '12 KB',
    uploadedBy: 'Иванов А.А.',
    path: 's3://bucket/trash/draft.docx',
    version: 1,
    isDeleted: true,
    history: [
       { id: 'h13', date: '2024-11-01T10:00:00', user: 'Иванов А.А.', action: 'Загружен', type: 'info' },
       { id: 'h14', date: '2024-11-02T10:00:00', user: 'Иванов А.А.', action: 'Удален в корзину', type: 'danger' },
    ]
  },
  {
    id: 'doc-8',
    title: 'Архив 2023.zip',
    type: 'scan',
    counterparty: 'Разные',
    date: '2023-12-31',
    priority: 'low',
    pages: 0,
    department: 'Архив',
    status: 'processed',
    size: '156.2 MB',
    uploadedBy: 'Admin',
    path: 's3://bucket/archive/2023.zip',
    version: 1,
    isArchived: true,
    history: []
  }
];

export const MOCK_COUNTERPARTIES: Counterparty[] = [
  {
    id: 'cp-1',
    name: 'ООО "Рога и Копыта"',
    inn: '7701234567',
    kpp: '770101001',
    address: 'Москва, ул. Примерная, д. 1',
    email: 'info@rogaikopita.ru',
    phone: '+7 (495) 123-45-67',
    docCount: 156,
    trustScore: 92,
    activeContracts: 3,
    lastInteraction: '2025-01-15',
    type: ['contract', 'invoice']
  },
  {
    id: 'cp-2',
    name: 'ИП Иванов И.И.',
    inn: '5904567890',
    address: 'Пермь, ул. Ленина, д. 50',
    email: 'ivanov@ip.ru',
    phone: '+7 (342) 200-00-00',
    docCount: 43,
    trustScore: 78,
    activeContracts: 1,
    lastInteraction: '2025-01-14',
    type: ['invoice', 'act']
  }
];

export const CHART_DATA = [
  { name: '01.01', docs: 12 },
  { name: '03.01', docs: 5 },
  { name: '05.01', docs: 28 },
  { name: '07.01', docs: 15 },
  { name: '09.01', docs: 45 },
  { name: '11.01', docs: 32 },
  { name: '13.01', docs: 68 },
  { name: '15.01', docs: 54 },
];

export const ANALYTICS_WORKFLOW = [
  { name: 'Пн', incoming: 45, processed: 40 },
  { name: 'Вт', incoming: 52, processed: 48 },
  { name: 'Ср', incoming: 38, processed: 55 },
  { name: 'Чт', incoming: 65, processed: 60 },
  { name: 'Пт', incoming: 48, processed: 45 },
  { name: 'Сб', incoming: 12, processed: 10 },
  { name: 'Вс', incoming: 5, processed: 5 },
];

export const ANALYTICS_TYPES = [
  { name: 'Счета', value: 400 },
  { name: 'Договоры', value: 300 },
  { name: 'Акты', value: 300 },
  { name: 'Прочее', value: 200 },
];

export const DOC_ICONS = {
  contract: FileText,
  invoice: Receipt,
  act: ScrollText,
  order: Files,
  email: Mail,
  scan: Image,
};

export const STATUS_COLORS = {
  processed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  processing: 'text-blue-700 bg-blue-50 border-blue-200',
  review: 'text-amber-700 bg-amber-50 border-amber-200',
  error: 'text-red-700 bg-red-50 border-red-200',
};

export const STATUS_LABELS = {
  processed: 'Обработан',
  processing: 'В обработке',
  review: 'На проверке',
  error: 'Ошибка',
};

export const PRIORITY_STYLES = {
  high: 'text-red-700 bg-red-50 border-red-100',
  medium: 'text-amber-700 bg-amber-50 border-amber-100',
  low: 'text-slate-600 bg-slate-100 border-slate-200',
};

export const PRIORITY_LABELS = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export const TAG_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-purple-50 text-purple-700 border-purple-100',
  'bg-pink-50 text-pink-700 border-pink-100',
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
];

export const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
};
