import type { Lang } from './i18n'

/** Short definitions shown on hover/click inside question text. Keys are regexes (case-insensitive, word-bounded). */
export interface Term {
  match: RegExp
  ru: string
  en: string
}

const T = (src: string, ru: string, en: string): Term => ({ match: new RegExp(`(?<![\\p{L}\\d])(?:${src})(?![\\p{L}\\d])`, 'iu'), ru, en })

export const TERMS: Term[] = [
  T('EVM|освоенн\\p{L}+ объ[её]м\\p{L}*|earned value', 'Управление освоенным объёмом — метод измерения прогресса по стоимости: сравнивает план (PV), выполненную работу (EV) и фактические затраты (AC).', 'Earned Value Management — measures progress in money terms by comparing planned value (PV), earned value (EV) and actual cost (AC).'),
  T('EV|ЗС', 'Earned Value — освоенный объём: стоимость фактически выполненной работы по плановым ценам.', 'Earned Value — the budgeted value of the work actually completed.'),
  T('PV', 'Planned Value — плановый объём: стоимость работы, которую планировалось выполнить к этому моменту.', 'Planned Value — the budgeted value of the work scheduled to be done by now.'),
  T('AC|ФС', 'Actual Cost — фактическая стоимость выполненной работы.', 'Actual Cost — what the completed work actually cost.'),
  T('SPI', 'Schedule Performance Index = EV ÷ PV. Меньше 1 — отставание от графика, больше 1 — опережение.', 'Schedule Performance Index = EV ÷ PV. Below 1 — behind schedule, above 1 — ahead.'),
  T('CPI', 'Cost Performance Index = EV ÷ AC. Меньше 1 — перерасход, больше 1 — экономия.', 'Cost Performance Index = EV ÷ AC. Below 1 — over budget, above 1 — under budget.'),
  T('SV', 'Schedule Variance = EV − PV. Отрицательное — отставание от графика.', 'Schedule Variance = EV − PV. Negative means behind schedule.'),
  T('CV', 'Cost Variance = EV − AC. Отрицательное — перерасход бюджета.', 'Cost Variance = EV − AC. Negative means over budget.'),
  T('SME|МСП|мал\\p{L}+ и средн\\p{L}+ (?:предприяти\\p{L}+|бизнес\\p{L}*)', 'Subject Matter Expert — профильный эксперт, носитель ключевых знаний (в русских переводах экзамена часто ошибочно «малое и среднее предприятие»).', 'Subject Matter Expert — a specialist with key domain knowledge.'),
  T('ИСР|WBS|иерархическ\\p{L}+ структур\\p{L}+ работ', 'Иерархическая структура работ (WBS) — разбиение всего объёма проекта на управляемые пакеты работ.', 'Work Breakdown Structure — hierarchical decomposition of the total project scope into work packages.'),
  T('PMO|ОУП|офис\\p{L}* управления проект\\p{L}+', 'Project Management Office — подразделение, которое задаёт стандарты, методологию и поддерживает руководителей проектов.', 'Project Management Office — the unit that sets standards and methodology and supports project managers.'),
  T('бэклог\\p{L}*|backlog', 'Бэклог — упорядоченный по ценности список работы (пользовательских историй), которую предстоит сделать.', 'Backlog — the ordered list of work (user stories) still to be done, prioritised by value.'),
  T('спринт\\p{L}*|sprint', 'Спринт — фиксированный короткий цикл (1–4 недели), за который команда выпускает готовый инкремент продукта.', 'Sprint — a fixed, short iteration (1–4 weeks) producing a usable product increment.'),
  T('ретроспектив\\p{L}*|retrospective', 'Ретроспектива — встреча команды в конце итерации: что улучшить в процессе работы.', 'Retrospective — the end-of-iteration meeting where the team decides how to improve its process.'),
  T('стори-?пойнт\\p{L}*|story points?|сюжетн\\p{L}+ пункт\\p{L}+|оч\\p{L}+ истори\\p{L}*', 'Стори-пойнт — относительная оценка объёма/сложности пользовательской истории в agile.', 'Story point — a relative estimate of the size/complexity of a user story in agile.'),
  T('запрос\\p{L}* на изменени\\p{L}+|change request', 'Запрос на изменение — формальное предложение изменить объём, график, бюджет или документы; проходит интегрированный контроль изменений.', 'Change request — a formal proposal to change scope, schedule, cost or documents; goes through integrated change control.'),
  T('базов\\p{L}+ (?:план\\p{L}*|график\\p{L}*|уров\\p{L}+)|baseline', 'Базовый план — утверждённая версия объёма, графика или бюджета, с которой сравнивают факт; меняется только через контроль изменений.', 'Baseline — the approved version of scope, schedule or cost against which performance is measured; changed only via change control.'),
  T('устав\\p{L}* проекта|project charter', 'Устав проекта — документ, который официально авторизует проект и даёт руководителю полномочия.', 'Project charter — the document that formally authorises the project and gives the PM authority.'),
  T('заинтересованн\\p{L}+ сторон\\p{L}*|стейкхолдер\\p{L}*|stakeholders?', 'Стейкхолдеры — все, кто влияет на проект или на кого он влияет: спонсор, заказчик, команда, пользователи, регуляторы.', 'Stakeholders — anyone who affects or is affected by the project: sponsor, customer, team, users, regulators.'),
  T('спонсор\\p{L}*|sponsor', 'Спонсор — человек или группа, которые финансируют проект и отвечают за его успех на уровне руководства.', 'Sponsor — the person or group providing resources and executive support for the project.'),
  T('критическ\\p{L}+ пут\\p{L}+|critical path', 'Критический путь — самая длинная цепочка зависимых задач; её задержка сдвигает весь проект.', 'Critical path — the longest chain of dependent activities; any delay on it delays the project.'),
  T('контрольн\\p{L}+ точк\\p{L}+|веха\\p{L}*|milestone', 'Контрольная точка (веха) — значимое событие в графике с нулевой длительностью.', 'Milestone — a significant point or event in the schedule with zero duration.'),
  T('извлеч[её]нн\\p{L}+ урок\\p{L}*|lessons learned', 'Извлечённые уроки — знания, полученные в ходе проекта, фиксируемые для улучшения текущей и будущей работы.', 'Lessons learned — knowledge gained during the project, recorded to improve current and future work.'),
  T('RACI', 'Матрица RACI — кто Responsible (делает), Accountable (отвечает), Consulted (консультирует), Informed (информируется).', 'RACI matrix — who is Responsible, Accountable, Consulted and Informed for each task.'),
  T('servant leadership|служащ\\p{L}+ лидерств\\p{L}*', 'Servant leadership — стиль, при котором руководитель служит команде: убирает препятствия, защищает, развивает.', 'Servant leadership — the leader serves the team: removes impediments, protects and grows people.'),
  T('гибридн\\p{L}+|hybrid', 'Гибридный подход — сочетание предиктивного (водопад) и адаптивного (agile) подходов в одном проекте.', 'Hybrid approach — a mix of predictive (waterfall) and adaptive (agile) methods in one project.'),
  T('метод\\p{L}* номинальн\\p{L}+ групп\\p{L}*|nominal group', 'Метод номинальной группы — идеи подаются письменно и ранжируются голосованием, чтобы уравнять участников.', 'Nominal group technique — ideas are submitted individually and ranked by vote so every voice counts equally.'),
  T('аналогов\\p{L}+ оцен\\p{L}+|analogous estimat\\w+', 'Аналоговая оценка — быстрая оценка по похожим прошлым проектам с корректировками.', 'Analogous estimating — a quick estimate based on similar past projects, adjusted for differences.'),
  T('параметрическ\\p{L}+ оцен\\p{L}+|parametric estimat\\w+', 'Параметрическая оценка — расчёт через статистическую зависимость (например, стоимость за единицу × объём).', 'Parametric estimating — a statistical relationship (e.g., unit cost × quantity).'),
  T('тр[её]хточечн\\p{L}+|three-point', 'Трёхточечная оценка — среднее из оптимистичной, наиболее вероятной и пессимистичной оценок.', 'Three-point estimate — combines optimistic, most likely and pessimistic estimates.'),
]

export function termText(t: Term, lang: Lang) {
  return lang === 'en' ? t.en : t.ru
}
