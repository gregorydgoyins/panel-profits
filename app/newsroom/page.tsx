import { getNewsStories, type NewsStory } from "@/lib/news/feed";
import { NewsBroadcastStudio } from "@/components/news/NewsBroadcastStudio";
import "@/styles/newsroom-final.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsroom // Broadcast Studio | Panel Profits",
  description: "Live broadcast newsroom studio featuring Alex Morgan on the lead desk.",
};

export default async function NewsroomPage() {
  const stories = await getNewsStories(60);

  return <NewsBroadcastStudio initialStories={stories} />;
}
