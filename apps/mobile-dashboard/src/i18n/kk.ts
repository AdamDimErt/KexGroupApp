export default {
  // ─── Common ──────────────────────────────────────────────
  common: {
    loading: 'Жүктелуде...',
    error: 'Қате',
    retry: 'Қайталау',
    cancel: 'Болдырмау',
    save: 'Сақтау',
    back: 'Артқа',
    all: 'Барлығы',
    today: 'Бүгін',
    thisWeek: 'Осы апта',
    thisMonth: 'Осы ай',
    lastMonth: 'Өткен ай',
    custom: 'Ерікті',
    currency: '₸',
  },

  // ─── Auth ────────────────────────────────────────────────
  auth: {
    title: 'Жүйеге кіру',
    phoneLabel: 'Телефон нөмірі',
    phonePlaceholder: '+7 (___) ___-__-__',
    sendCode: 'Код алу',
    codeLabel: 'SMS коды',
    codePlaceholder: '______',
    verify: 'Растау',
    changeNumber: 'Нөмірді өзгерту',
    tooManyAttempts: 'Тым көп әрекет. 15 минуттан кейін қайталаңыз.',
    invalidCode: 'Қате код',
    sendError: 'Код жіберу қатесі',
  },

  // ─── Navigation ──────────────────────────────────────────
  nav: {
    dashboard: 'Басты бет',
    points: 'Нүктелер',
    reports: 'Есептер',
    notifications: 'Хабарламалар',
  },

  // ─── Dashboard ───────────────────────────────────────────
  dashboard: {
    title: 'KEX GROUP',
    totalRevenue: 'Жалпы түсім',
    expenses: 'Шығындар',
    financialResult: 'Қаржылық нәтиже',
    brands: 'Брендтер',
    restaurants: 'Мейрамханалар',
    lastSync: 'Соңғы синхрондау',
    syncError: 'Синхрондау қатесі',
  },

  // ─── Brand Detail ───────────────────────────────────────
  brand: {
    title: 'Бренд',
    revenue: 'Түсім',
    restaurants: 'Мейрамханалар',
    points: 'нүктелер',
  },

  // ─── Points (restaurants) ────────────────────────────────
  points: {
    title: 'Сауда нүктелері',
    revenue: 'Түсім',
    expenses: 'Шығындар',
    profit: 'Пайда',
    transactions: 'Транзакциялар',
    cash: 'Қолма-қол',
    kaspi: 'Kaspi QR',
    halyk: 'Halyk QR',
    yandex: 'Яндекс Еда',
    card: 'Карта',
    expenseGroups: 'Шығын топтары',
    cashDiscrepancy: 'Касса айырмашылықтары',
    expected: 'Күтілетін',
    actual: 'Нақты',
    difference: 'Айырмашылық',
  },

  // ─── Reports ─────────────────────────────────────────────
  reports: {
    title: 'Есептер',
    dds: 'ДДС есебі',
    kitchen: 'Цех есебі',
    trends: 'Трендтер',
    period: 'Кезең',
    total: 'Барлығы',
    shipments: 'Жөнелтулер',
    purchases: 'Сатып алулар',
    income: 'Кірістер',
  },

  // ─── Notifications ───────────────────────────────────────
  notifications: {
    title: 'Хабарламалар',
    empty: 'Хабарламалар жоқ',
    markAllRead: 'Барлығын оқу',
    syncFailure: 'Синхрондау қатесі',
    lowRevenue: 'Төмен түсім',
    largeExpense: 'Ірі шығын',
    dailySummary: 'Күнделікті қорытынды',
  },

  // ─── Cost Allocation ─────────────────────────────────────
  allocation: {
    direct: 'Тікелей шығындар',
    distributed: 'Бөлінген шығындар',
    coefficient: 'Коэффициент',
    originalAmount: 'Бастапқы сома',
    allocatedAmount: 'Бөлінген сома',
  },

  // ─── Settings ────────────────────────────────────────────
  settings: {
    logout: 'Шығу',
    logoutConfirm: 'Шығуды қалайсыз ба?',
    language: 'Тіл',
  },
} as const;
