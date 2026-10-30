import { useEffect, useState } from 'react';
import { useSetSiteMaterials } from '../../hooks/queries/useSiteQueries';
import { useToast } from '../common/Toast';
import { formatDateTime } from '../../services/format';
import MaterialRowsEditor, { cleanMaterials, COMMON_MATERIALS } from './MaterialRowsEditor';

const asRows = (items = []) =>
  items.map((item, index) => ({ id: `${item.name}-${item.unit}-${index}`, ...item, quantity: String(item.quantity) }));

export default function SiteStockPanel({ site, editable = false }) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState(() => asRows(site.materials));
  const [error, setError] = useState(null);
  const save = useSetSiteMaterials(site.id);
  const toast = useToast();

  useEffect(() => {
    if (!editing) setRows(asRows(site.materials));
  }, [site.materials, editing]);

  const submit = () => {
    const materials = cleanMaterials(rows);
    const invalid = materials.find((m) => !m.name || !m.unit || !Number.isFinite(m.quantity) || m.quantity < 0);
    if (invalid) {
      setError('자재명·수량(0 이상)·단위를 모두 입력해 주세요.');
      return;
    }
    setError(null);
    save.mutate(materials, {
      onSuccess: () => {
        toast.show('현장 자재를 저장했어요.');
        setEditing(false);
      },
      onError: (e) => setError(e.message),
    });
  };

  const materials = site.materials ?? [];
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">현재 자재 재고</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">승인된 보고의 사용량만 자동으로 차감됩니다.</p>
        </div>
        {editable && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-[12px] font-semibold text-gray-700 hover:underline">
            {materials.length ? '재고 수정' : '자재 입력'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <MaterialRowsEditor
            rows={rows}
            onChange={setRows}
            presets={COMMON_MATERIALS}
            max={100}
            onFull={() => setError('자재는 100가지까지 등록할 수 있어요.')}
          />
          {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">
              취소
            </button>
            <button type="button" onClick={submit} disabled={save.isPending} className="rounded-lg bg-ink-900 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">
              {save.isPending ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : materials.length === 0 ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-3 text-[12px] text-gray-500">등록된 현장 자재가 없습니다.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          {materials.map((material) => (
            <div key={`${material.name}|${material.unit}`} className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-gray-800">{material.name}</p>
                {material.updatedAt && <p className="text-[10px] text-gray-500">갱신 {formatDateTime(material.updatedAt)}</p>}
              </div>
              <strong className={`tabular shrink-0 text-[14px] ${material.quantity <= 0 ? 'text-bad' : 'text-gray-900'}`}>
                {material.quantity.toLocaleString()} {material.unit}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1 rounded-lg bg-brand-soft px-3 py-2 text-[11px] text-[#725300]">
        <p>· 승인 대기·보완 요청 보고는 재고에서 차감되지 않습니다.</p>
        <p>· 승인된 보고 삭제 시 차감된 수량이 복원됩니다.</p>
        <p>· 자재 요청 승인은 재고 입고와 별도이며 자동으로 재고를 늘리지 않습니다.</p>
      </div>
    </section>
  );
}
