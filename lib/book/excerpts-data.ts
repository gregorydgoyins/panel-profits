export interface IllustratedBookFigure {
  src: string;
  plateNumber: string;
  caption: string;
  secondarySrc?: string;
  secondaryCaption?: string;
}

export interface IllustratedBookPage {
  pageNumber: number;
  runningHeader: string;
  sectionTitle: string;
  paragraphs: string[];
  figure?: IllustratedBookFigure;
  pullQuote?: string;
}

export interface RenderedTextbookPage {
  src: string;
  pageNumber: number;
  label: string;
}

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
  illustratedPages?: IllustratedBookPage[];
  renderedPageImages?: RenderedTextbookPage[];
}

export const BOOK_EXCERPTS: BookExcerpt[] = [
  {
    id: "siegel-shuster-check",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 2",
    title: "The $130 Release Voucher",
    subtitle: "Siegel & Shuster and the Property Rights Genesis of Superman",
    topic: "CREATOR PROPERTY RIGHTS & CORPORATE EXPLOITATION",
    summary:
      "On March 1, 1938, Detective Comics Inc. cut a $130 check to Jerry Siegel and Joe Shuster for the rights to Action Comics #1. Three complete illustrated pages tracing how two teenagers in Cleveland signed away a multi-billion-dollar mythology on a payroll voucher.",
    quote:
      "Two teenagers in Cleveland signed away the modern American mythology on a $130 company voucher. That single piece of paper represents the greatest property rights asymmetry in the history of global capitalism.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 12–14",
    readTime: "7 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch02/page_12.jpg",
        pageNumber: 12,
        label: "Chapter 2 • Page 12 — 1938–1941: The Superhero as a Primary Issue (Figure 2.4 & Sidenote 2.8)",
      },
      {
        src: "/book-pages/ch02/page_13.jpg",
        pageNumber: 13,
        label: "Chapter 2 • Page 13 — Callout Box 2.3 (The Only Sworn Numbers) & Maker Dossier: Bill Finger & Bob Kane",
      },
      {
        src: "/book-pages/ch02/page_14.jpg",
        pageNumber: 14,
        label: "Chapter 2 • Page 14 — Act I, Movement Two: Primary-Issue Circulation & Genesis Ledger",
      },
    ],
    fullExcerpt: [
      "On March 1, 1938, Jack Liebowitz of Detective Comics, Inc. issued a $130.00 voucher check to Jerome Siegel and Joseph Shuster—ten dollars per page for the thirteen-page Superman debut destined for Action Comics #1, bundled alongside routine strip payments for Detective Comics and More Fun Comics.",
      "Tucked directly above the signature line on the reverse of the check was a standard corporate release clause: 'For and in consideration of the sum of $130.00 to us in hand paid... we hereby transfer and assign to Detective Comics, Inc. all right, title, and interest in and to Superman and the title and character thereof.'",
      "Siegel and Shuster, both twenty-three years old and living with their parents in Depression-era Cleveland, endorsed the check. With that single stroke of a pen, they transferred the copyright and trademark to the most lucrative intellectual property created in the twentieth century—a sovereign franchise that would generate over one hundred billion dollars in cinematic, merchandising, and publishing revenue.",
    ],
    illustratedPages: [
      {
        pageNumber: 34,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "I. Check #404 and the Cleveland Contract",
        paragraphs: [
          "On March 1, 1938, inside a utilitarian accounting office at 480 Lexington Avenue in Manhattan, accountant-turned-publisher Jack Liebowitz countersigned a routine disbursement check payable to two twenty-three-year-old freelancers living with their parents in the Glenville neighborhood of Cleveland, Ohio. The check was made out to Jerome Siegel and Joseph Shuster for $412 total across their monthly strip inventory—of which exactly $130.00 represented ten dollars per page for thirteen pages of an unproven science-fiction strongman named Superman.",
          "To understand the violence of that arithmetic, one must set aside modern superhero mythology and look strictly at the Depression-era freelance ledger. In the winter of 1938, Siegel and Shuster had already spent five years shopping their Superman newspaper strip to every major syndicate in North America. Bell Syndicate passed. McClure Syndicate sat on the samples for months before forwarding them to Harry Donenfeld and Jack Liebowitz as filler for a brand-new ten-cent anthology titled Action Comics.",
          "Printed in cramped legal type on the reverse of the voucher, directly above the endorsement line, sat a boilerplate work-for-hire assignment. By signing their names to cash a rent-and-groceries check, Siegel and Shuster conveyed 'all right, title, and interest in and to Superman and the title and character thereof' in perpetuity. No royalty ladder. No reversion window. No merchandising participation. Just ten dollars a page for raw line work and dialogue.",
          "In institutional finance, we call this an unpriced call option written by an illiquid counterparty. Siegel and Shuster needed cash in March 1938 to keep working; Liebowitz and Donenfeld owned the rotary presses, the distribution contracts with Independent News, and the balance-sheet patience to hold the option until expiry. The spread between what was paid and what was acquired would widen into the largest intellectual property transfer in modern cultural history.",
        ],
        figure: {
          src: "/images/fig02_siegel_shuster_cleveland.jpg",
          plateNumber: "PLATE 2.1",
          caption:
            "Jerry Siegel and Joe Shuster in their Cleveland working studio prior to endorsing the March 1, 1938 Detective Comics, Inc. release voucher. Primary archival photograph.",
        },
      },
      {
        pageNumber: 35,
        runningHeader: "CHAPTER 2 • THE $130 RELEASE VOUCHER",
        sectionTitle: "II. April 18, 1938: The Guy Lifting the Green Car",
        paragraphs: [
          "When Action Comics #1 (cover-dated June 1938) reached American newsstands on April 18, 1938, Detective Comics, Inc. printed roughly 200,000 copies on high-speed rotary presses at Eastern Color Printing in Waterbury, Connecticut. Donenfeld himself initially panicked when he saw Joe Shuster's cover—a man in blue tights hoisting a green sedan over his head while terrified thugs fled in every direction. He ordered Liebowitz to keep the character off the next several covers, convinced the image looked ridiculous.",
          "The market delivered its verdict within seventy-two hours. Newsstand distributors from Chicago to Brooklyn began wiring urgent reorders, reporting an anomaly they had never witnessed in magazine distribution: children were not asking for Action Comics by title. They were slapping dimes onto wooden counters and demanding 'that book with the guy lifting the green car.' By issue #4, internal newsstand audits revealed that Superman alone was driving near-100% sell-through.",
          "From a materials-science perspective, those 200,000 copies were engineered for rapid oblivion. Each copy was printed on cheap groundwood newsprint containing roughly thirty percent unrefined lignin—an acidic wood polymer that begins oxidizing the moment it meets ultraviolet light and ambient humidity. At an average paper pH near 4.2, every copy of Action Comics #1 was born on an irreversible chemical countdown.",
          "Layered atop chemical decay was catastrophic physical attrition. Mothers threw them out during spring cleanings. Schoolboys rolled them into back pockets. Municipal World War II paper drives fed millions of Golden Age pamphlets into wartime pulping vats to manufacture shell casings and ration cartons. Out of 200,000 copies printed in 1938, fewer than one hundred unrestored survivors remain on the modern certified census—a survival rate below 0.05 percent.",
        ],
        figure: {
          src: "/images/fig01_action_comics_1.jpg",
          plateNumber: "PLATE 2.2",
          caption:
            "Action Comics #1 (June 1938, Detective Comics, Inc.). Ten-cent groundwood newsprint cover price; fewer than 0.05% of the estimated 200,000-copy print run survives in certified unrestored form.",
        },
        pullQuote:
          "The publisher thought the cover looked ridiculous. Seventy-two hours later, children across America were slapping dimes onto newsstand counters demanding 'that book with the guy lifting the green car.'",
      },
      {
        pageNumber: 36,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "III. Work-for-Hire Asymmetry & Sovereign Equity",
        paragraphs: [
          "Within twelve months of Action Comics #1, Detective Comics, Inc. replicated the exact work-for-hire blueprint on its flagship detective anthology. When Detective Comics #27 debuted Batman in May 1939, the corporate structure was already locked in place: publishers owned the sovereign character equity, while creators were compensated as piece-rate laborers. Together, Action #1 and Detective #27 established the twin balance-sheet pillars of the American superhero economy.",
          "Look closely at the financial divergence that followed. By 1940, Superman titles alone were selling over 1.25 million copies per issue, spawning a syndicated daily newspaper strip, a top-rated national radio serial, Fleischer Studios theatrical cartoons, and a licensing juggernaut generating millions in pre-war dollars. Meanwhile, Siegel and Shuster—having surrendered ownership for $130—fought decades of bitter litigation before finally receiving modest late-life pensions in 1975 only after public outrage threatened the premiere of Warner Bros.' 1978 feature film.",
          "Yet for the collector-investor studying sequential art as an asset class, the $130 voucher teaches an even deeper actuarial lesson. Because the physical 1938 issue was treated by its own publisher as disposable paper advertising a licensed character, no institutional archive preserved an uncut vault run. Unlike fine-art bronzes cast in numbered editions or first-edition leather folios shelved in university libraries, Action Comics #1 survived strictly by accident.",
          "When a verified high-grade copy of Action Comics #1 changes hands today for eight figures—surpassing major works by twentieth-century European modernists—the market is not merely pricing nostalgia. It is pricing the collision of a hundred-billion-dollar global mythology with a near-zero surviving physical float. Every formula in the chapters that follow begins right here, on the back of Check #404.",
        ],
        figure: {
          src: "/images/fig02_detective_comics_27.jpg",
          plateNumber: "PLATE 2.3",
          caption:
            "Detective Comics #27 (May 1939): The second sovereign pillar of the Golden Age balance sheet, replicating the Action #1 work-for-hire architecture one year later.",
        },
      },
    ],
  },
  {
    id: "wertham-fraud-civil-rights",
    volume: "VOLUME II: THE MARKET",
    chapter: "Chapter 13",
    title: "Dr. Fredric Wertham: Clinical Fraud vs. Harlem Crusader",
    subtitle: "The Seduction of the Innocent and the 1954 Censorship Bonfires",
    topic: "FORENSIC HISTORICAL AUDIT & PARISH BONFIRES",
    summary:
      "Fredric Wertham is remembered as the villain who nearly destroyed the comic book medium in 1954. Three complete illustrated pages unpacking the paradox of a civil rights pioneer who fabricated clinical data—and accidentally forged six-figure pre-Code scarcity.",
    quote:
      "Wertham was simultaneously an indispensable civil rights hero whose clinic provided the psychological brief that desegregated American schools in Brown v. Board of Education, and a clinical fabulist who doctored patient testimonies to ignite parish comic bonfires.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 2–4",
    readTime: "8 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch13/page_02.jpg",
        pageNumber: 2,
        label: "Chapter 13 • Page 2 — Primary Archive 13.1 (Spencer High Proclamation) & Municipal Newsstand Blacklists",
      },
      {
        src: "/book-pages/ch13/page_03.jpg",
        pageNumber: 3,
        label: "Chapter 13 • Page 3 — The 1948 Parish & Schoolyard Bonfires (Figure 13.1: Phantom Lady #17)",
      },
      {
        src: "/book-pages/ch13/page_04.jpg",
        pageNumber: 4,
        label: "Chapter 13 • Page 4 — Concept 13.2: The Sacrificial Pyre as Symbolic Expulsion",
      },
    ],
    fullExcerpt: [
      "In the spring of 1954, Rinehart & Company published Seduction of the Innocent by Dr. Fredric Wertham, a German-born senior psychiatrist at Bellevue Hospital and director of the Lafargue Clinic in Harlem. The book asserted with clinical certainty that comic books—specifically EC horror, crime, and superhero titles—were the primary epidemiological driver of juvenile delinquency.",
      "The fallout was catastrophic. Within months, municipal councils banned comic sales, Catholic parish priests led church youth groups to parking lots to burn thousands of comic books in mass bonfires, and publishers created the Comics Code Authority.",
    ],
    illustratedPages: [
      {
        pageNumber: 88,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "I. The Lafargue Clinic & The 1954 Senate Crucible",
        paragraphs: [
          "In April 1954, under the glare of live television floodlights inside the United States Courthouse at Foley Square in Lower Manhattan, the Senate Subcommittee on Juvenile Delinquency convened a hearing that would wipe out nearly half of the American comic book industry inside eighteen months. Seated at the witness table was Dr. Fredric Wertham, a German-born senior psychiatrist, veteran of Johns Hopkins and Bellevue Hospital, and author of the newly published bestseller Seduction of the Innocent.",
          "Wertham's thesis was sweeping and absolute: comic books—above all pre-Code crime, horror, and jungle titles—were an epidemiological contagion driving American youth toward violence, sadism, illiteracy, and moral collapse. Across the aisle sat William M. Gaines, the embattled publisher of Entertaining Comics (EC), exhausted, running on Dexedrine, and attempting to defend the artistic integrity of Johnny Craig's severed-head cover for Crime SuspenStories #22.",
          "When Senator Estes Kefauver held Crime SuspenStories #22 up before the cameras and asked whether Gaines considered the image to be in good taste, Gaines answered with fatal honesty: 'Yes, sir, I do—for the cover of a horror comic.' By morning, the exchange ran on front pages nationwide. Wholesale distributors immediately refused to handle EC's line, and terrified publishers scrambled to form a self-policing censorship cartel known as the Comics Code Authority.",
          "Yet comic history has routinely flattened Wertham into a cartoonish right-wing censor, missing the far more unsettling truth. Wertham was no reactionary moralist. In 1946, he co-founded the Lafargue Clinic in the basement of St. Philip's Episcopal Church in Harlem—the first low-cost psychiatric clinic in New York City dedicated to treating Black families shut out of segregated municipal hospitals. In 1951, his clinical testimony in Delaware's Gebhart v. Belton directly informed the Supreme Court's landmark 1954 Brown v. Board of Education desegregation ruling.",
        ],
        figure: {
          src: "/images/fig09_crime_suspenstories_22.jpg",
          plateNumber: "PLATE 13.1",
          caption:
            "Crime SuspenStories #22 (EC Comics, May 1954). Johnny Craig's cover became the televised centerpiece of the April 21, 1954 Foley Square Senate hearings.",
        },
      },
      {
        pageNumber: 89,
        runningHeader: "CHAPTER 13 • THE 1954 CENSORSHIP BONFIRES",
        sectionTitle: "II. Parish Bonfires & The Economics of Supply Destruction",
        paragraphs: [
          "To an actuarial analyst, the 1954–1955 moral panic is not merely a cultural footnote; it is the single most violent supply-shock event in collectible market history. Long before Senate gavels fell, Wertham's serialized magazine articles in Ladies' Home Journal and Reader's Digest had already triggered local ordinances across more than fifty American cities banning the display of crime and horror comics.",
          "In Binghamton, New York; Spencer, West Virginia; and dozens of suburban parishes from Ohio to California, civic leagues, Boy Scout troops, and parochial schools organized public comic book burnings. Children were instructed to haul stacks of pre-Code Fox, EC, Atlas, and Lev Gleason issues into church parking lots and toss them onto gasoline-soaked pyres in exchange for approved Classics Illustrated booklets.",
          "Look at what happened to the supply curve of artists like Matt Baker—the pioneering African American illustrator whose lush 'good girl' anatomy and cinematic lighting defined Fox Feature Syndicate's Phantom Lady #17 (1948). Wertham specifically singled out Phantom Lady #17 in Seduction of the Innocent as proof of moral degeneracy, labeling its cover 'headlights' imagery. Overnight, surviving newsstand copies became contraband inside American households.",
          "Every collector understands scarcity conceptually, but the Comics Code crucible turned cultural suppression into brutal mathematics. Print runs that already suffered 95% attrition from wartime paper drives and ordinary childhood wear underwent a second, intentional purge. The exact titles Wertham condemned by name—Crime SuspenStories #22, Phantom Lady #17, Crime Does Not Pay #22 and #24—were systematically hunted down and incinerated by parents.",
        ],
        figure: {
          src: "/images/fig07_matt_baker_phantom_lady_17.jpg",
          plateNumber: "PLATE 13.2",
          caption:
            "Phantom Lady #17 (Fox Feature Syndicate, April 1948), illustrated by Matt Baker. Directly cited in Seduction of the Innocent, triggering widespread household destruction and extreme modern census rarity.",
        },
        pullQuote:
          "Wertham wanted to erase pre-Code comics from American memory. Instead, his bonfires compressed their surviving census float into six-figure sovereign rarities.",
      },
      {
        pageNumber: 90,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "III. The 2012 Library of Congress Audit & Attrition Alpha",
        paragraphs: [
          "For nearly six decades, historians debated whether Wertham had merely exaggerated his conclusions or crossed the line into outright scientific misconduct. The verdict finally arrived in 2012, when University of Illinois information scholar Carol Tilley opened Wertham's long-sealed personal papers and clinical case notes at the Library of Congress—archives that had remained restricted until thirty years after his death.",
          "Tilley's forensic audit was devastating. Comparing Wertham's raw handwritten interview cards against the published chapters of Seduction of the Innocent, she uncovered systematic fabrication. Wertham altered the ages of juvenile subjects to make them appear younger and more impressionable, merged multiple unrelated youths into single fictionalized composite patients, omitted histories of severe family abuse, and invented verbatim quotations out of whole cloth.",
          "In short, the panic that bankrupted dozens of independent publishers, drove hundreds of working illustrators out of the industry, and permanently reshaped American pop culture was engineered on clinical perjury. A brilliant civil rights advocate had become so consumed by a personal crusade against mass-market comics that he falsified his own evidentiary ledger.",
          "For modern asset underwriters on the Comic Book Stock Exchange, the irony is mathematically measurable. Across the CE70 benchmark, pre-Code Golden Age survivors burned in the twin crucibles of World War II scrap drives and the 1954 Wertham purge exhibit the steepest condition convexity curves in the entire market. When a CGC 9.0+ survivor of a condemned 1942–1954 issue surfaces today, its price reflects seventy years of compound supply destruction—an unintended monument to the bonfires that tried to erase it.",
        ],
        figure: {
          src: "/images/fig04_sub_mariner_wwii.jpg",
          plateNumber: "PLATE 13.3",
          caption:
            "Golden Age wartime & pre-Code attrition: 1940s scrap-paper drives combined with the 1954 Comics Code purge decimated surviving populations across every pre-1955 publisher.",
        },
      },
    ],
  },
  {
    id: "american-mythology-secular-pantheon",
    volume: "VOLUME I: THE ART",
    chapter: "Prologue & Chapter 5",
    title: "Why Comic Books Are America's Only Native Mythology",
    subtitle: "The Secular Pantheon, Industrial Democracy, and The Room Test",
    topic: "CIVILIZATIONAL MYTHOLOGY & ACTUARIAL SOVEREIGNTY",
    summary:
      "Ancient Greece had Olympus; Norse civilization had Asgard; medieval Europe had Arthurian legends. Three complete illustrated pages tracing how first-generation immigrant teenagers forged America's native pantheon on ten-cent acidic newsprint.",
    quote:
      "Ancient Greece carved their gods in Pentelic marble; Renaissance Italy cast theirs in bronze; industrial democratic America printed hers in four-color dot registration on acidic wood pulp for ten cents.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 5–7",
    readTime: "7 min read",
    renderedPageImages: [
      {
        src: "/book-pages/prologue/page_05.jpg",
        pageNumber: 5,
        label: "Prologue • Page 5 — Pop Art, Street Art & The Comic Book Living It Since 1938",
      },
      {
        src: "/book-pages/prologue/page_06.jpg",
        pageNumber: 6,
        label: "Prologue • Page 6 — Sidebar 0.1A: Selected Art Sales for Price Context (Action Comics #1 — $15,000,000)",
      },
      {
        src: "/book-pages/prologue/page_07.jpg",
        pageNumber: 7,
        label: "Prologue • Page 7 — Sidebar 0.1: Economic Framework & Mechanical Reproduction",
      },
    ],
    fullExcerpt: [
      "Every major civilization in human history is anchored by a native, indigenous mythology. The Greeks had the twelve Olympian deities; the Norse had Odin, Thor, and the doom of Ragnarok; Rome had Virgil's Aeneid; Britain had the Arthurian Grail romances. But the United States, founded in the late eighteenth century as an enlightened constitutional republic, possessed no ancient pre-modern pantheon.",
      "Between 1938 and 1941, primarily in small cold-water flats across Brooklyn, the Bronx, and Cleveland, a cadre of first-generation Eastern European Jewish teenagers—Siegel, Shuster, Kirby, Simon, Kane, Finger, Eisner—invented the American mythology out of raw four-color ink and paper.",
    ],
    illustratedPages: [
      {
        pageNumber: 4,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "I. A Republic Without Marble Gods",
        paragraphs: [
          "Every enduring civilization in recorded history has consolidated its identity around an indigenous mythology. Classical Greece carved the twelve Olympians into Pentelic marble and sang them through Homer; medieval Scandinavia bound its fatalism into the Eddas of Odin and Thor; Imperial Rome commissioned Virgil's Aeneid to sanctify its founding; feudal Britain elevated Arthur, Camelot, and the Grail into moral law.",
          "The United States arrived late to history with a constitutional charter, a steam-powered industrial base, and zero ancient pantheon. America possessed no forest nymphs, no bronze-age demigods, and no dynastic bloodlines. What America possessed instead—concentrated inside the tenement corridors of Cleveland, Brooklyn, and the Lower East Side between 1938 and 1941—were four-color rotary presses and the restless sons of Eastern European Jewish immigrants.",
          "Out of those cold-water flats emerged an unprecedented mythic explosion. Jerry Siegel and Joe Shuster imagined an alien orphan rocketed from a dying world to defend the powerless in Metropolis. Bill Finger and Bob Kane forged a nocturnal avenger sworn to wage war on urban corruption. Nine months before the attack on Pearl Harbor, Joe Simon and Jack Kirby put Captain America on the cover of his March 1941 premiere smashing Adolf Hitler across the jaw while isolationists still filled Madison Square Garden.",
          "These were not derivative children's fables. They were the authentic secular gods of industrial democracy—deities who lived not atop Mount Olympus, but behind thick spectacles in newspaper bullpens, inside basement laboratories, and atop rain-slicked Art Deco skyscrapers overlooking concrete streets.",
        ],
        figure: {
          src: "/images/fig03_captain_america_1.jpg",
          plateNumber: "PLATE 5.1",
          caption:
            "Captain America Comics #1 (March 1941, Timely Publications). Joe Simon and Jack Kirby forged an explicit civic mythology nine months prior to America's formal entry into World War II.",
        },
      },
      {
        pageNumber: 5,
        runningHeader: "PROLOGUE & CHAPTER 5 • AMERICA'S NATIVE MYTHOLOGY",
        sectionTitle: "II. Cold-Water Flats & The Bullpen Architects",
        paragraphs: [
          "Two decades after the Golden Age genesis, the American pantheon underwent its second great transformation inside a modest midtown Manhattan office on Madison Avenue. Where the 1938–1941 heroes stood as gleaming civic archetypes, the 1961–1963 Silver Age architects—Jack Kirby, Steve Ditko, and Stan Lee—injected modern existential anxiety directly into the bloodstream of the myth.",
          "Jack Kirby, born Jacob Kurtzberg on Suffolk Street in the Lower East Side, brought kinetic architectural geometry to the page that owed as much to Italian Futurism and German Expressionism as to pulp illustration. His figures burst through panel borders with seismic foreshortening, crackling energy fields ('Kirby Krackle'), and monumental machinery that turned twelve-cent newsstand pamphlets into operatic murals.",
          "Beside him worked Steve Ditko—reclusive, philosophical, and obsessed with psychological interiority. When Ditko drafted the fifteen-year-old Peter Parker in Amazing Fantasy #15 (August 1962), he broke the sacred rule of superhero storytelling: for the first time, the mythic demigod was a financially struggling teenager worried about overdue rent, school bullies, and an ailing aunt in Queens.",
          "Apply what I term 'The Room Test' from Chapter 1 of this monograph: hang an unrestored 1941 Kirby cover or a 1962 Ditko cover on a gallery wall beside a contemporary gallery painting without an explanatory placard. Which object commands instantaneous global recognition across Tokyo, Paris, São Paulo, and New York? The fine-art salon spent eighty years calling comic art 'low pulp,' while the entire human species adopted its iconography as its shared visual language.",
        ],
        figure: {
          src: "/images/fig05_kirby_ditko_portraits.jpg",
          plateNumber: "PLATE 5.2",
          caption:
            "Jack Kirby and Steve Ditko: The principal visual architects of the postwar American pantheon, responsible for the graphic grammar of the Marvel Universe.",
        },
        pullQuote:
          "Ancient Greece carved its gods in Pentelic marble; industrial democratic America printed hers in four-color dot registration on acidic wood pulp for ten cents.",
      },
      {
        pageNumber: 6,
        runningHeader: "PANEL PROFITS • GREGORY D. GOYINS",
        sectionTitle: "III. From Newsstand Pulp to Sovereign Actuarial Assets",
        paragraphs: [
          "Why does cultural mythology matter inside a quantitative financial textbook? Because long-horizon store-of-value assets require two simultaneous conditions that almost never coexist in the same physical object: universal multi-generational demand and permanently inelastic supply.",
          "Gold possesses universal recognition, but new bullion is mined every day. Fine-art masterpieces possess singular supply, yet their liquidity depends on an opaque network of private dealers and fragile authentication consensus. Certified first-appearance comic grails—Action Comics #1, Batman #1, Captain America #1, Amazing Fantasy #15—solve both halves of the equation simultaneously.",
          "Their intellectual property is reinforced every single year by multi-billion-dollar global cinema, streaming, publishing, and merchandise franchises that continuously recruit new generations of ten-year-olds into the mythology at zero marketing cost to the asset holder. Meanwhile, the original first-printing physical artifacts can never be re-minted, are objectively assayed on a standardized decimal scale, and face relentless physical attrition.",
          "That is why the Comic Book Stock Exchange treats certified key issues neither as nostalgic toys nor as speculative memes, but as sovereign cultural equities. Like Attic amphorae or first-folio Shakespeare printings, the surviving genesis texts of America's only native mythology are destined to appreciate alongside the civilization that remembers their gods.",
        ],
        figure: {
          src: "/images/fig06_amazing_fantasy_15.jpg",
          plateNumber: "PLATE 5.3",
          caption:
            "Amazing Fantasy #15 (August 1962) & Batman #1 (Spring 1940): Twin genesis artifacts where universal generational iconography collides with permanently inelastic certified supply.",
          secondarySrc: "/images/fig05_batman_1.jpg",
          secondaryCaption: "Batman #1 (Spring 1940)",
        },
      },
    ],
  },
  {
    id: "banksy-shredder-stunt",
    volume: "VOLUME I: THE ART",
    chapter: "Prologue",
    title: "The Shredder in the Gilded Frame",
    subtitle: "Banksy, Sotheby's, and the Sovereign Illusion of Fine Art",
    topic: "FINE ART PARITY & AUCTION SPECTACLE",
    summary:
      "When Banksy's Girl with Balloon shredded itself on the Sotheby's podium, the art market cheered. Why manufactured performance art pales in comparison to the accidental survival mechanics of rare pulp comics.",
    quote:
      "Banksy built a shredder into a frame to mock Sotheby's, and the collector class immediately renamed it Love is in the Bin and doubled its valuation. But a CGC 9.8 Action Comics #1 didn't require a built-in battery pack to prove its defiance of time.",
    wordCount: "1,450 Words",
    pagesInTextbook: "pp. 12–16",
    readTime: "6 min read",
    fullExcerpt: [
      "On October 5, 2018, the auctioneer's hammer dropped at Sotheby's London on Lot 67: Banksy's 2006 spray-paint and acrylic on canvas, Girl with Balloon. The final hammer price was £1,042,000 ($1.4 million). Seconds later, an alarm chimed from within the Victorian-style gilt frame. A motorized shredder concealed inside the frame began running, slicing the lower half of the canvas into vertical ribbons as it dangled below the moulding.",
      "The room gasped. Security guards rushed the podium. Within forty-eight hours, Sotheby's issued an official press release declaring that a new artwork had been created on their stage: Love is in the Bin. The European female collector proceeded with the purchase. Three years later, in October 2021, that exact shredded canvas returned to Sotheby's and hammered for £18.5 million ($25.4 million)—an eighteen-fold return on an engineered gag.",
      "The Sotheby's stunt reveals the supreme pathology of the post-war European and American contemporary art market: value is generated not by material scarcity or empirical survival curves, but by institutional collusive consensus. The frame was custom-machined with a battery that had to be replaced; the performance was pre-cleared by gatekeepers who understood that spectacle is the supreme currency of late-stage salon capitalism.",
      "Now contrast this with an unrestored, certified comic book: Action Comics #1, Detective Comics #27, or Captain America Comics #1. Two hundred thousand copies rolled off the high-speed four-color rotary presses of Eastern Color Printing in Waterbury, Connecticut. They were printed on groundwood pulp containing thirty percent unrefined lignin—an acidic wood polymer designed to brown and self-combust within decades.",
      "Ninety-nine percent were burned in parish censorship bonfires, collected in municipal wartime paper salvages for munitions drives, or discarded into municipal incinerators. When a single pristine copy emerges eighty-five years later with white pages, unrusted staples, and an intact spine, it has not survived because an auction house engineered a motorized gimmick. It has survived against physical chemistry, against world wars, and against parental purges. That is not spectacle. That is actuarial rarity.",
    ],
  },
  {
    id: "warhol-comic-appropriation",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 18",
    title: "The Pop Vitrine & The 36-Inch Squeegee",
    subtitle: "How Andy Warhol Extracted Millions From Cheap Wood Pulp",
    topic: "POP ART APPROPRIATION & FACTORY LABOR",
    summary:
      "In 1961, Andy Warhol placed comic book panels in Bonwit Teller luxury department store windows. The forensic truth of how Pop Art appropriated working-class comic ephemera while traditional museums locked out the original creators.",
    quote:
      "When you seal a comic book inside an ultrasonic plastic slab with a microchamber zeolitic sheet, you are performing the exact gesture Andy Warhol performed in 1964 with the Brillo Boxes. You are declaring that the commercial pulp of industrial democracy is the permanent, sacred monument of our civilization.",
    wordCount: "1,680 Words",
    pagesInTextbook: "pp. 14–22",
    readTime: "7 min read",
    fullExcerpt: [
      "In April 1961, Andy Warhol took over the display windows of the Bonwit Teller luxury department store on 57th Street in Manhattan. Behind glamorous mannequins dressed in designer silk suits, Warhol hung five hand-painted canvases based on cheap mass-market advertisements and newspaper comic strips: Superman, Popeye, Saturday's Popeye, Before and After, and Advertisement.",
      "The high-society shoppers strolling down Fifth Avenue recognized the icons immediately, but they were presented in the sanctified vitrine of Fifth Avenue haute couture. Warhol's maneuver was predatory and brilliant: he recognized that the American consumer unconscious was entirely colonized by four-color sequential characters, yet the formal art establishment treated the source pamphlets as disposable trash.",
      "Within twelve months, Warhol transitioned from hand-painting comic panels to photographic silkscreening. At The Factory on East 47th Street, alongside Gerard Malanga, Warhol flooded 36-inch silkscreens with industrial acrylic paint, dragging the rubber squeegee across canvas again and again, deliberately introducing misregistrations, ink bleed, and half-tone sludge.",
      "The tragic irony of Pop Art is that Warhol, Roy Lichtenstein, and Mel Ramos became multi-millionaire darlings of sovereign museum boards by blowing up the exact compositions drawn by uncredited, impoverished bullpen illustrators like Russ Heath, Tony Abruzzo, and Irv Novick. Lichtenstein was paid hundreds of thousands of dollars for Whaam!—a direct copy of Irv Novick's panel from All-American Men of War #89—while Novick received a freelance page rate of twenty-four dollars.",
      "For sixty years, the fine art academy insisted that the silkscreen on canvas was 'high art' and the underlying comic book was 'low pulp.' But the actuarial ledger has finally settled the score: certified comic grails trade with higher capital velocity, lower counterfeit volatility, and stricter objective forensic grading than post-war contemporary canvases.",
    ],
  },
  {
    id: "dali-disney-destino",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 20",
    title: "The Surrealist Convergence: Salvador Dalí Meets Walt Disney",
    subtitle: "Destino, Dream Architecture, and the Comic Slab as Surrealist Object",
    topic: "SURREALISM & SEQUENTIAL DREAMSCAPES",
    summary:
      "In 1945, Salvador Dalí walked onto the Walt Disney studio lot in Burbank to co-create Destino. Why sequential panel grammar is the purest manifestation of Breton's paranoiac-critical surrealism.",
    quote:
      "When you take a ten-cent comic book printed on cheap newsprint, enclose it in virgin optical acrylic, sonically weld it shut at forty kilohertz, and crown it with a decimal grade, you are creating the supreme twentieth-century Surrealist Object: a pure, non-consumable financial and cultural talisman.",
    wordCount: "1,620 Words",
    pagesInTextbook: "pp. 110–118",
    readTime: "7 min read",
    fullExcerpt: [
      "In late 1945, Salvador Dalí signed a contract with Walt Disney to spend three months working in the Burbank animation studios. The project was Destino, a surrealist short film based on a Mexican ballad by Armando Dominguez. For eight months, Dalí worked alongside Disney studio artist John Hench, producing twenty-two oil paintings and one hundred and thirty-five storyboard sketches.",
      "The collaboration was eventually shelved by Roy Disney for budgetary reasons, but the creative premise remains a historic milestone in aesthetic history. Dalí recognized what the European fine art academy refused to admit: sequential animation and comic book paneled sequencing represented the absolute realization of André Breton's 1924 Surrealist Manifesto.",
      "In a traditional painting, space is static. In a comic book, time is spatialized across the page grid. The white gutters between panels represent what Nick Sousanis calls 'the unflattened void'—the psychological gap where the viewer's subconscious is forced to synthesize closure. Dalí understood that comic books are not low-brow pulp for children; they are architectural storyboards of the dream state.",
      "Consider the modern comic slab: an issue of Vault of Horror #12 or Weird Science #16, sealed inside a hermetically sonically welded acrylic capsule. You cannot turn its pages. You cannot read its speech bubbles. You cannot feel its newsprint. It has been completely alienated from its original industrial utility as a magazine.",
      "In doing so, the collector has turned the comic book into the ultimate Surrealist Readymade—surpassing Marcel Duchamp's urinal or Meret Oppenheim's fur-covered teacup. It is an impossible object: a story that cannot be read, sealed in a vault, valued purely for its preserved condition grade.",
    ],
  },
];
