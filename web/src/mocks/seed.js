// 더미 데이터 원본. 모양은 app/types.ts · docs/API_약속.md 와 동일하게 유지한다.
// 날짜는 '지금' 기준 상대값으로 만들어서 언제 열어도 '오늘 보고'가 보이게 한다.

export const DEMO_PASSWORD = 'buildup1234';

export const DEMO_ACCOUNTS = [
  { email: 'hq@buildup.dev', label: '본사 관리자 (승인 가능)' },
  { email: 'hq2@buildup.dev', label: '본사 직원 (조회만 가능)' },
  { email: 'site@buildup.dev', label: '현장 관리자 (웹 접근 차단 확인용)' },
];

// ───────── 결정적 난수 (새로고침해도 같은 데이터) ─────────
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN = 60_000;
const DAY = 86_400_000;
const r1 = (v) => Math.round(v * 10) / 10;

// daysAgo일 전 hour:minute. 오늘이면서 미래 시각이 되면 '지금 - n분'으로 당긴다.
function at(now, daysAgo, hour, minute, fallbackMinutesAgo) {
  const d = new Date(now.getTime() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  if (d > now) return new Date(now.getTime() - fallbackMinutesAgo * MIN);
  return d;
}

const iso = (d) => (d ? d.toISOString() : null);
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ───────── 고정 데이터 ─────────
// 서버 AuthUserResponse 와 같은 칸 (hqCompanyId는 더미 내부용)
const USERS = [
  { id: 'u-hq', name: '정본사', email: 'hq@buildup.dev', phone: '010-1000-0001', role: 'hq', company: '한빛건설 본사', companyCode: '250901', hqName: null, hqRole: 'manager', canReviewReports: true, hqCompanyId: 'c-1' },
  { id: 'u-hq2', name: '오직원', email: 'hq2@buildup.dev', phone: '010-1000-0002', role: 'hq', company: '한빛건설 본사', companyCode: '250901', hqName: null, hqRole: 'member', canReviewReports: false, hqCompanyId: 'c-1' },
  { id: 'u-sys', name: '시스템 관리자', email: 'admin@buildup.dev', phone: '010-1000-0000', role: 'system', company: 'Build Up', companyCode: null, hqName: null, hqRole: null, canReviewReports: false },
  { id: 'u-admin', name: '이영호', email: 'site@buildup.dev', phone: '010-2000-0001', role: 'admin', company: '영호종합건설', companyCode: null, hqName: '한빛건설 본사', hqRole: null, canReviewReports: false },
  { id: 'u-w1', name: '김현장', email: 'kim@buildup.dev', phone: '010-3000-0001', role: 'worker', hqRole: null, canReviewReports: false },
  { id: 'u-w2', name: '박철근', email: 'park@buildup.dev', phone: '010-3000-0002', role: 'worker', hqRole: null, canReviewReports: false },
  { id: 'u-w3', name: '최전기', email: 'choi@buildup.dev', phone: '010-3000-0003', role: 'worker', hqRole: null, canReviewReports: false },
  { id: 'u-w4', name: '한설비', email: 'han@buildup.dev', phone: '010-3000-0004', role: 'worker', hqRole: null, canReviewReports: false },
];

const COMPANIES = [{ id: 'c-1', name: '한빛건설 본사', code: '250901' }];

const PHOTOS = [
  '/dummy/rebar.svg',
  '/dummy/concrete.svg',
  '/dummy/pipes.svg',
  '/dummy/wiring.svg',
  '/dummy/drywall.svg',
  '/dummy/tiles.svg',
];

// 현장별 보고 생성 규칙
// progressMode 'auto': processes[].start → final 로 공정 진행률이 오르고, 전체 진행률은 가중치 합
// progressMode 'manual': startProgress → finalProgress 로 보고자가 직접 입력
const SITE_PLANS = [
  {
    id: 's-1',
    name: '한빛 오피스텔 신축공사',
    workType: '건축 공사(신축)',
    address: '서울 마포구 월드컵북로 120',
    lat: 37.5663,
    lng: 126.9015,
    memberIds: ['u-admin', 'u-w1', 'u-w2', 'u-w3'],
    progressMode: 'auto',
    processes: [
      { key: 'frame', name: '골조', weight: 30, start: 20, final: 68.5, photos: [0, 1],
        works: ['4층 기둥 철근 배근 완료\n동바리 설치 착수', '3층 슬래브 콘크리트 타설', '3층 기둥 거푸집 해체', '2층 벽체 철근 배근'] },
      { key: 'electric', name: '전기', weight: 15, start: 10, final: 64, photos: [3],
        works: ['3층 전기 배관 및 배선 작업 완료', '2층 분전반 설치\n배선 정리'] },
      { key: 'plumbing', name: '설비', weight: 15, start: 5, final: 58, photos: [2],
        works: ['3층 급수 배관 설치', '2층 배수 배관 압력 시험'] },
      { key: 'finish', name: '마감', weight: 40, start: 0, final: 10.9, photos: [4],
        works: ['1층 로비 석고보드 마감', '지하 1층 방수 작업'] },
    ],
    count: 12,
    every: 2,
    lastDaysAgo: 0,
    pendingLast: 2,
  },
  {
    id: 's-2',
    name: '세종 근린생활시설 신축공사',
    workType: '건축 공사(신축)',
    address: '세종 한누리대로 2130',
    lat: 36.48,
    lng: 127.289,
    memberIds: ['u-admin', 'u-w2', 'u-w4'],
    progressMode: 'manual',
    startProgress: 48,
    finalProgress: 76.4,
    count: 10,
    every: 2,
    lastDaysAgo: 0,
    pendingLast: 1,
    revisionAt: 2,
    photos: [4, 5, 2],
    works: [
      '2층 화장실 벽체 타일 시공',
      '1층 상가 경량 벽체 석고보드 마감\n천장 틀 설치',
      '옥상 방수층 2차 도포',
      '2층 급배수 배관 압력 시험',
      '외벽 단열재 부착',
      '1층 바닥 레벨링',
    ],
  },
  {
    id: 's-3',
    name: '대원 물류센터 증축공사',
    workType: '증축 공사',
    address: '경기 이천시 마장면 서이천로 300',
    lat: 37.242,
    lng: 127.336,
    memberIds: ['u-admin', 'u-w1', 'u-w3'],
    progressMode: 'manual',
    startProgress: 8,
    finalProgress: 28.7,
    count: 7,
    every: 3,
    lastDaysAgo: 4, // 보고 지연 현장
    pendingLast: 1,
    photos: [1, 0, 2],
    works: ['증축동 기초 콘크리트 타설', '기초 철근 배근 검측', '터파기 및 버림 콘크리트', '기존동 접합부 철거', '증축동 앵커볼트 설치'],
  },
  {
    id: 's-4',
    name: '해오름 아파트 리모델링',
    workType: '리모델링 공사',
    address: '부산 해운대구 좌동순환로 45',
    lat: 35.169,
    lng: 129.175,
    memberIds: ['u-admin', 'u-w2', 'u-w4'],
    progressMode: 'auto',
    processes: [
      { key: 'demolish', name: '철거', weight: 20, start: 100, final: 100, photos: [1], works: ['철거 완료'] },
      { key: 'piping', name: '설비 교체', weight: 30, start: 60, final: 95, photos: [2],
        works: ['욕실 급배수 배관 교체', '주방 배관 교체'] },
      { key: 'interior', name: '내장 마감', weight: 50, start: 20, final: 85.4, photos: [5, 4],
        works: ['세대 내부 도배 및 바닥재 시공', '주방 상부장 설치\n욕실 도기 설치', '발코니 샷시 교체'] },
    ],
    count: 9,
    every: 2,
    lastDaysAgo: 1,
    pendingLast: 0,
  },
  {
    id: 's-5',
    name: '원주 단독주택 욕실 리모델링',
    workType: '욕실 리모델링',
    address: '강원 원주시 단구로 88',
    lat: 37.3285,
    lng: 127.9468,
    memberIds: ['u-admin', 'u-w4'],
    progressMode: 'manual',
    startProgress: 0,
    finalProgress: 55,
    count: 5,
    every: 2,
    lastDaysAgo: 0,
    pendingLast: 1,
    photos: [2, 5, 4],
    works: ['욕실 방수 1차 시공', '욕실 급배수 배관 교체', '기존 타일 철거\n폐기물 반출'],
  },
];

const WEATHERS = ['sunny', 'sunny', 'cloudy', 'sunny', 'rain', 'cloudy'];
const EQUIPMENT = ['타워크레인', '펌프카', '고소작업대', '', '지게차', ''];
const MEMOS = ['', '자재 반입 지연으로 오후 작업 시작.', '안전 점검 완료 후 작업 진행.', '', '내일 오전 검측 예정.'];

const weightedOverall = (processes, cur) =>
  processes.reduce((sum, p) => sum + (p.weight * cur[p.key]) / 100, 0);

// 보고마다 { from, to, processKey, processName, processFrom, processTo, work, photos } 계산
function planSteps(plan, rand) {
  const randWeights = (n) => {
    const w = Array.from({ length: n }, () => 0.5 + rand());
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
  };

  if (plan.progressMode === 'auto') {
    const growing = plan.processes.filter((p) => p.final > p.start);
    const assigned = Array.from({ length: plan.count }, (_, i) => growing[i % growing.length]);
    const shares = Object.fromEntries(
      growing.map((p) => [p.key, randWeights(assigned.filter((a) => a.key === p.key).length)]),
    );
    const used = Object.fromEntries(growing.map((p) => [p.key, 0]));
    const cur = Object.fromEntries(plan.processes.map((p) => [p.key, p.start]));

    return assigned.map((p, i) => {
      const k = used[p.key];
      const total = shares[p.key].length;
      const isLast = k === total - 1;
      const pFrom = cur[p.key];
      const pTo = isLast ? p.final : pFrom + (p.final - p.start) * shares[p.key][k];
      const from = weightedOverall(plan.processes, cur);
      cur[p.key] = pTo;
      used[p.key] += 1;
      // works는 최신순으로 적어 둠 → 이 공정의 가장 최근 보고가 works[0]
      const work = p.works[(total - 1 - k) % p.works.length];
      return {
        from: r1(from),
        to: r1(weightedOverall(plan.processes, cur)),
        processKey: p.key,
        processName: p.name,
        processFrom: r1(pFrom),
        processTo: r1(pTo),
        work,
        photoPool: p.photos,
        i,
      };
    });
  }

  const shares = randWeights(plan.count);
  let acc = plan.startProgress;
  return shares.map((share, i) => {
    const from = acc;
    acc = i === plan.count - 1 ? plan.finalProgress : acc + (plan.finalProgress - plan.startProgress) * share;
    const newestIndex = plan.count - 1 - i;
    return {
      from: r1(from),
      to: r1(acc),
      processKey: 'work',
      processName: '',
      processFrom: null,
      processTo: null,
      work: plan.works[newestIndex % plan.works.length],
      photoPool: plan.photos,
      i,
    };
  });
}

function makeReports(plan, now, rand) {
  const authors = plan.memberIds.filter((id) => id !== 'u-admin');
  return planSteps(plan, rand).map((step) => {
    const { i } = step;
    const newestIndex = plan.count - 1 - i; // 0 = 가장 최근
    const daysAgo = plan.lastDaysAgo + newestIndex * plan.every;
    const created = at(now, daysAgo, 9 + Math.floor(rand() * 8), Math.floor(rand() * 60), 40 + newestIndex * 90);
    const authorId = authors[i % authors.length];
    const author = USERS.find((u) => u.id === authorId);

    const photoCount = 1 + Math.floor(rand() * 3);
    const photos = Array.from({ length: photoCount }, (_, p) => {
      const taken = new Date(created.getTime() - (10 + Math.floor(rand() * 80)) * MIN);
      return {
        url: PHOTOS[step.photoPool[(i + p) % step.photoPool.length]],
        takenAt: iso(taken),
        latitude: plan.lat + (rand() - 0.5) * 0.0006,
        longitude: plan.lng + (rand() - 0.5) * 0.0006,
      };
    });

    const checks = [];
    let location = {
      latitude: plan.lat + (rand() - 0.5) * 0.0004,
      longitude: plan.lng + (rand() - 0.5) * 0.0004,
      accuracy: Math.round(8 + rand() * 20),
    };

    // 자동 검사 예시 (서버 report_checks 와 같은 종류)
    if (plan.id === 's-1' && newestIndex === 1) {
      photos[0].takenAt = iso(new Date(created.getTime() - 3 * DAY));
      checks.push({ type: 'old_photo', message: '3일 전에 촬영한 사진이 포함되어 있어요.' });
    }
    if (plan.id === 's-3' && newestIndex === 0) {
      photos[0].latitude = plan.lat + 0.012;
      photos[0].longitude = plan.lng + 0.009;
      checks.push({ type: 'far_photo', message: '사진 1장이 현장에서 약 1.5km 떨어진 곳에서 촬영됐어요.' });
    }
    if (plan.id === 's-5' && newestIndex === 0) {
      location = null;
      photos.forEach((ph) => {
        ph.latitude = null;
        ph.longitude = null;
      });
      checks.push({ type: 'no_location', message: '제출 위치와 사진 위치 정보가 없어요.' });
    }

    let review;
    if (newestIndex < plan.pendingLast) {
      review = { status: 'pending', comment: null, reviewer: null, reviewedAt: null };
    } else if (plan.revisionAt === newestIndex) {
      review = {
        status: 'revision',
        comment: '타일 줄눈 상태가 보이는 근접 사진을 추가로 올려주세요.',
        reviewer: '정본사',
        reviewedAt: iso(new Date(created.getTime() + 3 * 60 * MIN)),
      };
    } else {
      review = {
        status: 'approved',
        comment: null,
        reviewer: '정본사',
        reviewedAt: iso(new Date(created.getTime() + (1 + Math.floor(rand() * 5)) * 60 * MIN)),
      };
    }

    const files = newestIndex === 2 ? [{ name: `${plan.name}_작업일보.pdf`, url: '#', size: 184_320 }] : [];

    return {
      id: `${plan.id}-r${String(i + 1).padStart(2, '0')}`,
      siteId: plan.id,
      processKey: step.processKey,
      processName: step.processName,
      processFrom: step.processFrom,
      processTo: step.processTo,
      work: step.work,
      from: step.from,
      to: step.to,
      photoUris: photos.map((p) => p.url),
      files,
      memo: MEMOS[i % MEMOS.length],
      workLog: {
        weather: WEATHERS[i % WEATHERS.length],
        workers: 3 + Math.floor(rand() * 12),
        equipment: EQUIPMENT[i % EQUIPMENT.length],
      },
      author: author.name,
      authorId,
      createdAt: iso(created),
      photos,
      location,
      review,
      checks,
    };
  });
}

// 자재 요청 (app/types.ts MaterialRequest 형식, 권한 칸은 mockServer가 계산)
function makeMaterials(now) {
  const t = (days, hour) => iso(at(now, days, hour, 10, 30 + days * 60));
  const needBy = (days) => ymd(new Date(now.getTime() + days * DAY));
  const ev = (status, by, byHq, at_) => ({ status, by, byHq, at: at_ });
  return [
    {
      id: 'm-1', siteId: 's-1', processKey: 'frame', processName: '골조',
      items: [
        { name: '철근 D13', quantity: 5, unit: '톤' },
        { name: '결속선', quantity: 20, unit: '롤' },
      ],
      neededBy: needBy(2), urgent: true, note: '5층 슬래브 배근용. 금요일 오전 반입 필요합니다.',
      status: 'requested', rejectReason: null, author: '박철근', authorId: 'u-w2', createdAt: t(0, 9),
      timeline: [ev('requested', '박철근', false, t(0, 9))],
    },
    {
      id: 'm-2', siteId: 's-2', processKey: null, processName: null,
      items: [
        { name: '타일 접착제', quantity: 30, unit: '포' },
        { name: '줄눈 시멘트', quantity: 10, unit: '포' },
        { name: '타일 300×600', quantity: 45, unit: '㎡' },
      ],
      neededBy: needBy(4), urgent: false, note: '2층 화장실 2개소 분량',
      status: 'requested', rejectReason: null, author: '한설비', authorId: 'u-w4', createdAt: t(1, 14),
      timeline: [ev('requested', '한설비', false, t(1, 14))],
    },
    {
      id: 'm-3', siteId: 's-3', processKey: null, processName: null,
      items: [{ name: '레미콘 25-24-150', quantity: 60, unit: '㎥' }],
      neededBy: needBy(1), urgent: true, note: '증축동 기초 2차 타설. 펌프카 같이 예약 필요.',
      status: 'requested', rejectReason: null, author: '김현장', authorId: 'u-w1', createdAt: t(0, 8),
      timeline: [ev('requested', '김현장', false, t(0, 8))],
    },
    {
      id: 'm-4', siteId: 's-1', processKey: 'electric', processName: '전기',
      items: [
        { name: 'CD관 22mm', quantity: 400, unit: 'm' },
        { name: '스위치 박스', quantity: 80, unit: '개' },
      ],
      neededBy: needBy(-2), urgent: false, note: '',
      status: 'approved', rejectReason: null, author: '최전기', authorId: 'u-w3', createdAt: t(5, 10),
      timeline: [ev('requested', '최전기', false, t(5, 10)), ev('approved', '정본사', true, t(5, 15))],
    },
    {
      id: 'm-5', siteId: 's-4', processKey: 'interior', processName: '내장 마감',
      items: [{ name: '실크 벽지', quantity: 120, unit: '롤' }],
      neededBy: needBy(-1), urgent: false, note: '색상 A-203 동일 로트로 부탁드립니다.',
      status: 'rejected', rejectReason: '수량을 다시 확인해 주세요', author: '박철근', authorId: 'u-w2', createdAt: t(3, 11),
      timeline: [ev('requested', '박철근', false, t(3, 11)), ev('rejected', '정본사', true, t(3, 16))],
    },
    {
      id: 'm-6', siteId: 's-5', processKey: null, processName: null,
      items: [
        { name: '액체 방수제', quantity: 4, unit: '통' },
        { name: '욕실 도기 세트', quantity: 1, unit: '세트' },
      ],
      neededBy: needBy(6), urgent: false, note: '',
      status: 'requested', rejectReason: null, author: '한설비', authorId: 'u-w4', createdAt: t(0, 11),
      timeline: [ev('requested', '한설비', false, t(0, 11))],
    },
  ];
}

export function createSeed(now = new Date()) {
  const rand = mulberry32(20261015);
  const reports = SITE_PLANS.flatMap((plan) => makeReports(plan, now, rand));
  const sites = SITE_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    workType: p.workType,
    ownerId: 'u-admin',
    code: String(100000 + Math.floor(rand() * 899999)),
    companyId: 'c-1',
    memberIds: p.memberIds,
    latitude: p.lat,
    longitude: p.lng,
    progressMode: p.progressMode,
    processes: p.processes?.map(({ key, name, weight, start }) => ({ key, name, weight, start })) ?? [],
  }));
  return {
    users: USERS.map((u) => ({ ...u })),
    companies: COMPANIES.map((c) => ({ ...c })),
    sites,
    reports,
    materials: makeMaterials(now),
  };
}
