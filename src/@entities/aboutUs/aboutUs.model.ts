import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for team members in "Our Team" section
const teamMemberSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  image: z.string().url(),
  name: z.string().trim().min(1).max(255),
  role: z.string().trim().min(1).max(255),
});

// Schema for people in "Key People" section
const keyPersonSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  personTitle: z.string().trim().min(1).max(255),
  personName: z.string().trim().min(1).max(255),
  personImage: z.string().url(),
  personDescription: z.string().trim().min(1),
});

// Schema for values in "Our Values" section
const valueSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  valueName: z.string().trim().min(1).max(255),
  valueDescription: z.string().trim().min(1),
});

export const AboutUsModel = pgTable("about_us", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Main Section
  mainHeading: varchar("main_heading", { length: 255 }).notNull(),
  mainDescription: text("main_description").notNull(),

  // Key People Section (array of people)
  keyPeople: jsonb("key_people").$type<z.infer<typeof keyPersonSchema>[]>(),

  // Our Values Section
  valuesHeading: varchar("values_heading", { length: 255 }).notNull(),
  ourValues: jsonb("our_values").$type<z.infer<typeof valueSchema>[]>(),

  // Our Mission Section
  missionDescription: text("mission_description").notNull(),

  // Meet Our Team Section
  meetTeamHeading: varchar("meet_team_heading", { length: 255 }).notNull(),
  meetTeamDescription: text("meet_team_description").notNull(),
  teamMembers: jsonb("team_members").$type<z.infer<typeof teamMemberSchema>[]>(),

  ...min_timestamps,
});

export const createAboutUsSchema = z.object({
  mainHeading: z.string().trim().min(1).max(255),
  mainDescription: z.string().trim().min(1),
  keyPeople: z.array(keyPersonSchema.omit({ id: true })).min(1).max(10),
  valuesHeading: z.string().trim().min(1).max(255),
  ourValues: z.array(valueSchema.omit({ id: true })).length(3),
  missionDescription: z.string().trim().min(1),
  meetTeamHeading: z.string().trim().min(1).max(255),
  meetTeamDescription: z.string().trim().min(1),
  teamMembers: z.array(teamMemberSchema.omit({ id: true })).min(1).max(20),
});

export const updateAboutUsSchema = createAboutUsSchema.partial();