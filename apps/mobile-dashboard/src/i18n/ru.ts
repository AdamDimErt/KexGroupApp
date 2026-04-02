export default {
  // ─── Common ──────────────────────────────────────────────
  common: {
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    cancel: 'Отмена',
    save: 'Сохранить',
    back: 'Назад',
    all: 'Все',
    today: 'Сегодня',
    thisWeek: 'Эта неделя',
    thisMonth: 'Этот месяц',
    lastMonth: 'Прошлый месяц',
    custom: 'Произвольный',
    currency: '₸',
  },

  // ─── Auth ────────────────────────────────────────────────
  auth: {
    title: 'Вход в систему',
    phoneLabel: 'Номер телефона',
    phonePlaceholder: '+7 (___) ___-__-__',
    sendCode: 'Получить код',
    codeLabel: 'Код из SMS',
    codePlaceholder: '______',
    verify: 'Подтвердить',
    changeNumber: 'Изменить номер',
    tooManyAttempts: 'Слишком много попыток. Попробуйте через 15 минут.',
    invalidCode: 'Неверный код',
    sendError: 'Ошибка отправки кода',
  },

  // ─── Navigation ──────────────────────────────────────────
  nav: {
    dashboard: 'Главная',
    points: 'Точки',
    reports: 'Отчёты',
    notifications: 'Уведомления',
  },

  // ─── Dashboard ───────────────────────────────────────────
  dashboard: {
    title: 'KEX GROUP',
    totalRevenue: 'Общая выручка',
    expenses: 'Расходы',
    financialResult: 'Финансовый результат',
    brands: 'Бренды',
    restaurants: 'Рестораны',
    lastSync: 'Последняя синхронизация',
    syncError: 'Ошибка синхронизации',
  },

  // ─── Brand Detail ───────────────────────────────────────
  brand: {
    title: 'Бренд',
    revenue: 'Выручка',
    restaurants: 'Рестораны',
    points: 'точек',
  },

  // ─── Points (restaurants) ────────────────────────────────
  points: {
    title: 'Торговые точки',
    revenue: 'Выручка',
    expenses: 'Расходы',
    profit: 'Прибыль',
    transactions: 'Транзакции',
    cash: 'Наличные',
    kaspi: 'Kaspi QR',
    halyk: 'Halyk QR',
    yandex: 'Яндекс Еда',
    card: 'Карта',
    expenseGroups: 'Группы расходов',
    cashDiscrepancy: 'Расхождения по кассе',
    expected: 'Ожидаемая',
    actual: 'Фактическая',
    difference: 'Разница',
  },

  // ─── Reports ─────────────────────────────────────────────
  reports: {
    title: 'Отчёты',
    dds: 'Отчёт ДДС',
    kitchen: 'Отчёт по цеху',
    trends: 'Тренды',
    period: 'Период',
    total: 'Итого',
    shipments: 'Отгрузки',
    purchases: 'Закупки',
    income: 'Доходы',
  },

  // ─── Notifications ───────────────────────────────────────
  notifications: {
    title: 'Уведомления',
    empty: 'Нет уведомлений',
    markAllRead: 'Прочитать все',
    syncFailure: 'Ошибка синхронизации',
    lowRevenue: 'Низкая выручка',
    largeExpense: 'Крупный расход',
    dailySummary: 'Дневная сводка',
  },

  // ─── Cost Allocation ─────────────────────────────────────
  allocation: {
    direct: 'Прямые расходы',
    distributed: 'Распределённые расходы',
    coefficient: 'Коэффициент',
    originalAmount: 'Исходная сумма',
    allocatedAmount: 'Распределённая сумма',
  },

  // ─── Settings ────────────────────────────────────────────
  settings: {
    logout: 'Выйти',
    logoutConfirm: 'Вы уверены, что хотите выйти?',
    language: 'Язык',
  },
} as const;
