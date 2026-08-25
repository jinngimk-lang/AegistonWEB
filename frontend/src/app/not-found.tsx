import Link from 'next/link';

import { ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <div className="status-page">
      <div className="container">
        <div className="status-code">404</div>
        <h1>这个页面不存在</h1>
        <p>
          链接可能已经变更，或者地址输入有误。您可以从网站地图找到需要的内容，
          也可以直接联系我们。
        </p>
        <div className="status-actions">
          <Link href={ROUTES.home} className="btn btn-primary">
            返回首页
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href={ROUTES.sitemap} className="btn btn-outline">
            查看网站地图
          </Link>
        </div>
      </div>
    </div>
  );
}
