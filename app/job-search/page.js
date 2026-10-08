import JobSearchClient from "./JobSearchClient";
import jobsData from "../../data/cre-jobs.json";

export const metadata = {
  title: "Job Search",
  description: "Daily-updated feed of Chicago commercial real estate job openings — acquisitions, development, investment analysis, and asset management roles.",
};

export default function JobSearchPage() {
  const jobs = [...jobsData.jobs].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

  return <JobSearchClient jobs={jobs} generatedAt={jobsData.generatedAt} />;
}
