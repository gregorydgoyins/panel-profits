export interface BookExcerpt {
  id: string;
  volume: string;
  chapter: string;
  title: string;
  subtitle: string;
  topic: string;
  summary: string;
  quote: string;
  wordCount: string;
  pagesInTextbook: string;
  readTime: string;
  fullExcerpt: string[];
}

export const BOOK_EXCERPTS: BookExcerpt[] = [
  {
    id: "banksy-shredder-stunt",
    volume: "VOLUME I: THE ART",
    chapter: "Prologue",
    title: "The Shredder in the Gilded Frame",
    subtitle: "Banksy, Sotheby's, and the Sovereign Illusion of Fine Art",
    topic: "FINE ART PARITY & AUCTION SPECTACLE",
    summary: "When Banksy's Girl with Balloon shredded itself on the Sotheby's podium, the art market cheered. Why manufactured performance art pales in comparison to the accidental survival mechanics of rare pulp comics.",
    quote: "Banksy built a shredder into a frame to mock Sotheby's, and the collector class immediately renamed it Love is in the Bin and doubled its valuation. But a CGC 9.8 Action Comics #1 didn't require a built-in battery pack to prove its defiance of time.",
    wordCount: "1,450 Words",
    pagesInTextbook: "pp. 12–16",
    readTime: "6 min read",
    fullExcerpt: [
      "On October 5, 2018, the auctioneer's hammer dropped at Sotheby's London on Lot 67: Banksy's 2006 spray-paint and acrylic on canvas, Girl with Balloon. The final hammer price was £1,042,000 ($1.4 million). Seconds later, an alarm chimed from within the Victorian-style gilt frame. A motorized shredder concealed inside the frame began running, slicing the lower half of the canvas into vertical ribbons as it dangled below the moulding.",
      "The room gasped. Security guards rushed the podium. Within forty-eight hours, Sotheby's issued an official press release declaring that a new artwork had been created on their stage: Love is in the Bin. The European female collector proceeded with the purchase. Three years later, in October 2021, that exact shredded canvas returned to Sotheby's and hammered for £18.5 million ($25.4 million)—an eighteen-fold return on an engineered gag.",
      "The Sotheby's stunt reveals the supreme pathology of the post-war European and American contemporary art market: value is generated not by material scarcity or empirical survival curves, but by institutional collusive consensus. The frame was custom-machined with a battery that had to be replaced; the performance was pre-cleared by gatekeepers who understood that spectacle is the supreme currency of late-stage salon capitalism.",
      "Now contrast this with an unrestored, certified comic book: Action Comics #1, Detective Comics #27, or Captain America Comics #1. Two hundred thousand copies rolled off the high-speed four-color rotary presses of Eastern Color Printing in Waterbury, Connecticut. They were printed on groundwood pulp containing thirty percent unrefined lignin—an acidic wood polymer designed to brown and self-combust within decades.",
      "Ninety-nine percent were burned in parish censorship bonfires, collected in municipal wartime paper salvages for munitions drives, or discarded into municipal incinerators. When a single pristine copy emerges eighty-five years later with white pages, unrusted staples, and an intact spine, it has not survived because an auction house engineered a motorized gimmick. It has survived against physical chemistry, against world wars, and against parental purges. That is not spectacle. That is actuarial rarity."
    ]
  },
  {
    id: "warhol-comic-appropriation",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 18",
    title: "The Pop Vitrine & The 36-Inch Squeegee",
    subtitle: "How Andy Warhol Extracted Millions From Cheap Wood Pulp",
    topic: "POP ART APPROPRIATION & FACTORY LABOR",
    summary: "In 1961, Andy Warhol placed comic book panels in Bonwit Teller luxury department store windows. The forensic truth of how Pop Art appropriated working-class comic ephemera while traditional museums locked out the original creators.",
    quote: "When you seal a comic book inside an ultrasonic plastic slab with a microchamber zeolitic sheet, you are performing the exact gesture Andy Warhol performed in 1964 with the Brillo Boxes. You are declaring that the commercial pulp of industrial democracy is the permanent, sacred monument of our civilization.",
    wordCount: "1,680 Words",
    pagesInTextbook: "pp. 14–22",
    readTime: "7 min read",
    fullExcerpt: [
      "In April 1961, Andy Warhol took over the display windows of the Bonwit Teller luxury department store on 57th Street in Manhattan. Behind glamorous mannequins dressed in designer silk suits, Warhol hung five hand-painted canvases based on cheap mass-market advertisements and newspaper comic strips: Superman, Popeye, Saturday's Popeye, Before and After, and Advertisement.",
      "The high-society shoppers strolling down Fifth Avenue recognized the icons immediately, but they were presented in the sanctified vitrine of Fifth Avenue haute couture. Warhol's maneuver was predatory and brilliant: he recognized that the American consumer unconscious was entirely colonized by four-color sequential characters, yet the formal art establishment treated the source pamphlets as disposable trash.",
      "Within twelve months, Warhol transitioned from hand-painting comic panels to photographic silkscreening. At The Factory on East 47th Street, alongside Gerard Malanga, Warhol flooded 36-inch silkscreens with industrial acrylic paint, dragging the rubber squeegee across canvas again and again, deliberately introducing misregistrations, ink bleed, and half-tone sludge.",
      "The tragic irony of Pop Art is that Warhol, Roy Lichtenstein, and Mel Ramos became multi-millionaire darlings of sovereign museum boards by blowing up the exact compositions drawn by uncredited, impoverished bullpen illustrators like Russ Heath, Tony Abruzzo, and Irv Novick. Lichtenstein was paid hundreds of thousands of dollars for Whaam!—a direct copy of Irv Novick's panel from All-American Men of War #89—while Novick received a freelance page rate of twenty-four dollars.",
      "For sixty years, the fine art academy insisted that the silkscreen on canvas was 'high art' and the underlying comic book was 'low pulp.' But the actuarial ledger has finally settled the score: certified comic grails trade with higher capital velocity, lower counterfeit volatility, and stricter objective forensic grading than post-war contemporary canvases."
    ]
  },
  {
    id: "siegel-shuster-check",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 2",
    title: "The $130 Release Voucher",
    subtitle: "Siegel & Shuster and the Property Rights Genesis of Superman",
    topic: "CREATOR PROPERTY RIGHTS & CORPORATE EXPLOITATION",
    summary: "On March 1, 1938, Detective Comics Inc. cut a $130 check to Jerry Siegel and Joe Shuster for the rights to Action Comics #1. How two teenagers in Cleveland signed away a multi-billion dollar mythology on a payroll voucher.",
    quote: "Two teenagers in Cleveland signed away the modern American mythology on a $130 company voucher. That single piece of paper represents the greatest property rights asymmetry in the history of global capitalism.",
    wordCount: "1,520 Words",
    pagesInTextbook: "pp. 34–40",
    readTime: "6 min read",
    fullExcerpt: [
      "On March 1, 1938, Jack Liebowitz of Detective Comics, Inc. issued a $130.00 voucher check to Jerome Siegel and Joseph Shuster—ten dollars per page for the thirteen-page Superman debut destined for Action Comics #1, bundled alongside routine strip payments for Detective Comics and More Fun Comics.",
      "Tucked directly above the signature line on the reverse of the check was a standard corporate release clause: 'For and in consideration of the sum of $130.00 to us in hand paid... we hereby transfer and assign to Detective Comics, Inc. all right, title, and interest in and to Superman and the title and character thereof.'",
      "Siegel and Shuster, both twenty-three years old and living with their parents in Depression-era Cleveland, endorsed the check. With that single stroke of a pen, they transferred the copyright and trademark to the most lucrative intellectual property created in the twentieth century—a sovereign franchise that would generate over one hundred billion dollars in cinematic, merchandising, and publishing revenue.",
      "When Action Comics #1 hit newsstands on April 18, 1938, the publisher didn't even expect Superman to be the primary attraction; he was simply lead filler among Western and detective stories. But distributors immediately reported a run on newsstands: children weren't asking for Action Comics, they were asking for 'that book with the guy lifting the green car.'",
      "The $130 check is not merely an anecdote of corporate exploitation; it is the foundational legal document of sequential art capital. It established the work-for-hire precedent that allowed sovereign publishing houses to build generational empires while the original myth-makers died destitute in rent-controlled apartments."
    ]
  },
  {
    id: "wertham-fraud-civil-rights",
    volume: "VOLUME II: THE MARKET",
    chapter: "Chapter 13",
    title: "Dr. Fredric Wertham: Clinical Fraud vs. Harlem Crusader",
    subtitle: "The Seduction of the Innocent and the 1954 Censorship Bonfires",
    topic: "FORENSIC HISTORICAL AUDIT & PARISH BONFIRES",
    summary: "Fredric Wertham is remembered as the villain who nearly destroyed the comic book medium in 1954. But a rigorous forensic audit reveals a complex paradox: a pioneering civil rights psychiatrist who fabricated case studies to ban comic books.",
    quote: "Wertham was simultaneously an indispensable civil rights hero whose clinic provided the psychological brief that desegregated American schools in Brown v. Board of Education, and a clinical fabulist who doctored patient testimonies to ignite parish comic bonfires.",
    wordCount: "1,800 Words",
    pagesInTextbook: "pp. 88–96",
    readTime: "8 min read",
    fullExcerpt: [
      "In the spring of 1954, Rinehart & Company published Seduction of the Innocent by Dr. Fredric Wertham, a German-born senior psychiatrist at Bellevue Hospital and director of the Lafargue Clinic in Harlem. The book asserted with clinical certainty that comic books—specifically EC horror, crime, and superhero titles—were the primary epidemiological driver of juvenile delinquency, rape, homosexuality, and illiteracy.",
      "The fallout was catastrophic. In April and June 1954, the United States Senate Subcommittee on Juvenile Delinquency, chaired by Tennessee Senator Estes Kefauver, held televised hearings in Foley Square. William M. Gaines, publisher of EC Comics, took the stand under the influence of Dexedrine and attempted to defend Crime SuspenStories #22, which featured a severed woman's head on the cover.",
      "Within months, municipal councils banned comic sales, Catholic parish priests led church youth groups to church parking lots to burn thousands of comic books in mass bonfires, and publishers created the Comics Code Authority—a private censorship cartel that decimated independent, horror, and crime publishers overnight.",
      "Yet the historical audit is far more nuanced than comic fandom admits. Wertham was not a right-wing moral crusader; he was an ardent socialist who founded the first free psychiatric clinic for Black children in Harlem. In 1951, Wertham's clinical testimony on the psychological damage of segregated schooling in Delaware (Gebhart v. Belton) was incorporated directly into the landmark 1954 Supreme Court ruling Brown v. Board of Education.",
      "It was not until 2012, when scholar Carol Tilley inspected Wertham's original archives at the Library of Congress, that the empirical truth emerged: Wertham had systematically fabricated his data. He combined multiple children into single composite profiles, invented quotes out of whole cloth, and distorted testimonies. The panic that incinerated millions of Golden Age grails was built on clinical perjury."
    ]
  },
  {
    id: "dali-disney-destino",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 20",
    title: "The Surrealist Convergence: Salvador Dalí Meets Walt Disney",
    subtitle: "Destino, Dream Architecture, and the Comic Slab as Surrealist Object",
    topic: "SURREALISM & SEQUENTIAL DREAMSCAPES",
    summary: "In 1945, Salvador Dalí walked onto the Walt Disney studio lot in Burbank to co-create Destino. Why sequential panel grammar is the purest manifestation of Breton's paranoiac-critical surrealism.",
    quote: "When you take a ten-cent comic book printed on cheap newsprint, enclose it in virgin optical acrylic, sonically weld it shut at forty kilohertz, and crown it with a decimal grade, you are creating the supreme twentieth-century Surrealist Object: a pure, non-consumable financial and cultural talisman.",
    wordCount: "1,620 Words",
    pagesInTextbook: "pp. 110–118",
    readTime: "7 min read",
    fullExcerpt: [
      "In late 1945, Salvador Dalí signed a contract with Walt Disney to spend three months working in the Burbank animation studios. The project was Destino, a surrealist short film based on a Mexican ballad by Armando Dominguez. For eight months, Dalí worked alongside Disney studio artist John Hench, producing twenty-two oil paintings and one hundred and thirty-five storyboard sketches.",
      "The collaboration was eventually shelved by Roy Disney for budgetary reasons, but the creative premise remains a historic milestone in aesthetic history. Dalí recognized what the European fine art academy refused to admit: sequential animation and comic book paneled sequencing represented the absolute realization of André Breton's 1924 Surrealist Manifesto.",
      "In a traditional painting, space is static. In a comic book, time is spatialized across the page grid. The white gutters between panels represent what Nick Sousanis calls 'the unflattened void'—the psychological gap where the viewer's subconscious is forced to synthesize closure. Dalí understood that comic books are not low-brow pulp for children; they are architectural storyboards of the dream state.",
      "Consider the modern comic slab: an issue of Vault of Horror #12 or Weird Science #16, sealed inside a hermetically sonically welded acrylic capsule. You cannot turn its pages. You cannot read its speech bubbles. You cannot feel its newsprint. It has been completely alienated from its original industrial utility as a magazine.",
      "In doing so, the collector has turned the comic book into the ultimate Surrealist Readymade—surpassing Marcel Duchamp's urinal or Meret Oppenheim's fur-covered teacup. It is an impossible object: a story that cannot be read, sealed in a vault, valued purely for its preserved condition grade."
    ]
  },
  {
    id: "american-mythology-secular-pantheon",
    volume: "VOLUME I: THE ART",
    chapter: "Prologue & Chapter 5",
    title: "Why Comic Books Are America's Only Native Mythology",
    subtitle: "The Secular Pantheon, Industrial Democracy, and The Room Test",
    topic: "CIVILIZATIONAL MYTHOLOGY & ACTUARIAL SOVEREIGNTY",
    summary: "Ancient Greece had Olympus; Norse civilization had Asgard; medieval Europe had Arthurian legends. America had no ancient gods—until two Jewish teenagers in Cleveland created Superman.",
    quote: "Ancient Greece carved their gods in Pentelic marble; Renaissance Italy cast theirs in bronze; industrial democratic America printed hers in four-color dot registration on acidic wood pulp for ten cents.",
    wordCount: "1,750 Words",
    pagesInTextbook: "pp. 4–11",
    readTime: "7 min read",
    fullExcerpt: [
      "Every major civilization in human history is anchored by a native, indigenous mythology. The Greeks had the twelve Olympian deities; the Norse had Odin, Thor, and the doom of Ragnarok; Rome had Virgil's Aeneid; Britain had the Arthurian Grail romances. But the United States, founded in the late eighteenth century as an enlightened constitutional republic, possessed no ancient pre-modern pantheon.",
      "America had no forest nymphs, no thunder gods, and no ancient lineage of divine bloodlines. What America did possess was industrial printing presses, waves of working-class immigrant labor arriving at Ellis Island, and the crushing urban alienation of the Great Depression.",
      "Between 1938 and 1941, primarily in small cold-water flats across Brooklyn, the Bronx, and Cleveland, a cadre of first-generation Eastern European Jewish teenagers—Siegel, Shuster, Kirby, Simon, Kane, Finger, Eisner—invented the American mythology out of raw four-color ink and paper.",
      "Their gods did not live atop Mount Olympus; they lived in skyscrapers overlooking concrete streets. They hid their divine power behind oversized spectacles, fedora hats, and pressed suits, living double lives as reporters, photographers, and ordinary wage-earning citizens. They fought not against Minotaurs, but against corrupt municipal landlords, union-busting industrialists, and European fascists.",
      "This is why comic books represent the only authentic American mythological canon. And like every ancient artifact from an ancient civilization—whether an Attic amphora or an Egyptian papyrus—the original sacred surviving texts of this mythology are destined to command sovereign actuarial value as long as human civilization endures."
    ]
  }
];
