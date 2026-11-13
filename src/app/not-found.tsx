import Link from "next/link"
import { GraduationCap, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-sm">
        <GraduationCap className="h-8 w-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
        404 — Page Not Found
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
        Academic Resource Not Found
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        The course page, study resource, or assignment you were looking for doesn&apos;t exist or has been relocated.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button className="gap-2 bg-primary hover:bg-primary-700 text-white">
            <Home className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
