import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../common/Card';
import { useToast } from '../common/Toast';
import ProgressModeEditor, { validateProcesses } from './ProgressModeEditor';
import { sitesApi } from '../../api/sitesApi';
import {
  useDeleteSite,
  useLinkCompany,
  useRegenerateCode,
  useSetProgressMode,
  useSetSiteLocation,
  useUnlinkCompany,
  useUpdateSite,
} from '../../hooks/queries/useSiteQueries';
import { PROGRESS_MODE } from '../../constants/enums';

// 현장 설정 (앱 '현장 설정'과 같음, 현장 총관리자 전용):
// 현장 정보 수정 · 참여 코드 재발급 · 진행률 계산 방식 · 현장 위치 · 본사 연결 · 현장 삭제

const inputCls = 'w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-ink-900';
const btnCls = 'rounded-lg bg-ink-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-ink-800 disabled:opacity-50';
const ghostCls = 'rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50';

function Section({ title, subtitle, children }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} className="pb-3" />
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

function Message({ error }) {
  return error ? <p className="mt-2 text-[12px] text-bad">{error}</p> : null;
}

export default function SiteSettingsPanel({ site }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <InfoSection site={site} />
        <ProgressSection site={site} />
      </div>
      <div className="space-y-4">
        <CodeSection site={site} />
        <LocationSection site={site} />
        <CompanySection site={site} />
        <DeleteSection site={site} />
      </div>
    </div>
  );
}

function InfoSection({ site }) {
  const [name, setName] = useState(site.name);
  const [address, setAddress] = useState(site.address);
  const [workType, setWorkType] = useState(site.workType ?? '');
  const [error, setError] = useState(null);
  const update = useUpdateSite(site.id);
  const toast = useToast();
  const changed = name !== site.name || address !== site.address || workType !== (site.workType ?? '');

  const save = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !workType.trim()) {
      setError('현장명, 주소, 공사 종류를 모두 입력해 주세요.');
      return;
    }
    setError(null);
    update.mutate(
      { name: name.trim(), address: address.trim(), workType: workType.trim() },
      { onSuccess: () => toast.show('현장 정보를 저장했어요.'), onError: (err) => setError(err.message) },
    );
  };

  return (
    <Section title="현장 정보">
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-gray-600">현장명</span>
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-gray-600">주소</span>
          <input value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-gray-600">공사 종류</span>
          <input value={workType} maxLength={50} onChange={(e) => setWorkType(e.target.value)} className={inputCls} />
        </label>
        <Message error={error} />
        <div className="flex justify-end">
          <button type="submit" disabled={!changed || update.isPending} className={btnCls}>
            {update.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </Section>
  );
}

