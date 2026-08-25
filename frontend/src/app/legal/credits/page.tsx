import type { Metadata } from 'next';

import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { getMediaManifest } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION =
  '本站使用的全部外部配图的来源与授权信息。所有图片在构建期已下载并转码入库，运行期不依赖任何外部 CDN。';

export const metadata: Metadata = pageMetadata({
  title: '图片来源',
  description: DESCRIPTION,
  path: ROUTES.legalCredits,
});

export default async function CreditsPage() {
  const [manifest, media] = await Promise.all([getMediaManifest(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.legalCredits);
  const screenshots = manifest.assets.filter((a) => a.kind === 'screenshot');
  const diagrams = manifest.assets.filter((a) => a.kind === 'diagram');
  const photos = manifest.assets.filter((a) => a.kind === 'photo');
  const videos = manifest.assets.filter((a) => a.kind === 'video');
  const redacted = manifest.assets.filter((a) => a.redacted);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="IMAGE CREDITS"
        title="图片来源"
        subtitle={DESCRIPTION}
        media={media.get('stock-about')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="stock-title">
        <div className="container">
          <Reveal>
            <div className="section-label">EXTERNAL IMAGERY</div>
            <h2 className="section-title" id="stock-title" style={{ marginBottom: 24 }}>
              外部配图
            </h2>
            <p className="section-desc" style={{ marginBottom: 32 }}>
              共 {manifest.stock.length} 张。Unsplash License 不强制署名；Wikimedia
              的西安 CBD 天际线为 CC0 1.0，署名为自愿标注。
            </p>
          </Reveal>

          <Reveal delay={1}>
            <div className="scroll-x">
              <table className="credit-table">
                <caption className="visually-hidden">外部配图的来源与授权</caption>
                <thead>
                  <tr>
                    <th scope="col">资源 ID</th>
                    <th scope="col">说明</th>
                    <th scope="col">来源</th>
                    <th scope="col">授权</th>
                    <th scope="col">原始页面</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.stock.map((credit) => (
                    <tr key={credit.id}>
                      <td>{credit.id}</td>
                      <td>{credit.alt}</td>
                      <td>{credit.source === 'unsplash' ? 'Unsplash' : 'Wikimedia Commons'}</td>
                      <td>
                        {credit.licenseUrl ? (
                          <a href={credit.licenseUrl} rel="noopener noreferrer" target="_blank">
                            {credit.license}
                          </a>
                        ) : (
                          credit.license
                        )}
                      </td>
                      <td>
                        {credit.originUrl ? (
                          <a href={credit.originUrl} rel="noopener noreferrer" target="_blank">
                            {credit.photoId}
                          </a>
                        ) : (
                          credit.photoId
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="product-title">
        <div className="container">
          <Reveal>
            <div className="section-label">PRODUCT IMAGERY</div>
            <h2 className="section-title" id="product-title" style={{ marginBottom: 24 }}>
              产品截图与示意图
            </h2>
            <p className="section-desc" style={{ marginBottom: 32 }}>
              共 {manifest.assets.length} 项，全部提取自《智瞳安宇总体产品介绍
              V7》：真实软件界面截图 {screenshots.length} 张、架构与流程示意图{' '}
              {diagrams.length} 张、场景配图 {photos.length} 张、动图（已转 MP4）{' '}
              {videos.length} 段。版权归西安智瞳安宇科技有限公司所有。
            </p>
            <Callout tone="neutral" title="截图中的隐私打码">
              <p>
                产品截图取自真实运行环境。其中 {redacted.length}{' '}
                张原本带出了第三方企业名称、企业信用评分、法定代表人姓名、
                合同金额、内网服务器地址或成员邮箱 ——
                这些区域已在构建期做不可逆的马赛克处理（区块均值化，
                而非可被反卷积还原的模糊）。界面本身未做任何美化或重绘，
                打码之外所见即产品实际形态。
              </p>
            </Callout>
            <Callout tone="neutral" title="EMF 架构图的处理">
              <p>
                PPT p.65 的系统总体架构图原始格式为 EMF 矢量，Web
                无法直接使用、光栅化后会模糊。本站用 React + 内联 SVG
                重绘，以获得响应式、可主题化与无障碍支持，见「合约智审」产品页。
              </p>
            </Callout>
          </Reveal>
        </div>
      </section>
    </>
  );
}
