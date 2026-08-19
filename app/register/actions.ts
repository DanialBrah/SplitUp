"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/users";
import { registerPayloadSchema } from "@/lib/validation/register-payload";

export async function registerAction(formData: FormData) {
  const parsed = registerPayloadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  try {
    await createUser(parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/register?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/groups",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=CredentialsSignin");
    }
    throw error;
  }
}
