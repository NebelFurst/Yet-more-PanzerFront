import { CampaignMission } from '../types/game';

export interface CampaignDefinition {
  id: string;
  name: string;
  terrain: 'city' | 'forest' | 'open';
  mapSize: number;
  allies: number;
  enemies: number;
  holdSeconds: number;
  features: string[];
  briefing: string;
  mission: Omit<CampaignMission, 'currentKills' | 'isCompleted'>;
}

const objective = (id: string, name: string, x: number, y: number) => ({
  id, name, x, y, radius: 180, captureProgress: 0, isCaptured: false,
});

export const CAMPAIGNS: CampaignDefinition[] = [
  {
    id: 'city_defence', name: 'City Defence', terrain: 'city', mapSize: 2400,
    allies: 5, enemies: 8, holdSeconds: 75,
    features: ['Dense urban cover', 'Timed headquarters defence', 'Northern enemy waves'],
    briefing: 'Hold headquarters against the enemy advance. Time only counts inside the uncontested defence zone; destroy the attacking armor to secure the city.',
    mission: {
      id: 'city_defence', missionNumber: 1, title: 'Hold the City Headquarters', type: 'defend_city',
      description: 'Hold HQ uncontested for 75 seconds and destroy 6 enemy tanks.',
      targetKills: 6, objectives: [objective('headquarters', 'City Headquarters', 0, 0)], rewardCredits: 18000,
    },
  },
  {
    id: 'city_assault', name: 'City Assault', terrain: 'city', mapSize: 3600,
    allies: 6, enemies: 11, holdSeconds: 0,
    features: ['Street-grid combat', 'Two fortified sectors', 'Contested capture zones'],
    briefing: 'Break into the city and take both fortified sectors. Use the streets to flank armor, clear defenders, and occupy each zone for ten seconds.',
    mission: {
      id: 'city_assault', missionNumber: 1, title: 'Capture the City', type: 'combined_offensive',
      description: 'Capture the rail station and civic square, then destroy 8 enemy tanks.',
      targetKills: 8, objectives: [objective('station', 'Rail Station', 720, -650), objective('square', 'Civic Square', -600, -1100)], rewardCredits: 28000,
    },
  },
  {
    id: 'forest_ambush', name: 'Forest Ambush', terrain: 'forest', mapSize: 4800,
    allies: 4, enemies: 10, holdSeconds: 0,
    features: ['Dense woodland', 'Armor-hunting objective', 'Limited allied support'],
    briefing: 'Hunt enemy armor in a wide forest sector. Trees provide destructible cover, while fewer allies make careful flanking and repairs essential.',
    mission: {
      id: 'forest_ambush', missionNumber: 1, title: 'Break the Armored Column', type: 'kill_tanks',
      description: 'Destroy 12 enemy tanks in the forest sector.', targetKills: 12, objectives: [], rewardCredits: 24000,
    },
  },
  {
    id: 'open_breakthrough', name: 'Open Breakthrough', terrain: 'open', mapSize: 6600,
    allies: 8, enemies: 14, holdSeconds: 0,
    features: ['Largest battlefield', 'Sparse cover / long sightlines', 'Distant strongpoints'],
    briefing: 'Cross a broad, exposed battlefield and capture the enemy strongpoints. Long-range cannons and fast tanks excel, but open ground leaves little protection.',
    mission: {
      id: 'open_breakthrough', missionNumber: 1, title: 'Pierce the Frontline', type: 'combined_offensive',
      description: 'Capture two distant strongpoints and destroy 10 enemy tanks.', targetKills: 10,
      objectives: [objective('ridge', 'Forward Ridge', 1450, -1200), objective('depot', 'Enemy Supply Depot', -1300, -2250)], rewardCredits: 36000,
    },
  },
];

export function createCampaignMission(campaign: CampaignDefinition, stage: number): CampaignMission {
  const targetKills = campaign.mission.targetKills + stage * 2;
  const holdSeconds = campaign.holdSeconds + stage * 15;
  return {
    ...campaign.mission,
    id: `${campaign.id}_${stage + 1}`,
    missionNumber: stage + 1,
    title: `${campaign.mission.title} · Phase ${stage + 1}`,
    description: campaign.holdSeconds
      ? `Hold HQ uncontested for ${holdSeconds} seconds and destroy ${targetKills} enemy tanks.`
      : `${campaign.mission.objectives.length ? 'Capture every marked sector and d' : 'D'}estroy ${targetKills} enemy tanks.`,
    targetKills, currentKills: 0, isCompleted: false,
    rewardCredits: campaign.mission.rewardCredits + stage * 5000,
    objectives: campaign.mission.objectives.map(location => ({ ...location })),
  };
}