function CodeSection({ site }) {
  const regen = useRegenerateCode(site.id);
  const toast = useToast();
  const [error, setError] = useState(null);

  const onRegenerate = () => {
    if (!window.confirm('참여 코드를 새로 발급할까요?\n지금 코드로는 더 이상 참여할 수 없어요. (이미 참여한 사람은 그대로)')) return;
    setError(null);
    regen.mutate(undefined, {
      onSuccess: (code) => toast.show(`새 참여 코드: ${code}`),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <Section title="참여 코드" subtitle="작업자는 이 6자리 코드로 앱·웹에서 현장에 참여해요.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <b className="tabular text-[26px] tracking-[0.2em] text-gray-900">{site.code ?? '------'}</b>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => site.code && navigator.clipboard?.writeText(site.code).then(() => toast.show('참여 코드를 복사했어요.'))}
            className={ghostCls}
          >
            복사
          </button>
          <button type="button" onClick={onRegenerate} disabled={regen.isPending} className={ghostCls}>
            {regen.isPending ? '발급 중…' : '재발급'}
          </button>
        </div>
      </div>
      <Message error={error} />
    </Section>
  );
}

function ProgressSection({ site }) {
  const [mode, setMode] = useState(site.progressMode ?? PROGRESS_MODE.MANUAL);
  // 이미 있는 공정은 key를 함께 보내야 공정별 진행률이 이어진다
  const [rows, setRows] = useState(() =>
    (site.processes ?? []).map((p) => ({ id: p.key, key: p.key, name: p.name, weight: String(p.weight) })),
  );
  const [error, setError] = useState(null);
  const save = useSetProgressMode(site.id);
  const toast = useToast();

  const submit = () => {
    if (mode === PROGRESS_MODE.AUTO) {
      const problem = validateProcesses(rows);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setError(null);
    const processes =
      mode === PROGRESS_MODE.AUTO
        ? rows.map((r) => ({ ...(r.key ? { key: r.key } : {}), name: r.name.trim(), weight: Number(r.weight) }))
        : [];
    save.mutate(
      { mode, processes },
      { onSuccess: () => toast.show('진행률 계산 방식을 저장했어요.'), onError: (err) => setError(err.message) },
    );
  };

  return (
    <Section title="진행률 계산 방식" subtitle="바꿔도 지금까지의 진행률에서 이어서 계산해요.">
      <ProgressModeEditor mode={mode} onModeChange={setMode} rows={rows} onRowsChange={setRows} workType={site.workType ?? ''} />
      <Message error={error} />
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={submit} disabled={save.isPending} className={btnCls}>
          {save.isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </Section>
  );
}

function LocationSection({ site }) {
  const save = useSetSiteLocation(site.id);
  const toast = useToast();
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const has = site.latitude != null && site.longitude != null;

  const saveHere = () => {
    if (!('geolocation' in navigator)) {
      setError('이 브라우저는 위치를 알 수 없어요.');
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        save.mutate(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          { onSuccess: () => toast.show('지금 위치를 현장 위치로 저장했어요.'), onError: (err) => setError(err.message) },
        );
      },
      (err) => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED ? '위치 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.' : '위치를 알 수 없어요.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const clear = () => {
    if (!window.confirm('저장한 현장 위치를 지울까요? 보고 위치 확인을 하지 않게 돼요.')) return;
    setError(null);
    save.mutate(null, { onSuccess: () => toast.show('현장 위치를 지웠어요.'), onError: (err) => setError(err.message) });
  };

  return (
    <Section title="현장 위치" subtitle="보고를 현장에서 1km 넘게 떨어진 곳에서 제출하면 검토 화면에 표시해요.">
      <p className="mb-3 text-[13px] text-gray-700">
        {has ? (
          <a
            href={`https://maps.google.com/?q=${site.latitude},${site.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            저장됨 · 지도에서 보기
          </a>
        ) : (
          '아직 저장하지 않았어요.'
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveHere} disabled={locating || save.isPending} className={btnCls}>
          {locating ? '위치 확인 중…' : '지금 위치로 저장'}
        </button>
        {has && (
          <button type="button" onClick={clear} disabled={save.isPending} className={ghostCls}>
            지우기
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">현장에 있을 때 눌러 주세요.</p>
      <Message error={error} />
    </Section>
  );
}

function CompanySection({ site }) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null); // 확인한 본사명
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const link = useLinkCompany(site.id);
  const unlink = useUnlinkCompany(site.id);
  const toast = useToast();

  const check = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('본사 코드 6자리를 입력해 주세요.');
      return;
    }
    setError(null);
    setChecking(true);
    try {
      setPreview(await sitesApi.previewCompany(code));
    } catch (err) {
      setPreview(null);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const connect = () => {
    setError(null);
    link.mutate(code, {
      onSuccess: () => {
        toast.show(`${preview}에 연결했어요.`);
        setCode('');
        setPreview(null);
      },
      onError: (err) => setError(err.message),
    });
  };

  const disconnect = () => {
    if (!window.confirm(`${site.hqName} 연결을 끊을까요?\n앞으로 이 현장의 보고는 본사 없이 현장 안에서만 검토해요.`)) return;
    setError(null);
    unlink.mutate(undefined, { onSuccess: () => toast.show('본사 연결을 끊었어요.'), onError: (err) => setError(err.message) });
  };

  return (
    <Section title="본사 연결" subtitle="연결하면 본사가 이 현장의 보고를 검토하고 자재 요청을 처리해요.">
      {site.hqName ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-bold text-gray-900">{site.hqName}</p>
          <button type="button" onClick={disconnect} disabled={unlink.isPending} className={ghostCls}>
            연결 끊기
          </button>
        </div>
      ) : (
        <p className="mb-3 text-[13px] text-gray-600">본사 없이 운영 중이에요.</p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setPreview(null);
          }}
          placeholder={site.hqName ? '다른 본사 코드 6자리' : '본사 코드 6자리'}
          aria-label="본사 코드"
          className={`${inputCls} tabular tracking-[0.15em]`}
        />
        <button type="button" onClick={check} disabled={checking} className={ghostCls}>
          {checking ? '확인 중…' : '확인'}
        </button>
      </div>
      {preview && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-[13px] text-gray-700">
            <b className="text-gray-900">{preview}</b>에 연결할까요?
          </p>
          <button type="button" onClick={connect} disabled={link.isPending} className={btnCls}>
            {link.isPending ? '연결 중…' : '연결'}
          </button>
        </div>
      )}
      <Message error={error} />
    </Section>
  );
}

function DeleteSection({ site }) {
  const remove = useDeleteSite(site.id);
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const onDelete = () => {
    const typed = window.prompt(
      `현장을 삭제하면 보고·사진·자재 요청이 모두 지워지고 되돌릴 수 없어요.\n삭제하려면 현장명을 그대로 입력해 주세요:\n${site.name}`,
    );
    if (typed == null) return;
    if (typed.trim() !== site.name) {
      setError('현장명이 맞지 않아요.');
      return;
    }
    setError(null);
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.show('현장을 삭제했어요.');
        navigate('/my', { replace: true });
      },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="rounded-xl border border-bad/30 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold text-gray-900">현장 삭제</p>
          <p className="mt-0.5 text-[12px] text-gray-500">보고·사진·자재 요청까지 모두 지워지고 되돌릴 수 없어요.</p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={remove.isPending}
          className="rounded-lg border border-bad/40 px-4 py-2 text-[13px] font-bold text-bad hover:bg-bad-soft disabled:opacity-50"
        >
          {remove.isPending ? '삭제 중…' : '현장 삭제'}
        </button>
      </div>
      <Message error={error} />
    </div>
  );
}
