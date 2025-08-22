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
