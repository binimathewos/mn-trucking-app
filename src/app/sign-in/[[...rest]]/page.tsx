import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { Clock, Package, Users, type LucideIcon } from "lucide-react";

interface Highlight {
  icon: LucideIcon;
  title: string;
  description: string;
}

const highlights: Highlight[] = [
  {
    icon: Clock,
    title: "Timesheets",
    description: "Track driver hours and approvals in real time.",
  },
  {
    icon: Package,
    title: "Container tracking",
    description: "Stay on top of every load from pickup to delivery.",
  },
  {
    icon: Users,
    title: "Driver management",
    description: "Keep fleet records and assignments organized.",
  },
];

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(59,130,246,0.35), transparent 40%), radial-gradient(circle at 85% 75%, rgba(59,130,246,0.25), transparent 45%)",
          }}
        />

        <div className="relative flex items-center gap-5">
          <Image
            src="/images/logo.png"
            alt="MN Trucking company logo"
            width={104}
            height={104}
            className="rounded-xl bg-white/95 p-2 shadow-lg shadow-black/20"
          />
          <div>
            <p className="text-4xl leading-tight font-extrabold tracking-tight xl:text-5xl">
              MN TRUCKING
            </p>
            <p className="mt-1 text-base font-semibold tracking-[0.2em] text-blue-300">
              OPERATIONS PLATFORM
            </p>
          </div>
        </div>

        <div className="relative space-y-8">
          <h1 className="text-3xl leading-tight font-bold text-balance">
            Run your fleet with clarity, every mile of the way.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            One place for dispatch, drivers, and reporting — built for MN
            Trucking&apos;s day-to-day operations.
          </p>
          <ul className="space-y-5">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-blue-300" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} MN Trucking LLC. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-slate-50 p-4 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center gap-4 text-center lg:hidden">
            <Image
              src="/images/logo.png"
              alt="MN Trucking company logo"
              width={128}
              height={128}
              className="rounded-xl shadow-md shadow-slate-900/10"
              priority
            />
            <div>
              <p className="text-3xl leading-tight font-extrabold tracking-tight text-slate-900">
                MN TRUCKING
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.2em] text-slate-500">
                OPERATIONS PLATFORM
              </p>
            </div>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your MN Trucking dashboard.
            </p>
          </div>

          <SignIn
            fallbackRedirectUrl="/dashboard"
            appearance={{
              variables: {
                colorPrimary: "#2563eb",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full gap-4 rounded-xl border border-slate-200 p-5 shadow-sm shadow-slate-900/5 sm:p-6",
                header: "!hidden",
                footer: "!hidden",
                main: "gap-4",
                form: "gap-4",
                formFieldRow: "gap-3",
                socialButtonsBlockButton: "rounded-lg",
                dividerRow: "my-2",
                formButtonPrimary: "rounded-lg",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
