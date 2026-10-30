import { useState } from 'react';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import ReviewBadge from './ReviewBadge';
import ReportChecks from './ReportChecks';
import PhotoViewer from './PhotoViewer';
import { useDeleteReport, useReviewReport } from '../../hooks/queries/useReviewReport';
import { useUpdateMemo } from '../../hooks/queries/useMyQueries';
import { useToast } from '../common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { REVIEW_COMMENT_MAX, REVIEW_STATUS, WEATHER_LABEL } from '../../constants/enums';
import { formatDateTime, formatDelta, formatRelative, formatTime, workLines, workSummary } from '../../services/format';

// 보고 상세 + 승인 / 보완 요청 (계획서 화면 3 오른쪽 패널)
export default function ReportReviewPanel({ report, onReviewed }) {
  // 보고가 바뀌면 입력 상태를 초기화하기 위해 key 사용
  return <ReviewPanelBody key={report.id} report={report} onReviewed={onReviewed} />;
}

function ReviewPanelBody({ report, onReviewed }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const review = useReviewReport();
  const toast = useToast();
  const { user } = useAuth();
  const lines = workLines(report.work);
  const hasProcess = report.processTo != null && report.processName;

  const photos = report.photos?.length
    ? report.photos
    : (report.photoUris ?? []).map((url) => ({ url, takenAt: null, latitude: null, longitude: null, phase: null }));
  const viewerItems = photos.map((p) => ({ ...p, caption: workSummary(report.work, report.processName) }));
  const status = report.review?.status;
  const hasPhotoPhase = photos.some((photo) => photo.phase === 'before' || photo.phase === 'after');
  const photoGroups = hasPhotoPhase
    ? [
        { key: 'before', label: '작업 전', items: photos.map((photo, index) => ({ photo, index })).filter(({ photo }) => photo.phase === 'before') },
        { key: 'after', label: '작업 후', items: photos.map((photo, index) => ({ photo, index })).filter(({ photo }) => photo.phase !== 'before') },
      ]
    : [{ key: 'general', label: '현장 사진', items: photos.map((photo, index) => ({ photo, index })) }];
  const photoWarning = (report.checks ?? []).some((check) => ['old_photo', 'far_photo'].includes(check.type));

  const submit = (nextStatus) => {
    setError(null);
    const text = comment.trim();
    if (nextStatus === REVIEW_STATUS.REVISION && !text) {
      setError('보완 요청은 무엇을 보완해야 하는지 코멘트를 적어야 해요.');
      return;
    }
    review.mutate(
      { reportId: report.id, status: nextStatus, comment: text || undefined },
      {
        onSuccess: (updated) => {
          toast.show(nextStatus === REVIEW_STATUS.APPROVED ? '보고를 승인했어요.' : '보완 요청을 보냈어요.');
          onReviewed?.(updated);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-gray-500">
            {report.siteName} · {report.author}
          </p>
          {lines.length <= 1 ? (
            <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">{lines[0] ?? report.processName}</p>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[14px] font-bold leading-snug text-gray-900">
              {lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-gray-500">{formatRelative(report.createdAt)}</span>
      </div>

      {photos.length > 0 && (
        <div className="space-y-3">
          {photoGroups.filter((group) => group.items.length > 0).map((group) => (
            <section key={group.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[12px] font-bold text-gray-700">{group.label}</p>
                <span className="tabular text-[10px] text-gray-400">{group.items.length}장</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(({ photo, index }) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setViewerIndex(index)}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img src={photo.url} alt={`${group.label} 사진 ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {photo.takenAt ? `${formatTime(photo.takenAt)} 촬영` : '촬영 시각 없음'}
                      {photo.latitude == null && ' · 위치 없음'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {photoWarning && <p className="rounded-lg bg-bad-soft px-2.5 py-1.5 text-[11px] text-bad">촬영 시각 또는 위치 이상이 감지된 사진이 있습니다. 아래 자동 검사 결과를 확인해 주세요.</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="tabular text-sm text-gray-500">
          {report.from.toFixed(1)}% <span className="mx-1">→</span>
          <span className="text-xl font-extrabold text-gray-900">{report.to.toFixed(1)}%</span>
        </p>
        <Badge tone="brand" className="tabular">
          {formatDelta(report.from, report.to)}
        </Badge>
      </div>
      {hasProcess && (
        <p className="tabular -mt-1 text-[12px] text-gray-500">
          {report.processName} 공정 {report.processFrom?.toFixed(1)}% → {report.processTo.toFixed(1)}% (가중치로 전체
          진행률 자동 계산)
        </p>
      )}

      <p className="rounded-lg bg-brand-soft px-3 py-2 text-[11px] text-[#725300]">
        현재 실제 진행률은 승인 전까지 바뀌지 않습니다. 위 값은 작성자가 제안한 변경 전·후 진행률이며 승인 시 반영됩니다.
      </p>

      {report.rating != null && (
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="text-[12px] text-gray-500">작성자가 입력한 오늘 작업 평점</span>
          <strong className="tabular text-[14px] text-gray-900">★ {Number(report.rating).toFixed(1)} / 5.0</strong>
        </div>
      )}

      {report.materialUsages?.length > 0 && (
        <div className="rounded-lg border border-line p-3">
          <p className="text-[12px] font-bold text-gray-800">오늘 사용한 자재</p>
          <ul className="mt-2 divide-y divide-line">
            {report.materialUsages.map((material, index) => (
              <li key={`${material.name}-${material.unit}-${index}`} className="flex justify-between gap-3 py-1.5 text-[12px]">
                <span className="text-gray-700">{material.name}</span>
                <strong className="tabular text-gray-900">{material.quantity} {material.unit}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-gray-500">
            {status === REVIEW_STATUS.APPROVED
              ? '승인이 완료되어 현장 재고에서 차감되었습니다.'
              : status === REVIEW_STATUS.REVISION
                ? '보완 요청 상태이므로 현장 재고에서 차감되지 않았습니다.'
                : '승인되면 현장 재고에서 차감됩니다.'}
          </p>
        </div>
      )}

      <ReportChecks checks={report.checks} />

      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px]">
        <div>
          <dt className="text-gray-500">날씨</dt>
          <dd className="font-semibold text-gray-800">{WEATHER_LABEL[report.workLog?.weather] ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">투입 인원</dt>
          <dd className="font-semibold text-gray-800">
            {report.workLog?.workers != null ? `${report.workLog.workers}명` : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">장비</dt>
          <dd className="truncate font-semibold text-gray-800">{report.workLog?.equipment || '-'}</dd>
        </div>
      </dl>

      {report.memo && <p className="rounded-lg border border-line px-3 py-2 text-[12px] text-gray-700">{report.memo}</p>}

      {report.files?.length > 0 && (
        <ul className="space-y-1">
          {report.files.map((f, i) => (
            <li key={i}>
              <a href={f.url} className="flex items-center gap-1.5 text-[12px] text-gray-700 underline-offset-2 hover:underline">
                <Icon name="file" size={14} /> {f.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {report.canReview ? (
        <>
          <label className="sr-only" htmlFor={`comment-${report.id}`}>
            검토 코멘트
          </label>
          <textarea
            id={`comment-${report.id}`}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX))}
            rows={2}
            placeholder="코멘트 남기기 (보완 요청 시 필수)"
            className="w-full resize-none rounded-lg border border-line px-3 py-2 text-[13px] outline-none placeholder:text-gray-400 focus:border-ink-900"
          />
          {error && <p className="text-[12px] text-bad">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => submit(REVIEW_STATUS.REVISION)}
              className="rounded-lg border border-line bg-white py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              보완 요청
            </button>
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => submit(REVIEW_STATUS.APPROVED)}
              className="rounded-lg bg-brand py-2.5 text-sm font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-50"
            >
              {review.isPending ? '처리 중…' : '승인'}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-line px-3 py-2.5 text-[12px]">
          <div className="flex items-center justify-between">
            <ReviewBadge status={status} />
            {report.review?.reviewedAt && (
              <span className="text-gray-500">
                {report.review.reviewer} · {formatDateTime(report.review.reviewedAt)}
              </span>
            )}
          </div>
          {report.review?.comment && <p className="mt-1.5 text-gray-700">“{report.review.comment}”</p>}
          {status === REVIEW_STATUS.PENDING && (
            <p className="mt-1.5 text-gray-500">
              {report.authorId === user?.id
                ? '내가 올린 보고예요. 검토를 기다리고 있어요.'
                : user?.role === 'hq' && !user?.canReviewReports
                  ? '본사 관리자만 승인·보완 요청을 할 수 있어요. (현재 계정: 본사 직원)'
                  : user?.role === 'worker'
                    ? '현장 관리자나 본사가 검토해요.'
                    : '이 보고를 검토할 권한이 없어요.'}
            </p>
          )}
        </div>
      )}

      {report.canEdit && status === REVIEW_STATUS.REVISION && <ResubmitBox report={report} />}

      {report.canDelete && <DeleteReportButton report={report} />}

      {viewerIndex != null && (
        <PhotoViewer
          items={viewerItems}
          index={viewerIndex}
          onChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}

// 현장의 가장 최근 보고 삭제(앱 보고 상세의 삭제와 같음). 승인된 보고면 진행률·자재 재고도 되돌아간다
function DeleteReportButton({ report }) {
  const remove = useDeleteReport();
  const toast = useToast();
  const [error, setError] = useState(null);

  const onDelete = () => {
    if (!window.confirm('이 보고를 삭제할까요?\n사진·첨부도 함께 지워지고 되돌릴 수 없어요.')) return;
    setError(null);
    remove.mutate(
      { reportId: report.id },
      { onSuccess: () => toast.show('보고를 삭제했어요.'), onError: (e) => setError(e.message) },
    );
  };

  return (
    <div className="border-t border-line pt-3">
      {error && <p className="mb-2 text-[12px] text-bad">{error}</p>}
      <button
        type="button"
        onClick={onDelete}
        disabled={remove.isPending}
        className="w-full rounded-lg border border-bad/40 py-2 text-[13px] font-bold text-bad hover:bg-bad-soft disabled:opacity-50"
      >
        {remove.isPending ? '삭제 중…' : '보고 삭제'}
      </button>
      <p className="mt-1.5 text-[11px] text-gray-500">현장의 가장 최근 보고만 삭제할 수 있어요.</p>
    </div>
  );
}

// 작성자: 보완 요청을 받은 보고 → 메모에 보완 내용을 적어 다시 제출 (서버가 '검토 대기'로 되돌림)
function ResubmitBox({ report }) {
  const [memo, setMemo] = useState(report.memo ?? '');
  const [error, setError] = useState(null);
  const update = useUpdateMemo();
  const toast = useToast();

  const submit = () => {
    setError(null);
    if (!memo.trim()) {
      setError('무엇을 보완했는지 적어 주세요.');
      return;
    }
    update.mutate(
      { reportId: report.id, memo: memo.trim() },
      { onSuccess: () => toast.show('보완 내용을 다시 제출했어요.'), onError: (e) => setError(e.message) },
    );
  };

  return (
    <div className="space-y-2 rounded-lg border border-bad/30 bg-bad-soft/50 p-3">
      <p className="text-[12px] font-semibold text-bad">보완해서 다시 제출</p>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value.slice(0, 500))}
        rows={3}
        aria-label="보완 내용"
        placeholder="보완한 내용을 적어 주세요 (예: 근접 사진 추가 촬영함)"
        className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900"
      />
      <p className="text-[11px] text-gray-500">사진을 다시 올려야 하면 새 보고로 작성해 주세요.</p>
      {error && <p className="text-[12px] text-bad">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={update.isPending}
        className="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-bold text-white hover:bg-ink-800 disabled:opacity-50"
      >
        {update.isPending ? '제출 중…' : '다시 제출'}
      </button>
    </div>
  );
}
