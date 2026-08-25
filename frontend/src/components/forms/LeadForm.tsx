'use client';

/**
 * 线索表单（spec §4.2 路径 C / §10.3 表单无障碍）。
 *
 * - `<label>` 显式绑定；`aria-describedby` 关联错误与提示
 * - `aria-live="polite"` 播报提交结果
 * - 错误时焦点移到首个非法字段
 * - honeypot 字段 `website` 视觉隐藏但不使用 `display:none`（部分机器人会跳过）
 * - **429 时同时展示商务邮箱与电话**，绝不让用户走进死路（spec §7.3.1）
 */

import { useActionState, useEffect, useId, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '@/components/forms/LeadForm.module.css';
import { Toast } from '@/components/ui/Toast';
import { submitLead } from '@/app/actions/lead';
import { INITIAL_LEAD_STATE } from '@/lib/lead-form-state';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/lib/routes';
import type { ContactInfo, LeadIntent, LeadProduct } from '@/types/content';

const INTENTS: { value: LeadIntent; label: string }[] = [
  { value: 'demo', label: '预约产品演示' },
  { value: 'consult', label: '商务咨询' },
  { value: 'trial', label: '申请试用' },
  { value: 'partner', label: '生态合作' },
  { value: 'career', label: '加入我们' },
];

const PRODUCTS: { value: LeadProduct | ''; label: string }[] = [
  { value: '', label: '暂不指定' },
  { value: 'aragonteam', label: 'AragonTeam · 组织级' },
  { value: 'inkclaw', label: 'InkClaw · 通用级' },
  { value: 'legallens', label: 'LegalLens 合约智审 · 行业级' },
  { value: 'platform', label: '整体平台与交付形态' },
];

function isIntent(value: string | null): value is LeadIntent {
  return INTENTS.some((i) => i.value === value);
}

function isProduct(value: string | null): value is LeadProduct {
  return PRODUCTS.some((p) => p.value !== '' && p.value === value);
}

export function LeadForm({ contact }: { contact: ContactInfo }) {
  const [state, formAction, pending] = useActionState(submitLead, INITIAL_LEAD_STATE);
  const params = useSearchParams();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  const intentParam = params.get('intent');
  const productParam = params.get('product');
  const defaultIntent: LeadIntent = isIntent(intentParam) ? intentParam : 'consult';
  const defaultProduct: LeadProduct | '' = isProduct(productParam) ? productParam : '';

  // 提交成功后清空 query，避免刷新重复带上 intent/product
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      if (params.toString()) router.replace(ROUTES.contact, { scroll: false });
    }
  }, [state.status, params, router]);

  // 校验失败时把焦点移到首个非法字段
  useEffect(() => {
    if (state.status !== 'error' || !state.fieldErrors) return;
    const firstKey = Object.keys(state.fieldErrors)[0];
    if (!firstKey) return;
    const node = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
    node?.focus();
  }, [state]);

  const errorFor = (field: string) => state.fieldErrors?.[field];

  return (
    <form ref={formRef} action={formAction} className={cn(styles.form, pending && styles.submitting)} noValidate>
      <input type="hidden" name="sourcePath" value={ROUTES.contact} />

      <div className={styles.row}>
        <Field
          id={`${id}-name`}
          name="name"
          label="姓名"
          required
          autoComplete="name"
          placeholder="请输入您的姓名"
          error={errorFor('name')}
        />
        <Field
          id={`${id}-company`}
          name="company"
          label="单位名称"
          required
          autoComplete="organization"
          placeholder="请输入单位全称"
          error={errorFor('company')}
        />
      </div>

      <div className={styles.row}>
        <Field
          id={`${id}-title`}
          name="title"
          label="职务"
          autoComplete="organization-title"
          placeholder="如：法务总监"
          error={errorFor('title')}
        />
        <Field
          id={`${id}-phone`}
          name="phone"
          label="手机号"
          required
          type="tel"
          autoComplete="tel"
          placeholder="如：13800138000"
          error={errorFor('phone')}
        />
      </div>

      <Field
        id={`${id}-email`}
        name="email"
        label="邮箱"
        type="email"
        autoComplete="email"
        placeholder="用于接收资料与会议邀请"
        error={errorFor('email')}
        hint="手机号与邮箱至少填写一项；我们只用于本次商务联系。"
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-intent`}>
            咨询意向
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          </label>
          <select
            id={`${id}-intent`}
            name="intent"
            className={styles.select}
            defaultValue={defaultIntent}
            required
          >
            {INTENTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-product`}>
            关注的产品
          </label>
          <select
            id={`${id}-product`}
            name="product"
            className={styles.select}
            defaultValue={defaultProduct}
          >
            {PRODUCTS.map((item) => (
              <option key={item.value || 'none'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-message`}>
          您想了解什么
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          className={cn(styles.textarea, errorFor('message') && styles.invalid)}
          placeholder="例如：希望了解上下游一致性审查在项目合同链场景下的落地方式。"
          aria-describedby={errorFor('message') ? `${id}-message-error` : undefined}
          aria-invalid={errorFor('message') ? true : undefined}
          maxLength={1000}
        />
        {errorFor('message') ? (
          <p className={styles.error} id={`${id}-message-error`}>
            {errorFor('message')}
          </p>
        ) : null}
      </div>

      {/* honeypot：真实用户看不到，机器人会填 */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${id}-website`}>请留空</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.field}>
        <label className={styles.consent} htmlFor={`${id}-consent`}>
          <input id={`${id}-consent`} name="consent" type="checkbox" required />
          <span>
            我已阅读并同意
            <a href={ROUTES.legalPrivacy} target="_blank" rel="noopener noreferrer">
              《个人信息保护政策》
            </a>
            ，同意智瞳安宇为本次商务联系处理上述信息。
            {errorFor('consent') ? (
              <>
                <br />
                <span className={styles.error}>{errorFor('consent')}</span>
              </>
            ) : null}
          </span>
        </label>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? '提交中…' : '提交信息'}
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </button>
        <span className={styles.hint}>我们会在 1–2 个工作日内与您联系。</span>
      </div>

      <div className={styles.live} aria-live="polite" aria-atomic="true">
        {state.status === 'success' ? (
          <Toast tone="success" title="已收到您的信息">
            <p>{state.message}</p>
          </Toast>
        ) : null}

        {state.status === 'rate-limited' ? (
          <Toast tone="error" title="提交已达上限">
            <p>{state.message}</p>
            <p>
              请直接联系商务：
              <a href={`mailto:${contact.businessEmail}`}>{contact.businessEmail}</a>
              {contact.phone ? (
                <>
                  {' · '}
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
                </>
              ) : null}
            </p>
          </Toast>
        ) : null}

        {state.status === 'error' ? (
          <Toast tone="error" title="提交未成功">
            <p>{state.message}</p>
            <p>
              如果问题持续，请直接发送邮件至{' '}
              <a href={`mailto:${contact.businessEmail}`}>{contact.businessEmail}</a>。
            </p>
          </Toast>
        ) : null}
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
}

function Field({
  id,
  name,
  label,
  required,
  type = 'text',
  autoComplete,
  placeholder,
  error,
  hint,
}: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={cn(styles.input, error && styles.invalid)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
