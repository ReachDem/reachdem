export type CursorValue = string;
export type SearchQuery = string;
export type IsoDateString = string;
export type ApiEndpointPath = string;
export type ApiUrl = string;
export type ErrorMessage = string;

export interface Page<T> {
  items: T[];
  meta: {
    total: number;
    limit: number;
    nextCursor: CursorValue | null;
  };
}
