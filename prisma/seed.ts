import { PrismaClient } from "../src/generated/prisma";
import { PrismaSqlite } from "prisma-adapter-sqlite";
import * as path from "node:path";

const dbPath = path.resolve(__dirname, "dev.db");
const adapter = new PrismaSqlite({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo project
  const project = await prisma.project.create({
    data: {
      title: "星穹之下",
      type: "novel",
      genre: "科幻",
      style: "硬科幻、悬疑",
      targetWords: 200000,
      description:
        "2147年，人类在距离地球4.2光年的比邻星b建立了第一个星际殖民地「新家园」。\n主人公林晨是一名地质学家，在一次常规勘探中发现了一个深埋地下的外星结构。这座结构似乎是一个古老的星际传送门，它的存在暗示着比邻星系曾有一个高度发达的文明。\n随着研究的深入，林晨和团队发现这扇门连接的不仅是空间，还有时间——透过它，可以看见地球的过去与未来。",
      worldView:
        "时间：2147年\n科技水平：已掌握可控核聚变、近光速星际航行、量子通信、通用AI。但尚未掌握超光速旅行。\n政治格局：地球联合政府主导，星际殖民地拥有高度自治权。\n关键设定：比邻星b上的「星门」是一个四维时空构造体，由未知文明建造。它能让人以意识形式穿越时空，观察但不能干涉。",
      writingReqs:
        "1. 科学合理性：所有科幻设定需要有科学依据或合理推测\n2. 悬疑节奏：每章末需留有悬念\n3. 人物塑造：每个主要角色要有完整的人物弧光\n4. 描写风格：简洁有力，画面感强，适当使用专业术语",
      status: "active",
    },
  });

  // Create AI settings
  await prisma.aISettings.create({
    data: {
      projectId: project.id,
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 4096,
    },
  });

  // Create chapters
  const chaptersData = [
    {
      title: "序章：来自深空的信号",
      order: 0,
      status: "published",
      summary:
        "地球联合天文台接收到一段来自比邻星方向的异常信号，开启人类星际探索的新篇章。",
      content: `2145年3月15日，智利阿塔卡马沙漠。

联合天文台的巨型射电望远镜阵列在凌晨3点14分捕捉到了一个异常信号。

它来自比邻星方向，频率稳定在1.420GHz——这正是中性氢的发射频率，被天体物理学家称为"宇宙的通用语言"。但不同寻常的是，这个信号携带着高度有序的调制模式。

"这不是自然现象。"天文台台长陈薇盯着频谱图，声音有些发颤，"有人在给我们发消息。"

信号持续了整整72小时，然后戛然而止。但在那72小时里，人类收到了来自4.2光年外的完整信息——一份星际航行的"邀请函"。

两年后，星际飞船"启明号"载着200名船员和科学家，踏上了前往比邻星b的旅程。`,
    },
    {
      title: "第一章：新家园",
      order: 1,
      status: "published",
      summary: "林晨抵达比邻星b殖民地，开始地质勘探工作。",
      content: `2147年9月。

林晨站在"新家园"殖民地的观测平台上，仰望头顶陌生的星空。

比邻星b的天空呈现一种淡淡的橙红色，因为它的太阳——比邻星——是一颗红矮星，发出的光芒偏红。这里的白天是暗红色的，夜晚则是纯粹的黑暗，天空中没有任何人造光污染。

殖民地不大，大约只有一个小镇的规模。圆顶式建筑群沿着一条干涸的河床分布，外面罩着透明的能量护盾，用以抵御微陨石和辐射。两百多号人住在这里，每一个人都是各个领域的精英。

"林博士，你的勘探设备已经准备好了。"一个合成语音从身后传来。

林晨回头，看见一个圆形的服务机器人正悬浮在空中。

"谢谢。"他说，拿起搭在栏杆上的外套。

他来这里已经三个月了，主要任务是对殖民地进行详细的地质测绘，寻找可利用的资源和研究该星球的地质历史。到目前为止，他发现比邻星b的地质活动比预想中活跃得多。`,
    },
    {
      title: "第二章：地下的秘密",
      order: 2,
      summary: "一次常规勘探中，林晨的探测器在地下深处发现了异常结构。",
      content: "",
    },
    {
      title: "第三章：星门",
      order: 3,
      summary: "发掘工作揭露了星门的真面目，一个远超人类理解的古老构造。",
      content: "",
    },
  ];

  for (const ch of chaptersData) {
    await prisma.chapter.create({
      data: {
        projectId: project.id,
        title: ch.title,
        content: ch.content || "",
        status: ch.status || "draft",
        order: ch.order,
        wordCount: ch.content ? ch.content.length : 0,
        summary: ch.summary,
      },
    });
  }

  // Create characters
  const characters = [
    {
      name: "林晨",
      identity: "地质学家，35岁，项目核心科学家",
      personality: "理性、谨慎，但在科学发现面前有冒险精神",
      goals: "揭示星门的真相，解开外星文明的谜题",
      relationships: "苏晚晴的大学同学兼同事",
      quirks: "思考时会不自觉地用手指敲击桌面",
      appearance: "身高178cm，短发，常穿灰色勘探服",
      backstory:
        "出生在地球上海，父亲是海洋学家，母亲是天体物理学家。26岁获得地质学博士学位。",
    },
    {
      name: "苏晚晴",
      identity: "语言学家/符号学家，33岁",
      personality: "直觉敏锐，富有创造力，不拘泥于既有框架",
      goals: "破译外星文明的符号系统和语言",
      relationships: "林晨的大学同学",
      quirks: "会在压力大时哼一首不知名的小调",
      appearance: "身高165cm，长发常扎成马尾",
      backstory: "语言学天才，精通12种地球语言。",
    },
    {
      name: "齐鸣",
      identity: "殖民地首席AI专家，45岁",
      personality: "冷静、计算型人格，重视效率胜过一切",
      goals: "确保殖民地安全和任务成功率",
      quirks: "几乎从不流露出明显情绪",
      appearance: "中等身材，面容严肃，常穿标准制服",
      backstory:
        "曾是地球联合政府AI安全委员会的核心成员。",
    },
    {
      name: "陈薇",
      identity: "联合天文台台长，68岁",
      personality: "睿智、沉稳，有远见的科学领袖",
      goals: "确保星门研究的科学价值和安全性",
      relationships: "林晨母亲的导师",
      quirks: "偶尔会引用中国古代哲学来评论当下的困境",
      appearance: "白发，眼神锐利",
      backstory: "人类最权威的天体物理学家之一。",
    },
  ];

  for (const ch of characters) {
    await prisma.character.create({
      data: {
        projectId: project.id,
        ...ch,
        order: characters.indexOf(ch),
      },
    });
  }

  // Create world building entries
  await prisma.worldBuilding.createMany({
    data: [
      {
        projectId: project.id,
        title: "比邻星b",
        type: "location",
        content:
          "距离地球4.2光年，围绕红矮星比邻星运行的类地行星。质量为地球的1.3倍，公转周期11.2天。表面平均温度约-15°C。大气成分以氮气和二氧化碳为主。",
      },
      {
        projectId: project.id,
        title: "新家园殖民地",
        type: "location",
        content:
          "建立于2146年，位于比邻星b的北半球赤道附近。容纳约250人，拥有完整的生态循环系统和防御罩。",
      },
      {
        projectId: project.id,
        title: "星门",
        type: "artifact",
        content:
          "深埋于地下约2公里处的外星构造。呈完美的正十二面体，边长约3米，材质未知。当被特定频率的量子场激发时，表面会浮现复杂的几何图案。",
      },
      {
        projectId: project.id,
        title: "启明号飞船",
        type: "technology",
        content:
          "人类第一艘星际载人飞船，采用核聚变推进技术，最高速度可达光速的15%。",
      },
      {
        projectId: project.id,
        title: "联合政府",
        type: "organization",
        content:
          "地球联合政府成立于2103年，由各国政府重新整合而成。下设多个专业部门。",
      },
    ],
  });

  // Create timeline entries
  await prisma.timeline.createMany({
    data: [
      {
        projectId: project.id,
        title: "2145年3月 - 信号接收",
        content: "联合天文台接收到来自比邻星方向的异常信号。",
        timePos: 0,
      },
      {
        projectId: project.id,
        title: "2145年9月 - 启明号起航",
        content: "启明号飞船从地球轨道出发，前往比邻星b。",
        timePos: 1,
      },
      {
        projectId: project.id,
        title: "2147年6月 - 抵达比邻星b",
        content: "启明号成功抵达比邻星b，开始建设殖民地。",
        timePos: 2,
      },
      {
        projectId: project.id,
        title: "2147年9月 - 地质勘探开始",
        content: "林晨抵达殖民地，开始详细地质勘探。",
        timePos: 3,
      },
    ],
  });

  console.log("✓ 种子数据创建成功！");
  console.log(`  作品：${project.title}`);
  console.log(`  章节：${chaptersData.length}`);
  console.log(`  角色：${characters.length}`);
}

main()
  .catch((e) => {
    console.error("种子数据创建失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
