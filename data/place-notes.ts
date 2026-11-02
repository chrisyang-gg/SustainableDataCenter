export const countyPropertyRule = {
  title: "County-owned property",
  text: "County Council passed ordinance file 14044-26 on September 22, 2026. It prohibits a large-load data center, defined as an estimated peak demand of 25 megawatts or more, and the accessory facilities that serve one, on property Allegheny County owns and in buildings the county owns. Zoning on private land stays with the municipality. The council file was still marked awaiting the county executive’s signature.",
  sources: [
    {
      label: "Allegheny County Council file 14044-26",
      href: "https://allegheny.legistar.com/LegislationDetail.aspx?ID=8185928&GUID=4E029642-D0E0-44EE-B870-A55B47749759",
    },
  ],
};

export const placeNotes: Record<
  string,
  { title: string; text: string; sources: { label: string; href: string }[] }
> = {
  "springdale-borough": {
    title: "Conditional use at the Cheswick site",
    text: "On December 16, 2025, borough council granted a conditional use under zoning section 490-16C for the data center proposed at 151 Porter Street, the former Cheswick power station. A county review of the land-development application records that approval, along with six dimensional variances granted on December 6, 2025.",
    sources: [
      {
        label: "County land-development review",
        href: "https://www.alleghenycounty.us/files/assets/county/v/1/government/economic-development/documents/springdale/borough-review-1.pdf",
      },
    ],
  },
};
