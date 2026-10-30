const processRow = (name = '', weight = '') => ({ id: crypto.randomUUID(), name, weight: String(weight) });

const TEMPLATES = {
  interior: [['철거', 10], ['설비·전기', 20], ['목공', 25], ['도장·도배', 20], ['바닥·타일', 15], ['마감·청소', 10]],
  facility: [['준비·철거', 15], ['배관', 45], ['기기 설치', 25], ['시험·마감', 15]],
  electric: [['준비', 10], ['배관·배선', 45], ['기구 설치', 30], ['점검·시험', 15]],
  construction: [['골조', 40], ['전기', 20], ['설비', 20], ['마감', 20]],
  repair: [['준비', 20], ['본 공사', 60], ['마무리', 20]],
};

export function defaultProcessRows(workType = '') {
  const value = workType.replace(/\s/g, '');
  const key = /\uc778\ud14c\ub9ac\uc5b4|\ub9ac\ubaa8\ub378\ub9c1|\ub3c4\ubc30|\ud0c0\uc77c|\ub3c4\uc7a5|\ubaa9\uacf5/.test(value)
    ? 'interior'
    : /\uc124\ube44|\ubc30\uad00|\ub0c9\ub09c\ubc29|\uc18c\ubc29/.test(value)
      ? 'facility'
      : /\uc804\uae30|\ud1b5\uc2e0|\uc870\uba85/.test(value)
        ? 'electric'
        : /\uc2e0\ucd95|\uac74\ucd95|\ud1a0\ubaa9|\ucca0\uadfc|\uace8\uc870/.test(value)
          ? 'construction'
          : 'repair';
  return TEMPLATES[key].map(([name, weight]) => processRow(name, weight));
}

export const processWeightSum = (rows) =>
  Math.round(rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0) * 10) / 10;

export function validateProcesses(rows) {
  if (!rows.length) return '공정을 하나 이상 추가해 주세요.';
  const names = new Set();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) return '공정 이름을 모두 입력해 주세요.';
    if (names.has(name)) return `공정 이름 '${name}'이(가) 겹쳐요.`;
    names.add(name);
    if (!(Number(row.weight) > 0)) return `'${name}'의 가중치를 입력해 주세요.`;
  }
  const sum = processWeightSum(rows);
  return Math.abs(sum - 100) <= 0.5 ? null : `가중치 합계가 100%가 되어야 해요. (현재 ${sum}%)`;
}

export const cleanProcesses = (rows) =>
  rows.map((row) => ({ name: row.name.trim(), weight: Number(row.weight) }));

export default function ProgressModeEditor({ mode, onModeChange, rows, onRowsChange, workType }) {
  const sum = processWeightSum(rows);
  const sumOk = Math.abs(sum - 100) <= 0.5;
  const update = (index, key, value) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const splitEvenly = () => {
    if (!rows.length) return;
    const each = Math.floor((100 / rows.length) * 10) / 10;
    onRowsChange(rows.map((row, index) => ({
      ...row,
      weight: String(index === rows.length - 1 ? 100 - each * (rows.length - 1) : each),
    })));
  };

  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-bold text-gray-900">진행률 계산 방식</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ['manual', '직접 입력', '보고서에서 현장 전체 진행률을 직접 입력합니다.'],
          ['auto', '자동 계산', '공정별 진행률과 가중치로 전체 진행률을 계산합니다.'],
        ].map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              onModeChange(value);
              if (value === 'auto' && !rows.length) onRowsChange(defaultProcessRows(workType));
            }}
            className={`rounded-xl border p-4 text-left ${mode === value ? 'border-ink-900 bg-gray-50' : 'border-line bg-white hover:bg-gray-50'}`}
          >
            <span className="text-[14px] font-bold text-gray-900">{title}</span>
            <span className="mt-1 block text-[11px] leading-5 text-gray-500">{description}</span>
          </button>
        ))}
      </div>

      {mode === 'auto' && (
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-bold text-gray-800">공정과 가중치</h3>
              <p className="mt-0.5 text-[11px] text-gray-500">가중치 합계를 100%로 맞춰 주세요.</p>
            </div>
            <strong className={`tabular text-[13px] ${sumOk ? 'text-ok' : 'text-bad'}`}>합계 {sum}%</strong>
          </div>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[24px_minmax(0,1fr)_90px_auto] items-center gap-2">
                <span className="text-center text-[12px] text-gray-400">{index + 1}</span>
                <input value={row.name} maxLength={30} onChange={(e) => update(index, 'name', e.target.value)} placeholder="공정 이름" className="min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900" />
                <label className="relative">
                  <input type="number" min="0.1" max="100" step="0.1" value={row.weight} onChange={(e) => update(index, 'weight', e.target.value)} className="tabular w-full rounded-lg border border-line bg-white px-2 py-2 pr-6 text-right text-[13px] outline-none focus:border-ink-900" />
                  <span className="absolute right-2 top-2 text-[12px] text-gray-400">%</span>
                </label>
                <button type="button" onClick={() => onRowsChange(rows.filter((_, i) => i !== index))} className="px-2 text-[12px] text-gray-400 hover:text-bad">삭제</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.length < 12 && <button type="button" onClick={() => onRowsChange([...rows, processRow()])} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold">+ 공정 추가</button>}
            <button type="button" onClick={() => onRowsChange(defaultProcessRows(workType))} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold">기본 공정 넣기</button>
            {!!rows.length && <button type="button" onClick={splitEvenly} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold">똑같이 나누기</button>}
          </div>
        </div>
      )}
    </div>
  );
}
