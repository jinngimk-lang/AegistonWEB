'use server';

/**
 * 线索提交 Server Action（spec §4.2 路径 C）。
 *
 * 1. `<LeadForm>`（client, `useActionState`）→ 本 Action
 * 2. 第一层校验（zod），再 `POST /api/v1/leads`，透传 `X-Request-Id`
 * 3. FastAPI 做 honeypot / 分层限流 / Pydantic 校验 / 落库
 * 4. 前端展示结果并 `router.replace` 清空 query
 *
 * ⚠️ 429 时必须**同时**展示商务电话与邮箱，绝不让用户走进死路
 * （spec §7.3.1「可观测与人工兜底」）—— 由 `LeadForm` 渲染。
 *
 * ⚠️ 本文件带 `'use server'`，因此**只能导出 async 函数**。
 * 状态类型与初始值放在 `@/lib/lead-form-state` —— 从这里导出一个普通对象会让
 * 客户端导入时抛错，表现是「表单能填、提交后没反应」，而且构建期不会报。
 */

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { LeadFormState } from '@/lib/lead-form-state';
import type { LeadCreated, ProblemDetail } from '@/types/content';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000';

const CN_MOBILE = /^1[3-9]\d{9}$/;
const INTL_PHONE = /^\+?[0-9\-\s]{7,20}$/;

const schema = z.object({
  name: z.string().trim().min(2, '姓名至少 2 个字').max(40, '姓名不超过 40 个字'),
  company: z.string().trim().min(2, '单位名称至少 2 个字').max(80, '单位名称不超过 80 个字'),
  title: z.string().trim().max(40, '职务不超过 40 个字').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine((v) => CN_MOBILE.test(v) || INTL_PHONE.test(v), '手机号格式不正确'),
  email: z.string().trim().email('邮箱格式不正确').optional().or(z.literal('')),
  intent: z.enum(['demo', 'consult', 'trial', 'partner', 'career']),
  product: z.enum(['aragonteam', 'inkclaw', 'legallens', 'platform']).optional().or(z.literal('')),
  message: z.string().trim().max(1000, '留言不超过 1000 字').optional().or(z.literal('')),
  consent: z.literal('on', { errorMap: () => ({ message: '需要勾选同意后才能提交' }) }),
  website: z.string().optional(),
  sourcePath: z.string().optional(),
});

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', message: '请检查表单中标红的字段。', fieldErrors };
  }

  const data = parsed.data;
  const requestId = randomUUID().replace(/-/g, '');

  const payload = {
    name: data.name,
    company: data.company,
    title: data.title || null,
    phone: data.phone,
    email: data.email || null,
    intent: data.intent,
    product: data.product || null,
    message: data.message || null,
    consent: true,
    website: data.website ?? '',
    sourcePath: data.sourcePath || null,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (res.ok) {
      const created = (await res.json()) as LeadCreated;
      return {
        status: 'success',
        leadId: created.id,
        duplicate: created.duplicate,
        message: created.duplicate
          ? '我们已经收到过这条信息，商务同事会尽快与您联系。'
          : '提交成功，我们会在 1–2 个工作日内与您联系。',
      };
    }

    const problem = (await res.json().catch(() => null)) as ProblemDetail | null;

    if (res.status === 429) {
      return {
        status: 'rate-limited',
        message: problem?.detail ?? '提交过于频繁，请稍后再试。',
      };
    }

    if (res.status === 422 && problem?.errors) {
      const fieldErrors: Record<string, string> = {};
      for (const item of problem.errors) {
        if (!fieldErrors[item.field]) fieldErrors[item.field] = problem.detail;
      }
      return { status: 'error', message: problem.detail, fieldErrors };
    }

    return {
      status: 'error',
      message: problem?.detail ?? '提交失败，请稍后重试或直接通过邮件联系我们。',
    };
  } catch {
    return {
      status: 'error',
      message: '网络异常，暂时无法提交。请稍后重试，或直接通过邮件联系我们。',
    };
  }
}
