import { GuideApp } from "../components/guide-app";
import { getGuideContent } from "../lib/content";

export default function Home() {
  const guideContent = getGuideContent();

  return <GuideApp guideContent={guideContent} />;
}
