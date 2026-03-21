import { z } from "zod/v4";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("Please enter a valid email"),
  batchType: z.enum(["ICSE", "ISC"]),
  batchYear: z.number().int().min(1926).max(new Date().getFullYear() + 1),
  yearJoined: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  yearLeft: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  admissionNumber: z.number().int().min(0).max(10000).optional(),
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
  batchType: z.enum(["ICSE", "ISC"]),
  batchYear: z.number().int().min(1926).max(new Date().getFullYear() + 1),
  yearJoined: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  yearLeft: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  admissionNumber: z.number().int().min(0).max(10000).optional(),
});

export const postSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(5000),
  tag: z
    .enum(["campus-memory", "life-update", "looking-for-connections", "photo", "general"])
    .optional(),
  targetBatches: z.string().optional(),
  images: z.string().optional(),
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
