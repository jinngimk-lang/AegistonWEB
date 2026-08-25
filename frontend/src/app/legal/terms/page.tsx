import type { Metadata } from 'next';

import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { getSiteSettings } from '@/lib/api';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION = '本条款说明访问与使用本网站时双方的权利与义务。';

export const metadata: Metadata = pageMetadata({
  title: '使用条款',
  description: DESCRIPTION,
  path: ROUTES.legalTerms,
});

export default async function TermsPage() {
  const [settings, media] = await Promise.all([getSiteSettings(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.legalTerms);

  return (
    <>
      <PageHero
        eyebrow="TERMS"
        title="使用条款"
        subtitle={DESCRIPTION}
        media={media.get('stock-about')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="条款正文">
        <div className="container">
          <article className="article">
            <Reveal>
              <Callout title="文本状态">
                <p>
                  以下为通用条款草案，用于说明本站当前的实际做法。正式文本待
                  {settings.legalName}法务提供后替换。
                </p>
              </Callout>
            </Reveal>

            <Reveal delay={1}>
              <div className="prose" style={{ marginTop: 32 }}>
                <h2>一、适用范围</h2>
                <p>
                  本条款适用于您对本网站的访问与使用。继续使用本网站，即表示您已阅读并同意本条款。
                </p>

                <h2>二、内容性质与准确性</h2>
                <p>
                  本网站的产品说明、技术参数、行业案例与效能数据，均整理自{settings.legalName}
                  的产品资料，并在页面上逐条标注来源页码。这些内容用于介绍产品能力，
                  <strong>不构成要约或对特定业务结果的承诺</strong>。
                </p>
                <p>
                  涉及具体客户的案例数据以案例页标注的口径为准；部分数据尚在与客户确认中，页面已在对应位置注明。
                  正式商务合作以双方签署的书面协议为准。
                </p>

                <h2>三、第三方名称与商标</h2>
                <p>
                  本网站可能提及第三方机构、高校或产品名称，仅用于客观说明来源与依托关系，
                  相关商标与名称权利归各自权利人所有。本网站不作对比性或评价性表述。
                </p>

                <h2>四、知识产权</h2>
                <p>
                  除已在<a href={ROUTES.legalCredits}>「图片来源」</a>
                  页标注授权的外部配图外，本网站的文字、界面截图、示意图、页面设计与代码
                  均归{settings.legalName}所有。未经书面许可，不得复制、改编或用于商业用途。
                </p>

                <h2>五、可用性</h2>
                <p>
                  我们会尽力保持网站可用，但不对不可抗力、网络故障或第三方基础设施导致的中断承担责任。
                  内容可能随产品迭代更新，恕不另行通知。
                </p>

                <h2>六、禁止行为</h2>
                <ul>
                  <li>以自动化方式大量抓取本站内容或滥用表单提交接口；</li>
                  <li>尝试绕过访问控制、探测或攻击本站及其后端服务；</li>
                  <li>以引人误解的方式转载本站内容，或删除内容中的来源标注。</li>
                </ul>

                <h2>七、适用法律</h2>
                <p>
                  本条款适用中华人民共和国法律。因本条款产生的争议，双方应友好协商；协商不成的，提交
                  {settings.legalName}所在地有管辖权的人民法院解决。
                </p>

                <h2>八、联系方式</h2>
                <p>
                  {settings.legalName}
                  <br />
                  <a href={`mailto:${settings.contact.businessEmail}`}>
                    {settings.contact.businessEmail}
                  </a>
                </p>
              </div>
            </Reveal>
          </article>
        </div>
      </section>
    </>
  );
}
