import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-4xl font-black text-gray-300">404</p>
      <p className="mt-2 text-sm text-gray-600">페이지를 찾을 수 없어요.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-gray-900 underline">
        대시보드로 이동
      </Link>
    </div>
  );
}
