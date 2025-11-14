import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Job = {
  company: string;
  title: string;
  salary: string;
  description: string;
  remote?: boolean;
  location: string;
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <Card className="rounded-[20px] shadow-sm">
      <CardContent className="p-5">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{job.company}</div>
        <div className="mt-1 text-lg font-semibold">{job.title}</div>

        <div className="mt-2 text-sm font-semibold text-[#643fe0] dark:text-[#b9a5ff]">{job.salary}</div>

        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-3">
          {job.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {job.remote && <Badge variant="secondary" className="rounded-full">REMOTE</Badge>}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{job.location}</div>
        </div>
      </CardContent>
    </Card>
  );
}
