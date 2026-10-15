// 더미 데이터 원본. 모양은 app/types.ts(User, Site, Report ...)와 동일하게 유지한다.
// 날짜는 '지금' 기준 상대값으로 만들어서 언제 열어도 '오늘 보고'가 보이게 한다.

export const DEMO_PASSWORD = 'buildup1234';

export const DEMO_ACCOUNTS = [
  { email: 'hq@buildup.dev', label: '본사 관계자', canLogin: true },
  { email: 'site@buildup.dev', label: '현장 관리자 (웹 접근 차단 확인용)', canLogin: false },
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

// daysAgo일 전 hour:minute. 오늘이면서 미래 시각이 되면 '지금 - n분'으로 당긴다.
function at(now, daysAgo, hour, minute, fallbackMinutesAgo) {
  const d = new Date(now.getTime() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  if (d > now) return new Date(now.getTime() - fallbackMinutesAgo * MIN);
  return d;
}

const iso = (d) => (d ? d.toISOString() : null);

// ───────── 고정 데이터 ─────────
const USERS = [
  { id: 'u-hq', name: '정본사', email: 'hq@buildup.dev', phone: '010-1000-0001', role: 'hq', company: '한빛건설 본사', companyCode: '250901', hqCompanyId: 'c-1' },
  { id: 'u-sys', name: '시스템 관리자', email: 'admin@buildup.dev', phone: '010-1000-0000', role: 'system', company: 'Build Up' },
  { id: 'u-admin', name: '이영호', email: 'site@buildup.dev', phone: '010-2000-0001', role: 'admin', company: '영호종합건설' },
  { id: 'u-w1', name: '김현장', email: 'kim@buildup.dev', phone: '010-3000-0001', role: 'worker' },
  { id: 'u-w2', name: '박철근', email: 'park@buildup.dev', phone: '010-3000-0002', role: 'worker' },
  { id: 'u-w3', name: '최전기', email: 'choi@buildup.dev', phone: '010-3000-0003', role: 'worker' },
  { id: 'u-w4', name: '한설비', email: 'han@buildup.dev', phone: '010-3000-0004', role: 'worker' },
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
const SITE_PLANS = [
  {
    id: 's-1',
    name: '한빛 오피스텔 신축공사',
    workType: '건축 공사(신축)',
    address: '서울 마포구 월드컵북로 120',
    lat: 37.5663,
    lng: 126.9015,
    ownerId: 'u-admin',
    memberIds: ['u-admin', 'u-w1', 'u-w2', 'u-w3'],
    startProgress: 12,
    finalProgress: 43.2,
    count: 12,
    every: 2,
    lastDaysAgo: 0,
    pendingLast: 2,
    photos: [0, 1, 3],
    works: [
      '4층 기둥 철근 배근 완료, 동바리 설치 착수',
      '3층 슬래브 콘크리트 타설',
      '3층 전기 배관 및 배선 작업 완료',
      '3층 급수 배관 설치',
      '3층 기둥 거푸집 해체',
      '2층 슬래브 양생 및 먹매김',
      '2층 벽체 철근 배근',
      '지하 1층 방수 작업',
    ],
  },
  {
    id: 's-2',
    name: '세종 근린생활시설 신축공사',
    workType: '건축 공사(신축)',
    address: '세종 한누리대로 2130',
    lat: 36.48,
    lng: 127.289,
    ownerId: 'u-admin',
    memberIds: ['u-admin', 'u-w2', 'u-w4'],
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
      '1층 상가 경량 벽체 석고보드 마감',
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
    ownerId: 'u-admin',
    memberIds: ['u-admin', 'u-w1', 'u-w3'],
    startProgress: 8,
    finalProgress: 28.7,
    count: 7,
    every: 3,
    lastDaysAgo: 4, // 보고 지연 현장
    pendingLast: 1,
    photos: [1, 0, 2],
    works: [
      '증축동 기초 콘크리트 타설',
      '기초 철근 배근 검측',
      '터파기 및 버림 콘크리트',
      '기존동 접합부 철거',
      '증축동 앵커볼트 설치',
    ],
  },
  {
    id: 's-4',
    name: '해오름 아파트 리모델링',
    workType: '리모델링 공사',
    address: '부산 해운대구 좌동순환로 45',
    lat: 35.169,
    lng: 129.175,
    ownerId: 'u-admin',
    memberIds: ['u-admin', 'u-w2', 'u-w4'],
    startProgress: 62,
    finalProgress: 91.2,
    count: 9,
    every: 2,
    lastDaysAgo: 1,
    pendingLast: 0,
    photos: [5, 4, 3],
    works: [
      '세대 내부 도배 및 바닥재 시공',
      '주방 상부장 설치',
      '욕실 도기 설치',
      '세대 전기 콘센트·스위치 교체',
      '발코니 샷시 교체',
    ],
  },
  {
    id: 's-5',
    name: '원주 단독주택 욕실 리모델링',
    workType: '욕실 리모델링',
    address: '강원 원주시 단구로 88',
    lat: 37.3285,
    lng: 127.9468,
    ownerId: 'u-admin',
    memberIds: ['u-admin', 'u-w4'],
    startProgress: 0,
    finalProgress: 55,
    count: 5,
    every: 2,
    lastDaysAgo: 0,
    pendingLast: 1,
    photos: [2, 5, 4],
    works: ['욕실 방수 1차 시공', '욕실 급배수 배관 교체', '기존 타일 철거 및 폐기물 반출'],
  },
];

const WEATHERS = ['sunny', 'sunny', 'cloudy', 'sunny', 'rain', 'cloudy'];
const EQUIPMENT = ['타워크레인', '펌프카', '고소작업대', '', '지게차', ''];
const MEMOS = [
  '',
  '자재 반입 지연으로 오후 작업 시작.',
  '안전 점검 완료 후 작업 진행.',
  '',
  '내일 오전 검측 예정.',
];

function makeReports(plan, now, rand) {
  const authors = plan.memberIds.filter((id) => id !== 'u-admin');
  const steps = [];
  // 진행률: start → final 을 count 단계로 고르지 않게 나눈다
  let weights = Array.from({ length: plan.count }, () => 0.5 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  weights = weights.map((w) => w / sum);
  let acc = plan.startProgress;
  for (let i = 0; i < plan.count; i += 1) {
    const from = acc;
    acc = i === plan.count - 1 ? plan.finalProgress : acc + (plan.finalProgress - plan.startProgress) * weights[i];
    steps.push({ from: Math.round(from * 10) / 10, to: Math.round(acc * 10) / 10 });
  }

  return steps.map((step, i) => {
    const newestIndex = plan.count - 1 - i; // 0 = 가장 최근
    const daysAgo = plan.lastDaysAgo + newestIndex * plan.every;
    const created = at(now, daysAgo, 9 + Math.floor(rand() * 8), Math.floor(rand() * 60), 40 + newestIndex * 90);
    const authorId = authors[i % authors.length];
    const author = USERS.find((u) => u.id === authorId);
    const work = plan.works[newestIndex % plan.works.length];

    const photoCount = 1 + Math.floor(rand() * 3);
    const photos = Array.from({ length: photoCount }, (_, p) => {
      const taken = new Date(created.getTime() - (10 + Math.floor(rand() * 80)) * MIN);
      return {
        url: PHOTOS[plan.photos[(i + p) % plan.photos.length]],
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

    // 자동 검사 예시 (서버 report_checks와 같은 종류)
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

    // 검토 상태: 최근 pendingLast건은 대기, 나머지는 승인 (+ 보완 요청 예시)
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

    const files =
      newestIndex === 2
        ? [{ name: `${plan.name}_작업일보.pdf`, url: '#', size: 184_320 }]
        : [];

    return {
      id: `${plan.id}-r${String(i + 1).padStart(2, '0')}`,
      siteId: plan.id,
      processKey: 'work',
      processName: '',
      work,
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

export function createSeed(now = new Date()) {
  const rand = mulberry32(20261015);
  const reports = SITE_PLANS.flatMap((plan) => makeReports(plan, now, rand));
  const sites = SITE_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    workType: p.workType,
    ownerId: p.ownerId,
    code: String(100000 + Math.floor(rand() * 899999)),
    companyId: 'c-1',
    memberIds: p.memberIds,
    latitude: p.lat,
    longitude: p.lng,
  }));
  return {
    users: USERS.map((u) => ({ ...u })),
    companies: COMPANIES.map((c) => ({ ...c })),
    sites,
    reports,
  };
}
