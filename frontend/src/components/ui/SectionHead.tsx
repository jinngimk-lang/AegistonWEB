/**
 * 区块标题（ref `.section-head` / `.section-label` / `.section-title` /
 * `.section-desc` / `.section-more`）。
 *
 * ⚠️ ref 里有 `.philosophy-head .section-label{justify-content:center}` 与
 * `.solutions-intro .section-label::after` 这类**跨组件后代选择器**，因此本组件
 * 输出的类名必须是**字符串字面量**、来自全局层，不经 `styles.*` 间接层。
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Reveal } from '@/components/ui/Reveal';

interface Props {
  label: string;
  titleLead: string;
  titleEm?: string;
  titleTail?: string;
  description?: string;
  more?: { label: string; href: string };
  headingLevel?: 'h2' | 'h3';
  children?: ReactNode;
}

export function SectionHead({
  label,
  titleLead,
  titleEm,
  titleTail,
  description,
  more,
  headingLevel: Heading = 'h2',
  children,
}: Props) {
  return (
    <div className="section-head">
      <Reveal className="section-head-left">
        <div className="section-label">{label}</div>
        <Heading className="section-title">
          {titleLead}
          {titleEm ? (
            <>
              <br />
              <span className="em">{titleEm}</span>
            </>
          ) : null}
          {titleTail}
        </Heading>
        {description ? <p className="section-desc">{description}</p> : null}
        {children}
      </Reveal>
      {more ? (
        <Reveal as="span" delay={1}>
          <Link href={more.href} className="section-more">
            {more.label} <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      ) : null}
    </div>
  );
}
