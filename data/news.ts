export type NewsLink = {
  title: string;
  outlet: string;
  date: string | null;
  href: string;
};

const facilityNews: Record<string, NewsLink[]> = {
  "dynamo-springdale": [
    {
      title: "Springdale data center plan goes to Allegheny County review",
      outlet: "Public Source",
      date: null,
      href: "https://www.publicsource.org/springdale-data-center-county-saldo-review/",
    },
    {
      title:
        "Residents urge Allegheny County to reject Springdale data center based on noise, pollution",
      outlet: "90.5 WESA",
      date: "October 15, 2026",
      href: "https://www.wesa.fm/environment-energy/2026-10-15/allegheny-county-springdale-data-center-noise-pollution",
    },
    {
      title: "Springdale residents hold public hearing to oppose proposed data center",
      outlet: "WTAE",
      date: null,
      href: "https://www.wtae.com/article/springdale-public-hearing-oppose-data-center/74278895",
    },
  ],
  "henderson-road-data-center": [
    {
      title: "Data center, gas plant proposed in Elizabeth Township",
      outlet: "Public Source",
      date: null,
      href: "https://www.publicsource.org/elizabeth-township-data-center-gas-plant/",
    },
    {
      title:
        "Elizabeth Township data center proposal still in early stages after contentious town hall",
      outlet: "WTAE",
      date: null,
      href: "https://www.wtae.com/article/elizabeth-township-data-center-town-hall/74126499",
    },
  ],
  "sei-allegheny": [],
  "mckees-rocks-industrial-site-data-center": [
    {
      title: "No data center planned in Stowe Township, officials say",
      outlet: "Public Source",
      date: null,
      href: "https://www.publicsource.org/stowe-commissioners-say-no-data-center-planned/",
    },
    {
      title: "Zoning ordinance opens door for data centers in Stowe Township",
      outlet: "West Hills Gazette",
      date: null,
      href: "https://westhillsgazette.com/zoning-ordinance-opens-door-for-data-centers-in-stowe-township/",
    },
    {
      title: "Ready or Not, A Data Center Boom is Coming to the Pittsburgh Region",
      outlet: "Pittsburgh Magazine",
      date: null,
      href: "https://www.pittsburghmagazine.com/data-centers-pennsylvania/",
    },
  ],
  "365-pittsburgh": [
    {
      title:
        "DataBank acquires Cleveland and Pittsburgh data centers from 365 Data Centers",
      outlet: "Data Center Dynamics",
      date: "February 1, 2017",
      href: "https://www.datacenterdynamics.com/en/news/databank-acquires-cleveland-and-pittsburgh-data-centers-from-365-data-centers/",
    },
  ],
  "ascent-pittsburgh": [],
  "aspstation-pittsburgh": [],
  "centerserv-pittsburgh": [],
  "citynet-pittsburgh": [],
  "cogent-pittsburgh": [],
  "consolidated-communications-pittsburgh": [],
  "databank-pittsburgh": [
    {
      title:
        "DataBank acquires Cleveland and Pittsburgh data centers from 365 Data Centers",
      outlet: "Data Center Dynamics",
      date: "February 1, 2017",
      href: "https://www.datacenterdynamics.com/en/news/databank-acquires-cleveland-and-pittsburgh-data-centers-from-365-data-centers/",
    },
    {
      title: "DataBank to double the size of data center in Pittsburgh, PA",
      outlet: "Data Center Dynamics",
      date: "May 25, 2018",
      href: "https://www.datacenterdynamics.com/en/news/databank-to-double-the-size-of-data-center-in-pittsburgh-pa/",
    },
  ],
  "dqe-pittsburgh": [],
  "edgeconnex-pit01": [],
  "expedient-pittsburgh": [
    {
      title:
        "Wary of data center boom, Pittsburgh and Allegheny County proceed with caution",
      outlet: "TribLive",
      date: null,
      href: "https://triblive.com/business/wary-of-data-center-boom-pittsburgh-and-allegheny-county-proceed-with-caution/",
    },
  ],
  "h5-data-centers-pittsburgh": [],
  "im-critical-pittsburgh": [
    {
      title: "iM Critical plans Pittsburgh data center campus",
      outlet: "Data Center Dynamics",
      date: "April 27, 2022",
      href: "https://www.datacenterdynamics.com/en/news/im-critical-plans-pittsburgh-data-center-campus/",
    },
    {
      title:
        "Tech company scheduled to hear from public about data center additions asks for extension",
      outlet: "WPXI",
      date: "September 17, 2026",
      href: "https://www.wpxi.com/news/local/tech-company-scheduled-hear-public-about-data-center-additions-asks-extension-instead/6GOYU45GUJDHZEURIDTIX4PBKU/",
    },
  ],
  "lumen-pittsburgh": [],
  "msa-evergreen-heights": [],
  "northern-data-ardent-pit1": [
    {
      title: "Northern Data launches data center in Pittsburgh, Pennsylvania",
      outlet: "Data Center Dynamics",
      date: "June 8, 2025",
      href: "https://www.datacenterdynamics.com/en/news/northern-data-launches-data-center-in-pittsburgh-pennsylvania/",
    },
    {
      title: "Ardent closes on acquisition of data center in Pittsburgh, Pennsylvania",
      outlet: "Data Center Dynamics",
      date: "January 23, 2024",
      href: "https://www.datacenterdynamics.com/en/news/ardent-closes-on-acquisition-of-data-center-in-pittsburgh-pennsylvania/",
    },
  ],
  "tarentum-rockpointe": [],
  "teraswitch-networks-pittsburgh": [],
};

export function newsFor(slug: string): NewsLink[] {
  return facilityNews[slug] ?? [];
}

export function newsSlugs(): string[] {
  return Object.keys(facilityNews);
}
