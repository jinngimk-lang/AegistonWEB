/** 极简 className 合并。项目不引入 Tailwind，也不需要 clsx。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
