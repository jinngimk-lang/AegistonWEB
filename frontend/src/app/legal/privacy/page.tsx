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

const DESCRIPTION = '本政策说明我们如何收集、使用与保护您通过本网站提交的个人信息。';

export const metadata: Metadata = pageMetadata({
  title: '个人信息保护政策',
  description: DESCRIPTION,
  path: ROUTES.legalPrivacy,
});

export default async function PrivacyPage() {
  const [settings, media] = await Promise.all([getSiteSettings(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.legalPrivacy);

  return (
    <>
      <PageHero
        eyebrow="PRIVACY"
        title="个人信息保护政策"
        subtitle={DESCRIPTION}
        media={media.get('stock-contact')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="政策正文">
        <div className="container">
          <article className="article">
            <Reveal>
              <Callout title="文本状态">
                <p>
                  以下为依据《中华人民共和国个人信息保护法》起草的通用文本草案，用于说明本站当前的实际做法。
                  正式文本待{settings.legalName}法务提供后替换。
                </p>
              </Callout>
            </Reveal>

            <Reveal delay={1}>
              <div className="prose" style={{ marginTop: 32 }}>
                <h2>一、我们收集哪些信息</h2>
                <p>
                  仅在您主动提交「联系我们」表单时，收集您填写的：姓名、单位名称、职务（可选）、手机号、邮箱（可选）、咨询意向、关注的产品（可选）与留言内容。
                </p>
                <p>
                  服务端另会记录用于反滥用的技术信息：请求标识（Request Id）、浏览器 User-Agent，以及
                  <strong>经加盐哈希后的 IP</strong>。我们
                  <strong>不存储明文 IP</strong>。
                </p>

                <h2>二、我们如何使用这些信息</h2>
                <ul>
                  <li>与您进行本次商务联系，包括安排演示、技术交流与方案沟通；</li>
                  <li>防止表单被自动化程序滥用（分层限流与重复提交识别）；</li>
                  <li>在您明确同意的前提下，向您发送与咨询内容相关的资料。</li>
                </ul>
                <p>我们不会将您的信息用于与上述目的无关的用途，也不会对外出售。</p>

                <h2>三、告知同意</h2>
                <p>
                  表单必须勾选同意后才能提交（服务端同样校验）。您可以随时通过下方邮箱撤回同意；撤回不影响撤回前基于同意进行的处理。
                </p>

                <h2>四、脱敏与访问控制</h2>
                <ul>
                  <li>手机号与邮箱在服务端日志中一律打码，不落明文；</li>
                  <li>管理接口返回的手机号与邮箱同样为脱敏形式；</li>
                  <li>管理接口需要独立令牌，且使用常量时间比较，防止令牌被逐位试探。</li>
                </ul>

                <h2>五、保留期限</h2>
                <p>
                  线索信息在商务跟进结束后保留不超过 24
                  个月，用于后续服务与合规审计；超期后删除或做不可逆匿名化处理。
                </p>

                <h2>六、您的权利</h2>
                <p>
                  您有权查阅、复制、更正、补充与删除您的个人信息，也有权要求解释处理规则。请通过下方邮箱联系我们，我们会在收到请求后
                  15 个工作日内答复。
                </p>

                <h2>七、Cookie 与第三方</h2>
                <p>
                  本站不使用广告或分析类 Cookie，不接入任何第三方统计脚本。全部图片与字体均已本地化，
                  运行期不向任何外部域发起请求。
                </p>

                <h2>八、联系方式</h2>
                <p>
                  {settings.legalName}
                  <br />
                  个人信息保护相关事宜：
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
