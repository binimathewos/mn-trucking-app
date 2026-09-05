import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/get-session-access";

export default async function RootPage() {
  const { isSignedIn, redirectToSignIn } = await getSessionAccess();

  if (!isSignedIn) {
    return redirectToSignIn();
  }

  redirect("/dashboard");
}
