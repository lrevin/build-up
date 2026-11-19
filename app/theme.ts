// Build Up 공통 디자인 값
// 원칙: 바탕은 밝게, 남색은 글자색으로, 노란색은 주요 버튼·오늘 작업분에만.
export const colors = {
  // 브랜드
  navy: '#121722', // 진한 글자, 누적 막대
  yellow: '#F9B51D', // 주요 버튼, 오늘 작업분
  yellowSoft: '#FEF6E0', // 노란 강조의 옅은 배경

  // 글자
  text: '#121722',
  textSub: '#5F6474', // 보조 글자(바탕 대비 4.5:1 이상)
  textMuted: '#666D7C', // 흐린 글자(화면 바탕에서도 대비 4.5:1 이상)
  gray: '#6B7080', // (이전 이름 호환)

  // 면
  background: '#F2F4F7', // 화면 바탕
  white: '#FFFFFF', // 카드·상단바
  fill: '#F3F4F6', // 칩·세그먼트 바탕
  border: '#E4E7EC',
  divider: '#F0F1F3',
  track: '#ECEEF1', // 진행률 막대 바탕

  danger: '#E5484D',
  success: '#1F9D55',

  // 로그인·회원가입 바탕(웹 대시보드와 같은 색)
  ink950: '#0D1118', // 화면 바탕
  ink900: '#121823', // 상단바
  ink800: '#1B2330', // 테두리·구분선
  ink400: '#8792A2', // 어두운 바탕 위 보조 글자
};

export const radius = { sm: 10, md: 14, lg: 20 };

// 카드·상자에 쓰는 그림자(바탕에서 떠 있는 느낌)
export const shadow = {
  shadowColor: '#1B2333',
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

// 버튼 입체감: 아래쪽 진한 테두리(두께) + 같은 색 계열 그림자. 누르면 pressedRaised로 눌린 모양
export const raised = {
  primary: {
    backgroundColor: '#F9B51D',
    borderBottomWidth: 4,
    borderBottomColor: '#D3950A',
    shadowColor: '#E0A200',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  dark: {
    backgroundColor: '#121722',
    borderBottomWidth: 4,
    borderBottomColor: '#000000',
    shadowColor: '#121722',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderBottomWidth: 3,
    borderBottomColor: '#CDD2DA',
    shadowColor: '#1B2333',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

// 눌렀을 때: 두께가 줄고 살짝 내려가며 그림자가 작아진다
export const pressedRaised = {
  borderBottomWidth: 1,
  transform: [{ translateY: 3 }],
  shadowOpacity: 0.15,
  elevation: 1,
};

// 여백 규칙: 화면 좌우·카드 안쪽은 모두 gutter(20)로 맞춘다
export const space = { gutter: 20, cardGap: 12 };

export const font = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  sub: { fontSize: 13, color: colors.textSub },
  caption: { fontSize: 12, color: colors.textMuted },
};
