import { v4 as uuidv4 } from "uuid";

export const cdnURL = "https://creative-story.s3.us-east-1.amazonaws.com";
export const caregiverURL = "https://carenest-caregiver.vercel.app";
export const careseekerURL = "https://care-nest-teal.vercel.app";

export const getTokenPayload = (userId: string) => {
  return { user: { id: userId } };
};

export const generateUniqueId = () => {
  const uuid = uuidv4();
  return uuid;
};

export const getURLPath = (url: string) => {
  if (url.startsWith("/")) {
    return url;
  }

  if (!url.includes("://")) {
    return `/${url}`;
  }

  // If it's a full URL, extract the pathname
  try {
    const urlObject = new URL(url);
    const path = urlObject.pathname;
    return path.startsWith("/") ? path : `/${path}`;
  } catch (error) {
    // Fallback: treat as relative path
    return url.startsWith("/") ? url : `/${url}`;
  }
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

export const generateRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};
