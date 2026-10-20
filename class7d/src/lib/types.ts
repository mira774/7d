export type Role = 'owner' | 'moderator' | 'student'
export type Perm = 'homework' | 'answer' | 'news' | 'schedule'
export const PERMS: { key: Perm; label: string }[] = [
  { key: 'homework', label: 'Домашние задания' }, { key: 'answer', label: 'Ответы и материалы' },
  { key: 'news', label: 'Объявления' }, { key: 'schedule', label: 'Расписание' },
]
export const ROLE_LABEL: Record<Role, string> = { owner: 'Владелец', moderator: 'Модератор', student: 'Ученик' }
export interface Profile { id: string; login: string; full_name: string; role: Role; perms: Perm[] }
export interface FileRef { path: string; name: string; type: string; size: number }
export type PostKind = string;
export interface Post { id: string; kind: PostKind; title: string; body: string; subject: string; due_date: string | null; pinned: boolean; files: FileRef[]; author_id: string | null; created_at: string }
export interface Lesson { id: string; weekday: number; lesson_no: number; subject: string; start_time: string; end_time: string; room: string; note: string }
export interface Msg { id: string; author_id: string; body: string; created_at: string }
