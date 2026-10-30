import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import Icon from '../../components/common/Icon';
import MaterialRowsEditor, { cleanMaterials, COMMON_MATERIALS } from '../../components/domain/MaterialRowsEditor';
import ProgressModeEditor, {
  cleanProcesses,
  defaultProcessRows,
  validateProcesses,
} from '../../components/domain/ProgressModeEditor';
import { useCreateSite } from '../../hooks/queries/useSiteQueries';
import { useToast } from '../../components/common/Toast';

const row = () => ({ id: crypto.randomUUID(), name: '', quantity: '', unit: '' });

export default function CreateSitePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateSite();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [workType, setWorkType] = useState('');
  const [progressMode, setProgressMode] = useState('manual');
  const [processes, setProcesses] = useState([]);
  const [materials, setMaterials] = useState([row()]);
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const stock = cleanMaterials(materials);
    if (!name.trim() || !address.trim()) return setError('현장명과 주소를 입력해 주세요.');
    const processError = progressMode === 'auto' ? validateProcesses(processes) : null;
    if (processError) return setError(processError);
    if (stock.some((m) => !m.name || !m.unit || !Number.isFinite(m.quantity) || m.quantity < 0)) {
      return setError('자재명·수량(0 이상)·단위를 모두 입력해 주세요.');
    }
    setError(null);
    create.mutate(
      {
        name: name.trim(),
        address: address.trim(),
        workType: workType.trim(),
        progressMode,
        processes: progressMode === 'auto' ? cleanProcesses(processes) : undefined,
        materials: stock,
      },
      {
        onSuccess: (site) => {
          toast.show(`현장을 만들었어요. 참여 코드 ${site.code}`);
          navigate(`/my/sites/${site.id}`);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const input = 'w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-ink-900';
  return (
    <form onSubmit={submit}>
      <Link to="/my" className="mb-2 inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800">
        <Icon name="left" size={14} /> 내 현장
      </Link>
      <PageHeader title="새 현장 만들기" subtitle="현장 정보와 초기 자재 재고를 함께 등록합니다." />
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="space-y-4 p-5">
          <label className="block text-[13px] font-semibold text-gray-700">현장명<input value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} placeholder="예) 한빛 오피스텔 신축공사" /></label>
          <label className="block text-[13px] font-semibold text-gray-700">주소<input value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} mt-1`} placeholder="예) 서울시 강남구…" /></label>
          <label className="block text-[13px] font-semibold text-gray-700">공사 종류<input value={workType} onChange={(e) => setWorkType(e.target.value)} className={`${input} mt-1`} placeholder="예) 신축, 리모델링" /></label>
        </Card>
        <Card className="p-5">
          <ProgressModeEditor
            mode={progressMode}
            onModeChange={setProgressMode}
            rows={processes}
            onRowsChange={setProcesses}
            workType={workType}
          />
          {progressMode === 'auto' && processes.length === 0 && (
            <button type="button" onClick={() => setProcesses(defaultProcessRows(workType))} className="mt-3 text-[12px] font-semibold text-gray-600 hover:underline">
              공사 종류에 맞는 기본 공정 불러오기
            </button>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-gray-900">초기 자재 재고 <span className="font-normal text-gray-500">(선택)</span></h2>
          <p className="mt-1 mb-3 text-[12px] text-gray-500">현재 보유량을 입력하면 승인된 보고의 사용량이 자동 차감됩니다.</p>
          <MaterialRowsEditor
            rows={materials}
            onChange={setMaterials}
            presets={COMMON_MATERIALS}
            max={100}
            onFull={() => setError('자재는 100가지까지 등록할 수 있어요.')}
          />
        </Card>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-[12px] text-bad">{error}</p>}
        <button type="submit" disabled={create.isPending} className="w-full rounded-lg bg-brand py-3 text-[14px] font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-50">
          {create.isPending ? '만드는 중…' : '현장 만들고 참여 코드 발급'}
        </button>
      </div>
    </form>
  );
}
