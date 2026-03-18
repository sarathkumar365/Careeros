import { Link } from '@tanstack/react-router'
import UploadButton from '@upload/UploadButton'
import { AppTopNav } from '@/components/navigation/AppTopNav'

export default function HomePage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#f7f7f4]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(226, 232, 240, 0.35), transparent 44%),
          linear-gradient(rgba(209, 213, 219, 0.22) 1px, transparent 1px),
          linear-gradient(90deg, rgba(209, 213, 219, 0.22) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 12px 12px, 12px 12px',
      }}
    >
      <AppTopNav showNavLinks={false} />

      <main className="flex w-full flex-1 items-center justify-center px-4 py-14 sm:px-6 sm:py-20">
        <section className="mx-auto w-full max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 uppercase">
            Resume Tailoring Workspace
          </p>
          <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-6xl">
            Focused resume tailoring, done right.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
            Create cleaner, stronger resumes for the roles you want.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <UploadButton variant="minimal" />
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              View dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
