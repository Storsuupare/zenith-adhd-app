const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const webpush = require("web-push");
const { createClerkClient } = require("@clerk/backend");
const { Resend } = require("resend");

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = { stripe, webpush, clerkClient, resend };
