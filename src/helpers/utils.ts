import { v4 as uuidv4 } from "uuid";

export const cdnURL = "https://dev-carenest.s3.ap-south-1.amazonaws.com";
export const caregiverURL = "https://carenest-caregiver.vercel.app";
export const careseekerURL = "https://care-nest-teal.vercel.app";

export const getTokenPayload = (userId: string) => {
  return { user: { id: userId } };
};

export const generateUniqueId = () => {
  const uuid = uuidv4();
  return uuid;
};

// Format ISO to date,time
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  };
  return new Intl.DateTimeFormat("en-IN", options).format(date);
}
