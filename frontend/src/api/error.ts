import * as z from "zod";

export const APIErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  issues: z.array(z.custom<z.core.$ZodIssue>()).optional(),
});

export type APIErrorDTO = z.infer<typeof APIErrorSchema>;

export class APIError extends Error {
  code: number;
  issues: z.core.$ZodIssue[];

  constructor(
    message: string,
    code: number,
    issues?: z.core.$ZodIssue[]
  ) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.issues = issues ?? [];
  }

  static fromDTO(dto: APIErrorDTO) {
    return new APIError(dto.message, dto.code, dto.issues);
  }
}
