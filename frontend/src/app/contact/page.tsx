import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LeadForm } from '@/components/forms/LeadForm';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { getSiteSettings } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

// 表单是唯一的写路径，页面本身保持动态渲染（spec §3.1）
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  '无论您关注的是研发流程的人机协同、通用智能体的安全边界，还是合同链条上的风险穿透，我们都欢迎带着真实问题的对话。';

export const metadata: Metadata = pageMetadata({
  title: '联系我们',
  description: DESCRIPTION,
  path: ROUTES.contact,
});

export default async function ContactPage() {
  const [settings, media] = await Promise.all([getSiteSettings(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.contact);
  const { contact } = settings;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="CONTACT"
        title="与智瞳安宇一起，构建值得信任的智能未来"
        subtitle={DESCRIPTION}
        media={media.get('stock-contact')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="contact-title">
        <div className="container">
          <h2 id="contact-title" className="visually-hidden">
            联系方式与咨询表单
          </h2>

          <div className="contact-layout">
            <Reveal>
              <Suspense fallback={<div className="skeleton" style={{ height: 640 }} />}>
                <LeadForm contact={contact} />
              </Suspense>
            </Reveal>

            <Reveal delay={1} className="contact-aside">
              <div className="contact-block">
                <h4>商务咨询</h4>
                <p>
                  <a href={`mailto:${contact.businessEmail}`}>{contact.businessEmail}</a>
                </p>
                {contact.phone ? (
                  <p>
                    <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
                  </p>
                ) : null}
                {contact.workingHours ? <p>{contact.workingHours}</p> : null}
              </div>

              <div className="contact-block">
                <h4>加入我们</h4>
                <p>
                  简历请发送至{' '}
                  <a href={`mailto:${contact.careersEmail}`}>{contact.careersEmail}</a>，
                  或在表单中把咨询意向选为「加入我们」。
                </p>
              </div>

              <div className="contact-block">
                <h4>公司信息</h4>
                <p>{settings.legalName}</p>
                {contact.address ? <p>{contact.address}</p> : null}
              </div>

              <div className="contact-block">
                <h4>关于您的信息</h4>
                <p>
                  我们只将您提交的信息用于本次商务联系；服务端不存储明文 IP，手机号与邮箱在日志与管理界面中一律脱敏。详见
                  {' '}
                  <a href={ROUTES.legalPrivacy}>《个人信息保护政策》</a>。
                </p>
              </div>

              {settings.pendingConfirmation.length > 0 ? (
                <div className="contact-block">
                  <h4>信息更新说明</h4>
                  <p>
                    本站部分联系方式与备案信息正在与客户确认中，最终以客户提供的正式信息为准。
                  </p>
                </div>
              ) : null}
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
