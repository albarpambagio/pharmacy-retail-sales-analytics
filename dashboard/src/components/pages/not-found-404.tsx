import Link from "next/link"

import { Button } from "@/components/ui/button"

export function NotFound404() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center text-center text-foreground bg-background p-4">
      <h1 className="text-8xl font-black">404</h1>
      <p className="text-2xl font-semibold mt-2">Page Not Found</p>
      <p className="max-w-prose text-lg text-muted-foreground mt-4">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button size="lg" asChild className="mt-6">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  )
}
