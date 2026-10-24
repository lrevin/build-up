import { useEffect } from 'react';

// 브라우저 탭 이름: "Build Up · 본사 관리자" 처럼 화면 영역을 붙인다
export default function useDocumentTitle(section) {
  useEffect(() => {
    document.title = section ? `Build Up · ${section}` : 'Build Up';
  }, [section]);
}
