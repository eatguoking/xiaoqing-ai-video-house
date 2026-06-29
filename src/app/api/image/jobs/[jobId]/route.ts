import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getJob } from "@/lib/jobs/job-store";

function parseAssets(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const storedJob = await prisma.generationJob.findUnique({ where: { id: jobId } });

  if (storedJob) {
    return NextResponse.json({
      id: storedJob.id,
      kind: storedJob.kind,
      provider: storedJob.provider,
      model: storedJob.model,
      prompt: storedJob.prompt,
      status: storedJob.status,
      assets: parseAssets(storedJob.assetsJson),
      completedAt: storedJob.completedAt
    });
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: job.status,
      assetsJson: JSON.stringify(job.assets),
      completedAt: job.status === "succeeded" ? new Date() : null
    }
  });

  if (job.status === "succeeded") {
    for (const asset of job.assets) {
      await prisma.asset.upsert({
        where: { id: asset.id },
        create: {
          id: asset.id,
          projectId: null,
          type: asset.type,
          title: asset.title,
          preview: asset.preview,
          payloadJson: JSON.stringify(asset),
          sourceJobId: job.id
        },
        update: {
          projectId: null,
          type: asset.type,
          title: asset.title,
          preview: asset.preview,
          payloadJson: JSON.stringify(asset),
          sourceJobId: job.id
        }
      });
    }
  }

  return NextResponse.json(job);
}
