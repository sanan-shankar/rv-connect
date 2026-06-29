import { z } from "zod/v4";
import { SUBJECT_VALUES, AREA_VALUES, ERA_VALUES } from "./collection";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    accountType: z.enum(["alumnus", "teacher", "ex_teacher"]).default("alumnus"),
    batchType: z.enum(["ICSE", "ISC"]).optional(),
    batchYear: z.number().int().min(1926).max(new Date().getFullYear() + 1).optional(),
    yearJoined: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
    yearLeft: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  })
  .refine((d) => d.accountType !== "alumnus" || (d.batchType && d.batchYear), {
    message: "Alumni need a batch type and graduation year",
    path: ["batchYear"],
  });

export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().max(1000).optional(),
  currentCity: z.string().max(100).optional(),
  workplace: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  instagram: z.string().max(100).optional(),
  linkedin: z.string().max(200).optional(),
  accountType: z.enum(["alumnus", "teacher", "ex_teacher"]).optional(),
  batchType: z.enum(["ICSE", "ISC"]).optional(),
  batchYear: z.number().int().min(1926).max(new Date().getFullYear() + 1).optional(),
  yearJoined: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  yearLeft: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  admissionNumber: z.number().int().min(0).max(10000).optional(),
  taughtFrom: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  taughtUntil: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  subjects: z.string().max(200).optional(),
});

export const postSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(20000),
  kind: z.enum(["post", "letter"]).optional(),
  title: z.string().max(160).optional(),
  tag: z
    .enum(["campus-memory", "life-update", "looking-for-connections", "photo", "general"])
    .optional(),
  targetBatches: z.string().optional(),
  groupId: z.string().optional(),
  images: z.string().optional(),
  pollOptions: z.array(z.string().min(1).max(200)).min(2).max(4).optional(),
});

export const photoSchema = z.object({
  caption: z.string().max(300).optional(),
  subject: z.array(z.enum(SUBJECT_VALUES as [string, ...string[]])).min(1, "Pick at least one subject"),
  area: z.enum(AREA_VALUES as [string, ...string[]]).optional(),
  era: z.enum(ERA_VALUES as [string, ...string[]]).optional(),
  freeTags: z.string().max(200).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000),
  postId: z.string().min(1),
  parentId: z.string().optional(),
});

export const reportSchema = z.object({
  postId: z.string().min(1),
  reason: z.string().min(1, "Please provide a reason").max(500),
});
