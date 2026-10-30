export const COMMON_MATERIALS = [
  { name: '철근', unit: '톤' },
  { name: '레미콘', unit: '㎥' },
  { name: '합판', unit: '장' },
  { name: '각재', unit: '본' },
  { name: '시멘트', unit: '포' },
  { name: '전선', unit: '롤' },
  { name: 'PVC관', unit: '본' },
  { name: '석고보드', unit: '장' },
];

const emptyRow = (preset = {}) => ({
  id: crypto.randomUUID(),
  name: preset.name ?? '',
  quantity: '',
  unit: preset.unit ?? '',
});

export default function MaterialRowsEditor({
  rows,
  onChange,
  disabled = false,
  presets = [],
  presetLabel = '자주 쓰는 자재',
  max = 50,
  onFull,
}) {
  const update = (index, key, value) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const remove = (index) => onChange(rows.filter((_, i) => i !== index));

  const add = (preset) => {
    if (rows.some((row) => row.name.trim() === preset?.name && row.unit.trim() === preset?.unit)) return;
    const blankIndex = rows.findIndex((row) => !row.name.trim());
    if (preset && blankIndex >= 0) {
      onChange(rows.map((row, index) => (index === blankIndex ? { ...row, name: preset.name, unit: preset.unit } : row)));
      return;
    }
    if (rows.length >= max) {
      onFull?.();
      return;
    }
    onChange([...rows, emptyRow(preset)]);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.id ?? index} className="grid grid-cols-[minmax(0,1fr)_90px_80px_auto] gap-2">
          <input
            value={row.name}
            onChange={(e) => update(index, 'name', e.target.value)}
            placeholder="자재명"
            disabled={disabled}
            className="min-w-0 rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-ink-900 disabled:bg-gray-50"
          />
          <input
            type="number"
            min="0"
            step="0.1"
            value={row.quantity}
            onChange={(e) => update(index, 'quantity', e.target.value)}
            placeholder="수량"
            disabled={disabled}
            className="tabular rounded-lg border border-line px-2 py-2 text-right text-[13px] outline-none focus:border-ink-900 disabled:bg-gray-50"
          />
          <input
            value={row.unit}
            onChange={(e) => update(index, 'unit', e.target.value)}
            placeholder="단위"
            disabled={disabled}
            className="rounded-lg border border-line px-2 py-2 text-[13px] outline-none focus:border-ink-900 disabled:bg-gray-50"
          />
          {!disabled && (
            <button type="button" onClick={() => remove(index)} className="px-2 text-[12px] text-gray-500 hover:text-bad">
              삭제
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => add()}
          className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
        >
          + 자재 추가
        </button>
      )}
      {!disabled && presets.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 text-[12px] text-gray-500">{presetLabel}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const selected = rows.some(
                (row) => row.name.trim() === preset.name && row.unit.trim() === preset.unit,
              );
              return (
                <button
                  key={`${preset.name}|${preset.unit}`}
                  type="button"
                  onClick={() => add(preset)}
                  disabled={selected}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {preset.name}
                  {preset.note && <span className="ml-1 font-normal text-gray-500">{preset.note}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function cleanMaterials(rows) {
  return rows
    .map((row) => ({ name: row.name.trim(), quantity: Number(row.quantity), unit: row.unit.trim() }))
    .filter((row) => row.name || row.unit || row.quantity > 0);
}
