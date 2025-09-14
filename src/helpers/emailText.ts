import { caregiverURL, careseekerURL } from "./utils";

const getCommonEmailTemplate = (
  heading: string,
  subHeading: string,
  body: string
) => {
  return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CareWorks</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(35, 61, 77, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #233D4D 0%, #F2A307 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${heading}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${subHeading}</p>
        </div>
        
        ${body}
      
        
        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff9f0 100%); padding: 35px 40px; text-align: center; border-top: 1px solid #e8ecf0;">
            <p style="margin: 0 0 15px 0; color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #233D4D; font-size: 18px;">The CareWorks Team 💙</strong>
            </p>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e8ecf0;">
                <p style="margin: 0; color: #8a9aab; font-size: 12px; line-height: 1.5;">
                    Need help? Contact our support team at <a href="mailto:support@careworks.com" style="color: #F2A307; text-decoration: none;">support@careworks.com</a>
                </p>
            </div>
        </div>
        
    </div>
</body>
</html>
    `;
};

export const getSignupHTML = (name: string) => {
  const heading = "Welcome to CareWorks!";
  const subHeading = "Your journey as a caregiver starts here";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${name || "User"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                Your account has been successfully created! We're thrilled to have you join our community of dedicated caregivers.
            </p>
            
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">🚀 Next Steps:</h3>
                
                <div style="margin-bottom: 18px;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">1</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Complete your profile</span>
                </div>
                
                <div style="margin-bottom: 18px;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">2</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Upload verification documents</span>
                </div>
                
                <div style="margin-bottom: 0;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">3</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Start accepting jobs</span>
                </div>
            </div>
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <table style="margin: 0 auto;">
                    <tr>
                        <td style="padding: 10px;">
                            <a href="${caregiverURL}/my-profile" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: #ffffff; text-decoration: none; padding: 16px 28px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); border: none; cursor: pointer;">
                                📝 Complete My Profile
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;">
                            <a href="${caregiverURL}/signup/documents" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: #ffffff; text-decoration: none; padding: 16px 28px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3); border: none; cursor: pointer;">
                                📄 Upload Documents
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💡 <strong>Pro Tip:</strong> Complete both steps to start receiving job opportunities faster!
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getJobAssignmentHTML = (
  caregiverName: string,
  jobDetails: {
    startDate: string;
    location: string;
    careSeekerName: string;
  }
) => {
  const heading = "🎉 New Job Assignment!";
  const subHeading = "You've been selected for a caregiving opportunity";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${caregiverName || "Caregiver"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                Great news! You've been assigned to a new caregiving job. We believe you're the perfect fit for this opportunity.
            </p>
            
            <!-- Job Details Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">📋 Job Details:</h3>
                
                <div style="margin-bottom: 20px; background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">📅</span>
                        <strong style="color: #233D4D; font-size: 14px;">Date:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">${
                          jobDetails?.startDate
                        }</span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">📍</span>
                        <strong style="color: #233D4D; font-size: 14px;">Location:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">${
                          jobDetails?.location
                        }</span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">👤</span>
                        <strong style="color: #233D4D; font-size: 14px;">Care Seeker:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">${
                          jobDetails?.careSeekerName
                        }</span>
                    </div>
              
                </div>
            </div>
            
            <div style="background-color: #fff9f0; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0; color: #233D4D; font-size: 16px; font-weight: 600;">
                    ⚡ Please confirm your availability as soon as possible
                </p>
            </div>
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <table style="margin: 0 auto;">
                    <tr>
                        <td style="padding: 10px;">
                            <a href="${caregiverURL}/bookings" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); border: none; cursor: pointer;">
                              Confirm or Decline Job
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💡 <strong>Note:</strong> Click on either button to view full job details and make your decision.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getJobCompletionHTML = (
  caregiverName: string,
  jobDetails: {
    startDate: string;
    endDate: string | null;
    careSeekerName: string | null;
    duration?: number | null;
    paymentStatus: "pending" | "released" | null;
    invoiceUrl: string | null;
  }
) => {
  const heading = "🎉 Great Job! Task Completed";
  const subHeading = "Your caregiving service has been successfully completed";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${caregiverName || "Caregiver"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                Thank you for completing the caregiving service for <strong>${
                  jobDetails?.careSeekerName || "the care seeker"
                }</strong>. Your dedication and professionalism make a real difference in people's lives.
            </p>
            
            <!-- Job Summary Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">📋 Service Summary:</h3>
                
                <div style="margin-bottom: 20px; background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">📅</span>
                        <strong style="color: #233D4D; font-size: 14px;">Service Period:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">${
                          jobDetails?.startDate
                        } - ${jobDetails?.endDate}</span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">⏱️</span>
                        <strong style="color: #233D4D; font-size: 14px;">Duration:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">${
                          jobDetails?.duration
                        } days</span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">💰</span>
                        <strong style="color: #233D4D; font-size: 14px;">Payment Status:</strong>
                        <span style="color: ${
                          jobDetails?.paymentStatus === "released"
                            ? "#28a745"
                            : "#f39c12"
                        }; font-size: 16px; margin-left: 8px; font-weight: 600;">
                            ${
                              jobDetails?.paymentStatus === "released"
                                ? "Released"
                                : "Pending"
                            }
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 0;">
                        <span style="color: #F2A307; font-size: 16px; margin-right: 10px;">🧾</span>
                        <strong style="color: #233D4D; font-size: 14px;">Invoice:</strong>
                        <span style="color: #5a6c7d; font-size: 16px; margin-left: 8px;">
                            ${
                              jobDetails?.invoiceUrl
                                ? "Ready for Download"
                                : "Processing"
                            }
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Payment Status Alert -->
            <div style="background-color: ${
              jobDetails?.paymentStatus === "released" ? "#d4edda" : "#fff3cd"
            }; border: 1px solid ${
    jobDetails?.paymentStatus === "released" ? "#c3e6cb" : "#ffeaa7"
  }; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0; color: ${
                  jobDetails?.paymentStatus === "released"
                    ? "#155724"
                    : "#856404"
                }; font-size: 16px; font-weight: 600;">
                    ${
                      jobDetails?.paymentStatus === "released"
                        ? "✅ Payment has been released to your account"
                        : "⏳ Payment is being processed and will be released soon"
                    }
                </p>
            </div>
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <table style="margin: 0 auto;">
                    <tr>
                        <td style="padding: 10px;">
                            <a href="${caregiverURL}/payments/invoice/${
    jobDetails?.invoiceUrl || "#"
  }" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); border: none; cursor: pointer; ${
    !jobDetails?.invoiceUrl ? "opacity: 0.6; pointer-events: none;" : ""
  }">
                                📄 Download Invoice
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;">
                            <a href="${caregiverURL}/bookings/history" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3); border: none; cursor: pointer;">
                                📊 View History
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💡 <strong>What's Next?</strong> Keep providing excellent care and watch for new job opportunities in your dashboard!
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getCaregiverFeedbackHTML = (
  caregiverName: string,
  careSeekerName: string,
  feedbackUrl?: string
) => {
  const heading = "Share Your Feedback";
  const subHeading = "Your experience matters to us";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${caregiverName || "Caregiver"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 25px 0;">
                Thank you for completing your caregiving service.
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                We'd love to hear your feedback on your experience with <strong>${
                  careSeekerName || "the care seeker"
                }</strong>. Your insights help us improve the CareWorks platform.
            </p>
            
            <!-- Feedback Invitation Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0; text-align: center;">
                <h3 style="color: #233D4D; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">💭 Share Your Experience</h3>
                
                <p style="color: #5a6c7d; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
                    Your feedback helps us maintain high-quality connections between caregivers and care seekers.
                </p>
                
                <div style="background: rgba(255,255,255,0.7); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #233D4D; font-size: 16px;">
                        ⭐ Rate your overall experience<br>
                        💬 Share what went well<br>
                        🔧 Suggest improvements
                    </p>
                </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <a href="${
                  feedbackUrl || caregiverURL + "/feedback"
                }" style="display: inline-block; background: linear-gradient(135deg, #F2A307 0%, #FF6B35 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 20px rgba(242, 163, 7, 0.4); border: none; cursor: pointer; transition: all 0.3s ease;">
                    📝 Leave Feedback Now
                </a>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💙 <strong>Thanks again for your dedication!</strong> Your care makes a real difference in people's lives.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getCareSeekerFeedbackHTML = (
  careSeekerName: string,
  caregiverName: string,
  feedbackUrl?: string
) => {
  const heading = "How Was Your Experience?";
  const subHeading = "Help us maintain quality care";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${careSeekerName || "Care Seeker"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                Hope your recent caregiving service with <strong>${
                  caregiverName || "your caregiver"
                }</strong> went smoothly.
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                We'd appreciate it if you could take a moment to rate your experience.
            </p>
            
            <!-- Rating Invitation Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0; text-align: center;">
                <h3 style="color: #233D4D; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">⭐ Rate Your Care Experience</h3>
                
                <p style="color: #5a6c7d; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
                    Your input helps us maintain high-quality care and assists other families in making informed decisions.
                </p>
                
                <div style="background: rgba(255,255,255,0.7); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #233D4D; font-size: 16px;">
                        ⭐ Rate the quality of care<br>
                        💬 Share your experience<br>
                        📝 Write a review for other families
                    </p>
                </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <a href="${
                  feedbackUrl || careseekerURL + "/rate-caregiver"
                }" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); border: none; cursor: pointer; transition: all 0.3s ease;">
                    ⭐ Give Feedback
                </a>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💙 <strong>Your input helps us maintain high-quality care!</strong> Thank you for being part of the CareWorks community.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getServiceBookingStartReminderHTML = (
  caregiverName?: string,
  careSeekerName?: string,
  startDateTime?: string,
  address?: string,
  jobDetailsUrl?: string
) => {
  const heading = "Your Caregiving Job Starts Soon!";
  const subHeading = "Service reminder notification";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${caregiverName || "Caregiver"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                Just a quick reminder – your caregiving job for <strong>${
                  careSeekerName || "your client"
                }</strong> starts soon.
            </p>
            
            <!-- Job Details Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">📋 Job Details</h3>
                
                <div style="background: rgba(255,255,255,0.7); padding: 25px; border-radius: 8px;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #233D4D; font-size: 16px; font-weight: 600;">
                            📍 Location:
                        </p>
                        <p style="margin: 0; color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                            ${address || "Address will be provided"}
                        </p>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 8px 0; color: #233D4D; font-size: 16px; font-weight: 600;">
                            📅 Date & Time:
                        </p>
                        <p style="margin: 0; color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                            ${startDateTime || "Start time will be provided"}
                        </p>
                    </div>
                </div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 35px 0;">
                Please be prepared and arrive on time. Your professionalism makes all the difference! 💪
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <a href="${
                  jobDetailsUrl || caregiverURL + "/jobs"
                }" style="display: inline-block; background: linear-gradient(135deg, #233D4D 0%, #F2A307 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 20px rgba(35, 61, 77, 0.4); border: none; cursor: pointer; transition: all 0.3s ease;">
                    📱 View Job Details
                </a>
            </div>
            
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px;">
                    💙 <strong>All the best!</strong> Thank you for your dedication to providing quality care.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

export const getDocumentUploadReminderHTML = (caregiverName?: string) => {
  const heading = "Complete Your Profile";
  const subHeading = "Start receiving caregiving opportunities";
  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${caregiverName || "Caregiver"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 20px 0;">
                Welcome to CareWorks! To start accepting caregiving opportunities, please upload your verification documents.
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 35px 0;">
                It only takes a few minutes and ensures the safety of our community. 🛡️
            </p>
            
            <!-- Document Checklist Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">📄 Required Documents</h3>
                
                <div style="background: rgba(255,255,255,0.7); padding: 25px; border-radius: 8px;">
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0; color: #233D4D; font-size: 16px; line-height: 1.8;">
                            ✅ <strong>ID Proof</strong> - Government issued photo ID
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0; color: #233D4D; font-size: 16px; line-height: 1.8;">
                            ✅ <strong>Background Check</strong> - Police verification certificate
                        </p>
                    </div>
                    
                    <div>
                        <p style="margin: 0; color: #233D4D; font-size: 16px; line-height: 1.8;">
                            ✅ <strong>Address Proof</strong> - Utility bill or bank statement
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Benefits Section -->
            <div style="background-color: #f8fbff; border-radius: 12px; padding: 25px; margin: 35px 0; text-align: center;">
                <h4 style="color: #233D4D; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">🌟 Why Complete Your Profile?</h4>
                <div style="text-align: left;">
                    <p style="margin: 0 0 10px 0; color: #5a6c7d; font-size: 14px; line-height: 1.6;">
                        🚀 <strong>Start receiving job opportunities immediately</strong>
                    </p>
                    <p style="margin: 0 0 10px 0; color: #5a6c7d; font-size: 14px; line-height: 1.6;">
                        🛡️ <strong>Build trust with families seeking care</strong>
                    </p>
                    <p style="margin: 0; color: #5a6c7d; font-size: 14px; line-height: 1.6;">
                        💰 <strong>Access to higher-paying verified caregiver positions</strong>
                    </p>
                </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <a href="${caregiverURL}/signup/documents" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); border: none; cursor: pointer; transition: all 0.3s ease;">
                    📁 Upload Documents Now
                </a>
            </div>
            
            <div style="background-color: #fff9f0; border: 1px solid #F2A307; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #5a6c7d; font-size: 14px; line-height: 1.6;">
                    ❓ <strong>Need help?</strong> Our support team is here to assist you every step of the way.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};

// ...existing code...

export const getAdminCreatedAccountHTML = (
  userName: string,
  userEmail: string,
  temporaryPassword: string,
  userRole: "giver" | "user" = "giver"
) => {
  const heading = "Welcome to CareWorks!";
  const subHeading = "Your account has been created by our admin team";
  const loginUrl = userRole === "giver" ? caregiverURL : careseekerURL;
  const roleDisplayName = userRole === "giver" ? "caregivers" : "care seekers";

  const body = `
    <div style="padding: 45px 40px;">
            <p style="font-size: 20px; line-height: 1.6; color: #233D4D; margin: 0 0 15px 0; font-weight: 600;">
                Hi ${userName || "User"} 👋
            </p>
            
            <p style="font-size: 16px; line-height: 1.7; color: #5a6c7d; margin: 0 0 25px 0;">
                Your CareWorks account has been successfully created by our admin team. We're excited to have you join our community of dedicated ${roleDisplayName}!
            </p>
            
            <!-- Account Details Card -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-left: 4px solid #F2A307; border-radius: 12px; padding: 30px; margin: 35px 0;">
                <h3 style="color: #233D4D; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">🔑 Your Login Credentials</h3>
                
                <div style="background: rgba(255,255,255,0.9); padding: 25px; border-radius: 8px; border: 2px dashed #F2A307;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #233D4D; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            📧 EMAIL (USERNAME)
                        </p>
                        <p style="margin: 0; color: #233D4D; font-size: 18px; font-weight: 700; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; font-family: 'Courier New', monospace;">
                            ${userEmail}
                        </p>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 8px 0; color: #233D4D; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            🔐 TEMPORARY PASSWORD
                        </p>
                        <p style="margin: 0; color: #233D4D; font-size: 18px; font-weight: 700; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; font-family: 'Courier New', monospace;">
                            ${temporaryPassword}
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Security Alert -->
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0; color: #856404; font-size: 16px; font-weight: 600; text-align: center;">
                    🔒 <strong>Important Security Notice:</strong><br>
                    <span style="font-weight: 400; font-size: 14px;">Please change your password immediately after your first login for security purposes.</span>
                </p>
            </div>
            
            <!-- Next Steps -->
            <div style="background: linear-gradient(135deg, #f8fbff 0%, #fff5e6 100%); border-radius: 12px; padding: 25px; margin: 35px 0;">
                <h4 style="color: #233D4D; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">🚀 Next Steps:</h4>
                
                <div style="margin-bottom: 15px;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">1</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Log in with your credentials</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">2</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Change your password</span>
                </div>
                
                <div style="margin-bottom: ${
                  userRole === "giver" ? "15px" : "0"
                };">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">3</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Complete your profile</span>
                </div>
                
                ${
                  userRole === "giver"
                    ? `
                <div style="margin-bottom: 0;">
                    <div style="width: 24px; height: 24px; background: #F2A307; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; margin-right: 15px; vertical-align: middle;">
                        <span style="color: white; font-size: 14px; font-weight: bold;">4</span>
                    </div>
                    <span style="color: #233D4D; font-size: 16px; font-weight: 500; vertical-align: middle;">Upload verification documents</span>
                </div>
                `
                    : ""
                }
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0 35px 0;">
                <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #233D4D 0%, #F2A307 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 20px rgba(35, 61, 77, 0.4); border: none; cursor: pointer; transition: all 0.3s ease;">
                    🚀 Login to Your Account
                </a>
            </div>
            
            <!-- Additional Info -->
            <div style="background-color: #f8fbff; border-radius: 8px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0 0 10px 0; color: #5a6c7d; font-size: 14px;">
                    💡 <strong>Pro Tip:</strong> ${
                      userRole === "giver"
                        ? "Complete your profile and upload documents to start receiving job opportunities!"
                        : "Complete your profile to start finding the perfect caregiver for your needs!"
                    }
                </p>
                <p style="margin: 0; color: #5a6c7d; font-size: 12px;">
                    If you experience any issues logging in, please contact our support team.
                </p>
            </div>
        </div>
    `;

  return getCommonEmailTemplate(heading, subHeading, body);
};
