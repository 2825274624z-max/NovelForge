import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countWords } from "@/lib/word-count";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, author, description, chapters } = body;

    if (!title || !chapters?.length) {
      return NextResponse.json(
        { error: "缺少标题或章节数据" },
        { status: 400 }
      );
    }

    // 创建作品
    const project = await prisma.project.create({
      data: {
        title: title.slice(0, 100),
        author: (author || "").slice(0, 100),
        type: "novel",
        description: (description || "").slice(0, 5000),
        targetWords: 0,
      },
    });

    // 批量创建章节
    let created = 0;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch.content || ch.content.trim().length < 5) continue;
      await prisma.chapter.create({
        data: {
          projectId: project.id,
          title: (ch.title || `第${i + 1}章`).slice(0, 200),
          content: ch.content,
          wordCount: countWords(ch.content),
          order: i,
          status: i === 0 ? "draft" : "pending",
        },
      });
      created++;
    }

    if (created === 0) {
      // 回滚：删除空作品
      await prisma.project.delete({ where: { id: project.id } });
      return NextResponse.json(
        { error: "所有章节内容为空" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { projectId: project.id, chapterCount: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: `导入失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
