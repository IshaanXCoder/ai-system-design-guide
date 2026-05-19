import fs from "node:fs";
import path from "node:path";

export type GuideHeading = {
  id: string;
  text: string;
  depth: number;
};

export type GuideDocument = {
  path: string;
  slug: string;
  title: string;
  section: string;
  description: string;
  content: string;
  headings: GuideHeading[];
};

export type GuideSection = {
  title: string;
  slug: string;
  documents: GuideDocument[];
};

export type GuideContent = {
  sections: GuideSection[];
  documents: GuideDocument[];
};

const ROOT_DOC_PRIORITY = [
  "README.md",
  "COURSES.md",
  "GLOSSARY.md",
  "PATTERNS.md",
  "TRANSITION_GUIDE.md",
  "ai_evals_comprehensive_study_guide.md",
  "ai_evals_complete_guide_langwatch_langfuse.md",
];

const GUIDE_DIRECTORIES = [
  "00-interview-prep",
  "01-foundations",
  "02-model-landscape",
  "03-training-and-adaptation",
  "04-inference-optimization",
  "05-prompting-and-context",
  "06-retrieval-systems",
  "07-agentic-systems",
  "08-memory-and-state",
  "09-frameworks-and-tools",
  "10-document-processing",
  "11-infrastructure-and-mlops",
  "12-security-and-access",
  "13-reliability-and-safety",
  "14-evaluation-and-observability",
  "15-ai-design-patterns",
  "16-case-studies",
  "17-tool-use-and-computer-agents",
];

function titleCase(value: string) {
  return value
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createSlugger() {
  const seen = new Map<string, number>();

  return (value: string) => {
    const base =
      value
        .toLowerCase()
        .replace(/`([^`]+)`/g, "$1")
        .replace(/<[^>]*>/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "section";

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

function stripMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function extractTitle(markdown: string, fallback: string) {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  return stripMarkdown(h1?.[1] ?? fallback);
}

function extractDescription(markdown: string) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const paragraph = withoutCode
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block &&
        !block.startsWith("#") &&
        !block.startsWith("|") &&
        !block.startsWith("<") &&
        !block.startsWith("---"),
    );

  return stripMarkdown(paragraph ?? "").slice(0, 180);
}

function extractHeadings(markdown: string) {
  const headings: GuideHeading[] = [];
  const slug = createSlugger();
  const matches = markdown.matchAll(/^(#{1,4})\s+(.+)$/gm);

  for (const match of matches) {
    const depth = match[1].length;
    const text = stripMarkdown(match[2]);
    const id = slug(text);

    if (depth >= 2) {
      headings.push({ id, text, depth });
    }
  }

  return headings;
}

function documentFromFile(root: string, filePath: string, section: string): GuideDocument {
  const absolutePath = path.join(root, filePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const basename = path.basename(filePath, ".md");
  const slug = filePath.replace(/\.md$/, "").replace(/\\/g, "/");

  return {
    path: filePath,
    slug,
    title: extractTitle(content, titleCase(basename)),
    section,
    description: extractDescription(content),
    content,
    headings: extractHeadings(content),
  };
}

export function getGuideContent(): GuideContent {
  const root = process.cwd();
  const sections: GuideSection[] = [];

  const rootDocs = ROOT_DOC_PRIORITY.filter((filePath) =>
    fs.existsSync(path.join(root, filePath)),
  ).map((filePath) => documentFromFile(root, filePath, "Start Here"));

  sections.push({
    title: "Start Here",
    slug: "start-here",
    documents: rootDocs,
  });

  const directorySections = GUIDE_DIRECTORIES.filter((directory) =>
    fs.existsSync(path.join(root, directory)),
  )
    .map((directory) => {
      const markdownFiles = fs
        .readdirSync(path.join(root, directory), { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith(".md"))
        .map((file) => path.join(directory, file.name))
        .sort((a, b) => a.localeCompare(b));

      const sectionTitle = titleCase(directory);

      return {
        title: sectionTitle,
        slug: directory,
        documents: markdownFiles.map((filePath) =>
          documentFromFile(root, filePath, sectionTitle),
        ),
      };
    })
    .filter((section) => section.documents.length > 0);

  sections.push(...directorySections);

  return {
    sections,
    documents: sections.flatMap((section) => section.documents),
  };
}
