import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export function parsePagination(searchParams: URLSearchParams): PaginationQuery {
  const raw: Record<string, string> = {};
  searchParams.forEach((v, k) => { raw[k] = v; });
  return paginationSchema.parse(raw);
}

export function computePagination(totalItems: number, page: number, limit: number) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
}
