import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../common/Card';
import Icon from '../common/Icon';
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

// 저장 안 한 변경 사항: 바뀐 섹션이 저장 함수를 등록하고, 다른 화면·탭으로 넘어갈 때 저장할지 묻는다
const UnsavedContext = createContext(null);

function useUnsaved(key, dirty, save) {
  const ctx = useContext(UnsavedContext);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    ctx.set(key, dirty ? () => saveRef.current() : null);
    return () => ctx.set(key, null);
  }, [ctx, key, dirty]);
}

// guardRef: 부모(현장 상세)의 탭 이동도 같은 확인을 거치게 넘겨주는 함수 자리
export default function SiteSettingsPanel({ site, guardRef }) {
  const saves = useRef({});
  const skip = useRef(false); // 현장 삭제처럼 묻지 않고 떠나야 할 때
  const [dirtyCount, setDirtyCount] = useState(0);
  const [tabLeave, setTabLeave] = useState(null); // 탭 이동 대기
  const [saving, setSaving] = useState(false);
  const dirty = dirtyCount > 0;

  const ctx = useMemo(
    () => ({
      set(key, save) {
        if (save) saves.current[key] = save;
        else delete saves.current[key];
        setDirtyCount(Object.keys(saves.current).length);
      },
      leaveWithoutAsking() {
        skip.current = true;
      },
    }),
    [],
  );

  // 다른 화면으로 이동(메뉴·링크·뒤로 가기). 로그아웃은 막지 않는다
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !skip.current && currentLocation.pathname !== nextLocation.pathname && nextLocation.pathname !== '/login',
  );

  // 새로고침·창 닫기는 브라우저 기본 확인 창
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const guard = useCallback((proceed) => (dirty ? setTabLeave(() => proceed) : proceed()), [dirty]);
  useEffect(() => {
    if (!guardRef) return undefined;
    guardRef.current = guard;
    return () => {
      guardRef.current = null;
    };
  }, [guardRef, guard]);

  const leaving =
    blocker.state === 'blocked'
      ? { proceed: () => blocker.proceed(), stay: () => blocker.reset() }
      : tabLeave
        ? {
            proceed: () => {
              setTabLeave(null);
              tabLeave();
            },
            stay: () => setTabLeave(null),
          }
        : null;

  const saveAndLeave = async () => {
    setSaving(true);
    let ok = true;
    for (const save of Object.values(saves.current)) {
      // 하나라도 실패하면 이동하지 않고 그 섹션에 오류를 보여 준다
      if (!(await save())) ok = false;
    }
    setSaving(false);
    if (ok) leaving.proceed();
    else leaving.stay();
  };

  return (
    <UnsavedContext.Provider value={ctx}>
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
      {leaving && <UnsavedDialog saving={saving} onSave={saveAndLeave} onDiscard={leaving.proceed} onStay={leaving.stay} />}
    </UnsavedContext.Provider>
  );
}

function UnsavedDialog({ saving, onSave, onDiscard, onStay }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onStay();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onStay]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      onClick={() => !saving && onStay()}
    >
      <div className="w-full max-w-[380px] rounded-2xl bg-white px-6 pt-7 pb-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn">
          <Icon name="alert" size={24} strokeWidth={2.2} />
        </span>
        <h2 id="unsaved-title" className="mt-4 text-[22px] font-extrabold tracking-tight text-gray-900">
          변경 사항을 저장할까요?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
          현장 설정에서 바꾼 내용이
          <br />
          아직 저장되지 않았어요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg bg-gray-100 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
          >
            저장 안 함
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-ink-900 py-2.5 text-[14px] font-bold text-white hover:bg-ink-800 disabled:opacity-60"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
        <button
          type="button"
          onClick={onStay}
          disabled={saving}
          className="mt-3 text-[13px] font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-60"
        >
          계속 수정하기
        </button>
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

  const save = async () => {
    if (!name.trim() || !address.trim() || !workType.trim()) {
      setError('현장명, 주소, 공사 종류를 모두 입력해 주세요.');
      return false;
    }
    setError(null);
    try {
      await update.mutateAsync({ name: name.trim(), address: address.trim(), workType: workType.trim() });
      toast.show('현장 정보를 저장했어요.');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  useUnsaved('info', changed, save);

  return (
    <Section title="현장 정보">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-3"
      >
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
  const savedMode = site.progressMode ?? PROGRESS_MODE.MANUAL;
  const changed =
    mode !== savedMode || (mode === PROGRESS_MODE.AUTO && processSignature(rows) !== processSignature(site.processes ?? []));

  const submit = async () => {
    if (mode === PROGRESS_MODE.AUTO) {
      const problem = validateProcesses(rows);
      if (problem) {
        setError(problem);
        return false;
      }
    }
    setError(null);
    const processes =
      mode === PROGRESS_MODE.AUTO
        ? rows.map((r) => ({ ...(r.key ? { key: r.key } : {}), name: r.name.trim(), weight: Number(r.weight) }))
        : [];
    try {
      await save.mutateAsync({ mode, processes });
      toast.show('진행률 계산 방식을 저장했어요.');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  useUnsaved('progress', changed, submit);

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

// 공정 이름·가중치·순서가 같으면 바뀌지 않은 것으로 본다
function processSignature(list) {
  return JSON.stringify(list.map((p) => [String(p.name ?? '').trim(), Number(p.weight)]));
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

  const connect = async () => {
    setError(null);
    try {
      await link.mutateAsync(code);
      toast.show(`${preview}에 연결했어요.`);
      setCode('');
      setPreview(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  // 확인한 본사가 있으면 연결, 아직 확인 전이면 확인만 하고 머문다(어느 본사인지 보고 연결하도록)
  useUnsaved('company', code !== '', async () => {
    if (preview) return connect();
    await check();
    return false;
  });

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
  const unsaved = useContext(UnsavedContext);
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
        unsaved.leaveWithoutAsking();
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
