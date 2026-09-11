import { Email } from "@convex-dev/auth/providers/Email"
import { RandomReader, generateRandomString } from "@oslojs/crypto/random"
import { Resend as ResendAPI } from "resend"

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes)
      },
    }

    return generateRandomString(random, "0123456789", 6)
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error("Missing AUTH_RESEND_KEY.")
    }

    const resend = new ResendAPI(provider.apiKey)
    const { error } = await resend.emails.send({
      from: "Travel Calendar <onboarding@resend.dev>",
      to: [email],
      subject: "Your Travel Calendar sign-in code",
      text: `Your code is ${token}`,
    })

    if (error) {
      throw new Error(typeof error === "string" ? error : JSON.stringify(error))
    }
  },
})
