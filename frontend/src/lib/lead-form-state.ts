/**
 * 线索表单的状态类型与初始值。
 *
 * ⚠️ 这些**不能**放在 `src/app/actions/lead.ts` 里：带 `'use server'` 的模块
 * **只允许导出 async 函数**。从中导出一个普通对象（`INITIAL_LEAD_STATE`）会让
 * 客户端在导入时抛错 —— 表现是表单渲染正常、但提交后没有任何反馈，
 * 因为 `useActionState` 根本没接上。这类失效不影响构建，只在运行时暴露。
 */

export interface LeadFormState {
  status: 'idle' | 'success' | 'error' | 'rate-limited';
  message?: string;
  fieldErrors?: Record<string, string>;
  leadId?: string;
  duplicate?: boolean;
}

export const INITIAL_LEAD_STATE: LeadFormState = { status: 'idle' };
