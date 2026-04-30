/**
 * Утилиты для работы с временными рядами (sparkline / charts).
 *
 * ОСНОВНАЯ ПРОБЛЕМА которую решаем:
 * Sparkline на дашборде показывает дневную выручку. Если выбранный период
 * включает СЕГОДНЯ, то последняя точка ряда — это накопительная выручка
 * за неполный день (например, в 13:00 у нас только утро + начало обеда).
 * Эта точка визуально «проваливается» относительно полных предыдущих дней
 * → пользователь думает что бизнес упал, хотя это просто день ещё идёт.
 *
 * Решение: исключать сегодняшнюю точку из графика, если она последняя
 * и за неё накоплено существенно меньше среднего (день не закрыт).
 */

export interface DailyPoint {
  date: string;
  revenue: number;
  transactions?: number;
}

/** YYYY-MM-DD в локальной таймзоне. */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Если последняя точка в ряду — сегодня, отрезаем её.
 * Возвращает чистый ряд + флаг что точка была отрезана + её значение.
 *
 * Примечание: мы НЕ применяем эвристику «revenue < 60% от среднего»,
 * потому что:
 *   1) для большой сети средний день и текущий час дня могут различаться сильно
 *      (например, в 23:00 уже почти полный день, в 9:00 — почти ноль)
 *   2) предсказуемый detеrministic-фильтр лучше чем хитрая эвристика
 *
 * Пользователь увидит подпись «без сегодня (день в работе)» если что-то отрезали.
 */
export function excludeTodayPartial<T extends DailyPoint>(points: T[]): {
  points: T[];
  todayDropped: boolean;
  todayValue: number | null;
} {
  if (!points || points.length === 0) {
    return { points: [], todayDropped: false, todayValue: null };
  }
  const today = todayISO();
  const last = points[points.length - 1];
  // Date может приходить в ISO с временем (2026-04-28T00:00:00Z) — берём первые 10 символов
  const lastDate = (last.date ?? "").slice(0, 10);
  if (lastDate === today) {
    return {
      points: points.slice(0, -1),
      todayDropped: true,
      todayValue: last.revenue,
    };
  }
  return { points, todayDropped: false, todayValue: null };
}
