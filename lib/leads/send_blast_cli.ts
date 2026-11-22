import { blastNewEpisodeEmail } from "./subscribers";

// CLI runner: npx tsx lib/leads/send_blast_cli.ts "Title" "Description" "EpisodeNumber" "YoutubeUrl" "SpotifyUrl" "AppleUrl" "SoundCloudUrl" "PandoraUrl"
async function main() {
  const args = process.argv.slice(2);
  const title = args[0] || "The Architecture of Sequential Art Equities";
  const desc = args[1] || "New episode of P4 Panel Podcast is live. Listen across all major platforms.";
  const epNum = args[2] || "01";
  const yt = args[3] || "https://youtube.com/@panelprofits";
  const spot = args[4] || "https://spotify.com";
  const apple = args[5] || "https://podcasts.apple.com";
  const sc = args[6] || "https://soundcloud.com";
  const pandora = args[7] || "https://pandora.com";

  console.log(`Blasting Episode #${epNum}: ${title}...`);
  const res = await blastNewEpisodeEmail({
    episodeTitle: title,
    episodeDescription: desc,
    episodeNumber: epNum,
    youtubeUrl: yt,
    spotifyUrl: spot,
    appleUrl: apple,
    soundcloudUrl: sc,
    pandoraUrl: pandora,
  });

  console.log("Blast result:", res);
}

if (require.main === module) {
  main();
}
