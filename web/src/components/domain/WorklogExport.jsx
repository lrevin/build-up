import { useState } from 'react';
import Icon from '../common/Icon';
import { useToast } from '../common/Toast';
import { sitesApi } from '../../api/sitesApi';
import { USE_DUMMY } from '../../config';
import { addDaysYmd, todayYmd } from '../../services/format';

// 작업일보 엑셀 내려받기 (기간 선택). 실서버: 10분짜리 내려받기 주소를 받아 연다.
export default function WorklogExport({ siteId }) {
  const toast = useToast();
  const [from, setFrom] = useState(() => addDaysYmd(-6));
  const [to, setTo] = useState(() => todayYmd());
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (from > to) {
      toast.show('시작일이 종료일보다 늦어요.', 'error');
      return;
    }
    // 실서버 주소는 응답을 기다린 뒤 열면 팝업 차단에 걸리므로 빈 창을 먼저 연다
    const win = USE_DUMMY ? null : window.open('about:blank', '_blank');
    setBusy(true);
    try {
      const { url, fileName } = await sitesApi.worklogLink(siteId, { from, to });
      if (win) {
        win.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName ?? `작업일보_${from}_${to}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      toast.show('작업일보를 내려받았어요.');
    } catch (e) {
      win?.close();
      toast.show(e?.message ?? '작업일보를 만들지 못했어요.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const input = 'rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-ink-900';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={input} aria-label="시작일" />
      <span className="text-gray-500">~</span>
      <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={input} aria-label="종료일" />
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-[12px] font-bold text-white hover:bg-ink-800 disabled:opacity-50"
      >
        <Icon name="download" size={15} /> {busy ? '만드는 중…' : '작업일보 엑셀'}
      </button>
    </div>
  );
}
