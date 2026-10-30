// app/work/page.js
import PhotoHero from "../components/PhotoHero";
import ProjectCard from "../components/ProjectCard";
import { PROJECTS } from "../components/projects";

export const metadata = {
  title: "Work",
  description: "Projects Duke Benson has built.",
};

export default function WorkPage() {
  return (
    <div className="bg-neutral-950 text-white">
      <PhotoHero>
        <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Work</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Things I&apos;ve built</h1>
        <p className="mt-4 max-w-xl text-white/80">
          Tools where finance, real estate, and AI meet. Each one updates automatically.
        </p>
      </PhotoHero>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.name} project={project} detailed />
          ))}
        </div>
      </section>
    </div>
  );
}
