// Platform → Wells mapping for Dragon Oil field
// Used in the cascading platform/well dropdowns in JobDialog

export interface PlatformEntry {
  platform: string;
  wells: string[];
}

export const PLATFORM_WELLS: PlatformEntry[] = [
  {
    platform: 'LAM-4',
    wells: ['4', '8', '187D'],
  },
  {
    platform: 'LAM-10',
    wells: ['10', '51', '52', '53', '56', '57', '110', '111', '112', '113', '114', '115'],
  },
  {
    platform: 'LAM-63',
    wells: ['55', '63', '64', '65', '67', '85'],
  },
  {
    platform: 'LAM-75',
    wells: ['75', '76', '77', '78', '79', '93'],
  },
  {
    platform: 'LAM-13',
    wells: [
      '96', '116', '118A', '133A', '135', '138A', '140A', '143', '144C',
      '160A', '163', '168A', '171B', '199A', '200A', '234', '236A', '239A', '240',
    ],
  },
  {
    platform: 'LAM-21',
    wells: [
      '62A', '106', '107A', '108A', '109', '117', '132A',
      '180B', '181C', '207B', '208A', '210A',
    ],
  },
  {
    platform: 'LAM-22',
    wells: [
      '22', '101', '102', '103', '104', '105', '124',
      '126', '128', '130', '188A', '194',
    ],
  },
  {
    platform: 'LAM-A',
    wells: [
      '119', '121A', '122', '123', '125B', '127A', '129C', '131A',
      '139', '142', '162A', '165A', '176A', '177C', '189A', '190C', '206B', '242A',
    ],
  },
  {
    platform: 'LAM-B',
    wells: [
      '141A', '145A', '148A', '150C', '153', '155A', '157A',
      '159C', '202', '203', '219A', '220A', '224C', '227',
    ],
  },
  {
    platform: 'LAM-C',
    wells: [
      '167A', '170B', '173', '175B', '183A', '184A', '185', '186',
      '191A', '195B', '198C', '201E', '243', '244D',
    ],
  },
  {
    platform: 'LAM-E',
    wells: [
      '214A', '216A', '221', '223C', '225A', '226',
      '228A', '233', '237C', '245', '246',
    ],
  },
  {
    platform: 'LAM-F',
    wells: ['204', '205', '209', '212A', '229', '230', '231'],
  },
  {
    platform: 'LAM-28',
    wells: [
      '120', '134A', '136A', '137B', '146', '147', '149', '151A', '152', '154',
      '156A', '158', '161', '164', '166', '169', '172', '174', '178A', '179',
      '182', '192B', '193B', '196', '197C', '211B', '213', '215', '217A', '218B',
      '222A', '247D',
    ],
  },
  {
    platform: 'LAM-WIT-1',
    wells: ['232', '235'],
  },
  {
    platform: 'LAM-WIT-3',
    wells: ['238', '241'],
  },
  {
    platform: 'ZHD-A',
    wells: [
      '102C', '103A', '104B', '105', '106A', '108B',
      '111', '112A', '113A', '114', '116',
    ],
  },
  {
    platform: 'ZHD-50',
    wells: ['109', '110A'],
  },
  {
    platform: 'ZHD-21',
    wells: ['51', '53', '101', '107'],
  },
  {
    platform: 'ZHD-100',
    wells: ['115', '117'],
  },
  {
    platform: 'CHD-A',
    wells: ['001A', '002', '003A', '004'],
  },
];

/** All platform names in order */
export const PLATFORM_NAMES = PLATFORM_WELLS.map(p => p.platform);

/** Get wells for a given platform name */
export function getWellsForPlatform(platform: string): string[] {
  return PLATFORM_WELLS.find(p => p.platform === platform)?.wells ?? [];
}
