import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import Icon from '../../components/common/Icon';
import { EmptyState, LoadingBlock } from '../../components/common/StateViews';
import { useToast } from '../../components/common/Toast';
import { useMySites, useCreateReport } from '../../hooks/queries/useMyQueries';
import { useSite } from '../../hooks/queries/useSiteQueries';
import { useGeolocation } from '../../hooks/useGeolocation';
import {
  PROGRESS_MODE,
  REPORT_DOC_ACCEPT,
  REPORT_LIMITS,
  REPORT_PHOTO_ACCEPT,
  WEATHER_LABEL,
} from '../../constants/enums';
import { formatPercent, workLines } from '../../services/format';

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 서버 spring.servlet.multipart.max-file-size
const PHOTO_EXT = /\.(jpe?g|png|webp|heic)$/i;
const DOC_EXT = /\.(pdf|xlsx?|csv|hwpx?|docx?|pptx?|txt|zip)$/i;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const r1 = (v) => Math.round(v * 10) / 10;
const sizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`);

function Section({ step, title, hint, children }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[12px] font-bold text-white">
          {step}
        </span>
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
        {hint && <p className="text-[12px] text-gray-500">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

function StepButtons({ value, min, onChange }) {
  return (
    <div className="flex gap-1.5">
      {[1, 5, 10].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(r1(clamp(value + d, min, 100)))}
          className="tabular rounded-lg border border-line px-3 py-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50"
        >
          +{d}
        </button>
      ))}
    </div>
  );
}

// 보고 작성 (앱 보고 화면과 같은 흐름 → POST /api/sites/{id}/reports)
export default function ReportFormPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: sites = [], isPending: sitesPending } = useMySites();
  const siteId = params.get('site') ?? '';
  const { data: site, isPending: sitePending } = useSite(siteId || null);
  const geo = useGeolocation();
  const create = useCreateReport();

  const [work, setWork] = useState('');
  const [photos, setPhotos] = useState([]); // { id, file, url }
  const [files, setFiles] = useState([]); // File[]
  const [to, setTo] = useState(null); // 직접 입력 현장
  const [processKey, setProcessKey] = useState(null); // 자동 계산 현장
  const [processTo, setProcessTo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [workers, setWorkers] = useState('');
  const [equipment, setEquipment] = useState('');
  const [memo, setMemo] = useState('');
  const [tried, setTried] = useState(false); // 한 번 제출을 시도한 뒤부터 입력할 때마다 다시 검사
  const [serverError, setServerError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const photoInput = useRef(null);
  const fileInput = useRef(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const isAuto = site?.progressMode === PROGRESS_MODE.AUTO;
  const current = site?.overallProgress ?? 0;
  const process = site?.processes?.find((p) => p.key === processKey);

  // 현장이 바뀌면 진행률 입력값을 현재 값으로 맞춘다
  useEffect(() => {
    if (!site) return;
    setTo(site.overallProgress);
    const first = site.processes?.find((p) => p.progress < 100) ?? site.processes?.[0];
    setProcessKey(first?.key ?? null);
    setProcessTo(first?.progress ?? null);
    // 현장 id가 바뀔 때만 초기화 (백그라운드 재조회로 입력값이 지워지지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id]);

  // 미리보기 주소 정리
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const lines = workLines(work);
  const workText = lines.join('\n');

  // 자동 계산 현장: 이 보고 후 전체 진행률 미리 계산 (서버와 같은 식)
  const autoOverall = useMemo(() => {
    if (!isAuto || !site?.processes || processTo == null) return null;
    const after = site.processes.reduce(
      (sum, p) => sum + (p.weight * (p.key === processKey ? processTo : p.progress)) / 100,
      0,
    );
    return Math.max(current, r1(after));
  }, [isAuto, site, processKey, processTo, current]);

  const addPhotos = (list) => {
    const incoming = [...list];
    const rejected = incoming.filter((f) => !(f.type.startsWith('image/') || PHOTO_EXT.test(f.name)) || f.size > MAX_FILE_BYTES);
    const ok = incoming.filter((f) => !rejected.includes(f));
    const room = REPORT_LIMITS.PHOTOS_MAX - photos.length;
    if (rejected.length) toast.show(`사진(jpg·png·webp·heic, 20MB 이하)만 올릴 수 있어요. ${rejected.length}개 제외`, 'error');
    if (ok.length > room) toast.show(`사진은 최대 ${REPORT_LIMITS.PHOTOS_MAX}장이에요. ${ok.length - room}장 제외`, 'error');
    const added = ok.slice(0, Math.max(0, room)).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...added]);
  };

  const removePhoto = (id) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });

  const addFiles = (list) => {
    const incoming = [...list];
    const bad = incoming.filter((f) => !DOC_EXT.test(f.name) || f.size > MAX_FILE_BYTES);
    const ok = incoming.filter((f) => !bad.includes(f));
    const room = REPORT_LIMITS.FILES_MAX - files.length;
    if (bad.length) toast.show('엑셀·PDF·한글·워드·파워포인트 파일(20MB 이하)만 첨부할 수 있어요.', 'error');
    if (ok.length > room) toast.show(`첨부파일은 최대 ${REPORT_LIMITS.FILES_MAX}개예요.`, 'error');
    setFiles((prev) => [...prev, ...ok.slice(0, Math.max(0, room))]);
  };

  // 서버 ReportService.create 와 같은 검사
  const validate = () => {
    const out = [];
    if (!siteId) out.push('보고할 현장을 골라 주세요.');
    if (workText.length > REPORT_LIMITS.WORK_MAX) out.push(`진행한 작업은 ${REPORT_LIMITS.WORK_MAX}자까지 쓸 수 있어요.`);
    if (isAuto) {
      if (!process) out.push('보고할 공정을 골라 주세요.');
      else if (processTo == null || processTo < process.progress || processTo > 100)
        out.push(`'${process.name}' 진행률은 지금 값(${process.progress}%) 이상, 100% 이하여야 해요.`);
    } else if (site) {
      if (!workText) out.push('진행한 작업을 입력해 주세요.');
      if (to == null || to < current || to > 100) out.push(`진행률은 지금 진행률(${current}%) 이상, 100% 이하여야 해요.`);
    }
    return out;
  };

  const submit = (e) => {
    e.preventDefault();
    const problems = validate();
    setTried(true);
    setServerError(null);
    if (problems.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const input = {
      work: workText,
      ...(isAuto ? { processKey, processTo } : { to }),
      memo: memo.trim(),
      workLog: {
        weather,
        workers: workers === '' ? null : Number(workers),
        equipment: equipment.trim(),
      },
      photos: photos.map((p) => p.file),
      files,
      location: geo.status === 'ok' ? geo.coords : null,
    };
    create.mutate(
      { siteId, input },
      {
        onSuccess: () => {
          toast.show('보고를 제출했어요.');
          navigate(`/my/sites/${siteId}`);
        },
        onError: (err) => setServerError(err.message),
      },
    );
  };

  const errors = [...(tried ? validate() : []), ...(serverError ? [serverError] : [])];

  if (sitesPending) return <LoadingBlock />;
  if (sites.length === 0) {
    return (
      <Card>
        <EmptyState title="보고할 현장이 없어요." description="먼저 모바일 앱에서 현장에 참여해 주세요." />
      </Card>
    );
  }

  const input = 'rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900';
  const geoText = {
    loading: '현재 위치 확인 중…',
    ok: `위치 확인됨 (오차 약 ${geo.coords?.accuracy ?? '-'}m)`,
    denied: '위치 권한이 거부됨 · 위치 없이 제출돼요',
    unavailable: '위치를 확인하지 못함 · 위치 없이 제출돼요',
    unsupported: '이 브라우저는 위치를 지원하지 않아요',
  }[geo.status];

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/my" className="mb-2 inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800">
        <Icon name="left" size={14} /> 내 현장
      </Link>
      <PageHeader title="보고 작성" subtitle="진행한 작업 → 사진 → 진행률 → 제출" />

      {errors.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-[13px] text-bad">
          {errors.map((m) => (
            <p key={m}>· {m}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Section step={1} title="현장">
            <select
              value={siteId}
              onChange={(e) => setParams(e.target.value ? { site: e.target.value } : {})}
              className={`${input} w-full`}
              aria-label="보고할 현장"
            >
              <option value="">현장을 고르세요</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatPercent(s.overallProgress)})
                </option>
              ))}
            </select>
            {site && (
              <p className="mt-2 text-[12px] text-gray-500">
                {site.workType ?? '공사 종류 미입력'} · 진행률 {isAuto ? '공정 가중치 자동 계산' : '직접 입력'} · 지금{' '}
                <b className="tabular text-gray-800">{formatPercent(current)}</b>
              </p>
            )}
          </Section>

          {siteId && sitePending ? (
            <LoadingBlock />
          ) : (
            site && (
              <>
                <Section step={2} title="진행한 작업" hint={isAuto ? '한 줄에 하나씩 · 비우면 공정 이름으로 저장' : '한 줄에 하나씩'}>
                  <textarea
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                    rows={3}
                    aria-label="진행한 작업"
                    placeholder={'예) 2층 욕실 방수\n3층 전기 배선'}
                    className={`${input} w-full resize-y`}
                  />
                  <p
                    className={`tabular mt-1 text-right text-[11px] ${
                      workText.length > REPORT_LIMITS.WORK_MAX ? 'font-semibold text-bad' : 'text-gray-400'
                    }`}
                  >
                    {lines.length}건 · {workText.length}/{REPORT_LIMITS.WORK_MAX}자
                  </p>
                </Section>

                <Section step={3} title="사진" hint={`${photos.length}/${REPORT_LIMITS.PHOTOS_MAX}장 · 촬영 시각·위치는 사진 정보(EXIF)에서 자동으로 읽어요`}>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      addPhotos(e.dataTransfer.files);
                    }}
                    className={`rounded-xl border-2 border-dashed p-4 transition ${
                      dragOver ? 'border-brand bg-brand-soft' : 'border-line'
                    }`}
                  >
                    {photos.length > 0 && (
                      <ul className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
                        {photos.map((p, i) => (
                          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                            <img src={p.url} alt={`사진 ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(p.id)}
                              aria-label={`사진 ${i + 1} 빼기`}
                              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                            >
                              <Icon name="close" size={12} strokeWidth={2.4} />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                              {sizeLabel(p.file.size)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <Icon name="photo" size={24} className="text-gray-400" />
                      <p className="text-[13px] text-gray-600">사진을 여기로 끌어 놓거나</p>
                      <button
                        type="button"
                        onClick={() => photoInput.current?.click()}
                        disabled={photos.length >= REPORT_LIMITS.PHOTOS_MAX}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      >
                        사진 선택
                      </button>
                      <input
                        ref={photoInput}
                        type="file"
                        accept={REPORT_PHOTO_ACCEPT}
                        multiple
                        hidden
                        aria-label="사진 파일"
                        onChange={(e) => {
                          addPhotos(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    메신저로 받은 사진은 촬영 정보가 지워져 있을 수 있어요. 휴대폰 갤러리 원본을 올려 주세요.
                  </p>
                </Section>

                <Section step={4} title="진행률" hint={isAuto ? '보고할 공정을 고르고 그 공정의 진행률을 입력' : '현장 전체 진행률'}>
                  {isAuto ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="보고할 공정">
                        {site.processes.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            role="radio"
                            aria-checked={p.key === processKey}
                            onClick={() => {
                              setProcessKey(p.key);
                              setProcessTo(p.progress);
                            }}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                              p.key === processKey ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line hover:bg-gray-50'
                            }`}
                          >
                            <span>
                              <span className="block text-[13px] font-bold text-gray-900">{p.name}</span>
                              <span className="text-[11px] text-gray-500">비중 {p.weight}%</span>
                            </span>
                            <span className="tabular text-[13px] font-semibold text-gray-700">{formatPercent(p.progress)}</span>
                          </button>
                        ))}
                      </div>
                      {process && (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-[13px] text-gray-700">
                            {process.name}
                            <input
                              type="number"
                              min={process.progress}
                              max={100}
                              step={0.1}
                              value={processTo ?? ''}
                              onChange={(e) => setProcessTo(e.target.value === '' ? null : Number(e.target.value))}
                              className={`${input} tabular w-24 text-right`}
                              aria-label={`${process.name} 진행률`}
                            />
                            %
                          </label>
                          <StepButtons value={processTo ?? process.progress} min={process.progress} onChange={setProcessTo} />
                          <p className="tabular text-[12px] text-gray-500">
                            → 전체 {formatPercent(current)} → <b className="text-gray-900">{formatPercent(autoOverall ?? current)}</b>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-[13px] text-gray-700">
                          전체
                          <input
                            type="number"
                            min={current}
                            max={100}
                            step={0.1}
                            value={to ?? ''}
                            onChange={(e) => setTo(e.target.value === '' ? null : Number(e.target.value))}
                            className={`${input} tabular w-24 text-right`}
                            aria-label="현장 전체 진행률"
                          />
                          %
                        </label>
                        <StepButtons value={to ?? current} min={current} onChange={setTo} />
                        <p className="tabular text-[12px] text-gray-500">
                          지금 {formatPercent(current)} → <b className="text-gray-900">{formatPercent(to ?? current)}</b>
                          {to != null && to > current && <span className="text-ok"> (+{r1(to - current)}%p)</span>}
                        </p>
                      </div>
                      <input
                        type="range"
                        min={current}
                        max={100}
                        step={0.5}
                        value={to ?? current}
                        onChange={(e) => setTo(Number(e.target.value))}
                        className="w-full accent-[#f5b400]"
                        aria-label="진행률 조절"
                      />
                    </div>
                  )}
                </Section>

                <Section step={5} title="작업일보 · 메모 · 첨부" hint="모두 선택 입력">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-14 text-[13px] text-gray-600">날씨</span>
                      {Object.entries(WEATHER_LABEL).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={weather === key}
                          onClick={() => setWeather(weather === key ? null : key)}
                          className={`rounded-full border px-3 py-1 text-[12px] ${
                            weather === key ? 'border-ink-900 bg-ink-900 text-white' : 'border-line text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="workers" className="w-14 text-[13px] text-gray-600">
                        투입 인원
                      </label>
                      <input
                        id="workers"
                        type="number"
                        min={0}
                        value={workers}
                        onChange={(e) => setWorkers(e.target.value)}
                        className={`${input} tabular w-24 text-right`}
                      />
                      <span className="text-[13px] text-gray-600">명</span>
                      <label htmlFor="equipment" className="ml-4 text-[13px] text-gray-600">
                        장비
                      </label>
                      <input
                        id="equipment"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value.slice(0, 100))}
                        placeholder="예) 펌프카, 고소작업대"
                        className={`${input} min-w-0 flex-1`}
                      />
                    </div>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value.slice(0, 500))}
                      rows={2}
                      aria-label="메모"
                      placeholder="메모 (특이사항, 내일 작업 예정 등)"
                      className={`${input} w-full resize-y`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                          disabled={files.length >= REPORT_LIMITS.FILES_MAX}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Icon name="file" size={15} /> 파일 첨부
                        </button>
                        <span className="text-[11px] text-gray-500">
                          엑셀·PDF·한글·워드 등 {files.length}/{REPORT_LIMITS.FILES_MAX}개
                        </span>
                        <input
                          ref={fileInput}
                          type="file"
                          accept={REPORT_DOC_ACCEPT}
                          multiple
                          hidden
                          aria-label="첨부 파일"
                          onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </div>
                      {files.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {files.map((f, i) => (
                            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[12px] text-gray-700">
                              <Icon name="file" size={14} className="text-gray-400" />
                              <span className="truncate">{f.name}</span>
                              <span className="text-gray-400">{sizeLabel(f.size)}</span>
                              <button
                                type="button"
                                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                                aria-label={`${f.name} 빼기`}
                                className="text-gray-400 hover:text-bad"
                              >
                                <Icon name="close" size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Section>
              </>
            )
          )}
        </div>

        <aside className="self-start xl:sticky xl:top-6">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-gray-900">제출 전 확인</h2>
            <ul className="mt-3 space-y-2 text-[13px]">
              <Check ok={!!site} label={site ? site.name : '현장 선택'} />
              <Check ok={isAuto || lines.length > 0} label={lines.length ? `진행한 작업 ${lines.length}건` : isAuto ? '진행한 작업 (선택)' : '진행한 작업'} />
              <Check ok={photos.length > 0} optional label={`사진 ${photos.length}장`} />
              <Check
                ok={isAuto ? process && processTo > process.progress : to != null && to > current}
                optional
                label={
                  isAuto
                    ? `${process?.name ?? '공정'} ${formatPercent(process?.progress)} → ${formatPercent(processTo)}`
                    : `진행률 ${formatPercent(current)} → ${formatPercent(to)}`
                }
              />
              <li className="flex items-start gap-2 text-[12px] text-gray-600">
                <Icon name="pin" size={15} className={geo.status === 'ok' ? 'mt-0.5 text-ok' : 'mt-0.5 text-gray-400'} />
                <span className="flex-1">{geoText}</span>
                {(geo.status === 'denied' || geo.status === 'unavailable') && (
                  <button type="button" onClick={geo.request} className="font-semibold text-gray-800 underline">
                    다시
                  </button>
                )}
              </li>
            </ul>
            <button
              type="submit"
              disabled={create.isPending || !site}
              className="mt-4 w-full rounded-lg bg-brand py-3 text-[15px] font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-50"
            >
              {create.isPending ? '제출 중…' : '보고 제출'}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
              제출하면 현장 관리자와 본사가 검토해요. 본사 없이 운영하는 현장의 관리자가 올린 보고는 바로 승인돼요.
            </p>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function Check({ ok, label, optional = false }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-ok text-white' : optional ? 'bg-gray-200 text-gray-400' : 'border border-bad text-bad'
        }`}
      >
        {ok && <Icon name="check" size={11} strokeWidth={3} />}
      </span>
      <span className={ok ? 'text-gray-800' : 'text-gray-500'}>{label}</span>
    </li>
  );
}
