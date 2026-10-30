import { useState } from 'react';
import { useCreateMaterialRequest } from '../../hooks/queries/useMyQueries';
import { useToast } from '../common/Toast';
import MaterialRowsEditor, { cleanMaterials, COMMON_MATERIALS } from './MaterialRowsEditor';

const row = () => ({ id: crypto.randomUUID(), name: '', quantity: '', unit: '' });

export default function MaterialRequestForm({ site, onCreated }) {
  const [rows, setRows] = useState([row()]);
  const [neededBy, setNeededBy] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const create = useCreateMaterialRequest(site.id);
  const toast = useToast();

  const submit = (event) => {
    event.preventDefault();
    const items = cleanMaterials(rows);
    if (!items.length || items.some((item) => !item.name || !item.unit || !(item.quantity > 0))) {
      setError('자재명·수량(0 초과)·단위를 모두 입력해 주세요.');
      return;
    }
    setError(null);
    create.mutate(
      { processKey: null, items, neededBy: neededBy || null, urgent, note: note.trim() },
      {
        onSuccess: (created) => {
          toast.show(created.status === 'approved' ? '현장 관리자 요청으로 바로 승인됐어요.' : '자재 요청을 보냈어요.');
          setRows([row()]);
          setNeededBy('');
          setUrgent(false);
          setNote('');
          onCreated?.(created);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">새 자재 요청</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">필요한 자재를 입력하면 현장 관리자 또는 본사가 확인합니다.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-bad-soft px-3 py-1.5 text-[12px] font-semibold text-bad">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          긴급 요청
        </label>
      </div>

      <div className="mt-4">
        <MaterialRowsEditor
          rows={rows}
          onChange={setRows}
          presets={COMMON_MATERIALS}
          max={50}
          onFull={() => setError('자재는 한 번에 50가지까지 요청할 수 있어요.')}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="text-[12px] font-semibold text-gray-700">
          필요일 <span className="font-normal text-gray-400">(선택)</span>
          <input type="date" min={new Date().toISOString().slice(0, 10)} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-ink-900" />
        </label>
        <label className="text-[12px] font-semibold text-gray-700">
          요청 메모 <span className="font-normal text-gray-400">(선택)</span>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="사용 위치, 반입 시간, 하차 장소 등" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-ink-900" />
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-[12px] text-bad">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={create.isPending} className="rounded-lg bg-ink-900 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-gray-800 disabled:opacity-50">
          {create.isPending ? '요청하는 중…' : '자재 요청 보내기'}
        </button>
      </div>
    </form>
  );
}
