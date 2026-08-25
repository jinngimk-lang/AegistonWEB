'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { ROUTES } from '@/lib/routes';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[page-error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="status-page">
      <div className="container">
        <div className="status-code">500</div>
        <h1>页面暂时无法显示</h1>
        <p>
          我们已经记录了这次异常。您可以重试一次；如果问题持续，请直接联系商务，我们会尽快处理。
        </p>
        <div className="status-actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            重试
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </button>
          <Link href={ROUTES.contact} className="btn btn-outline">
            联系我们
          </Link>
        </div>
        {error.digest ? (
          <p className="source-note" style={{ marginTop: 24 }}>
            错误标识：{error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
