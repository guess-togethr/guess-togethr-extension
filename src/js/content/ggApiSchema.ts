/**
 * @validate
 */
export interface GeoguessrGame {
  token: string;
  mapName: string;
  round: number;
  player: {
    totalScore: {
      amount: string;
    };
    pin: {
      url: string;
    };
    id: string;
    guesses: {
      lat: number;
      lng: number;
      roundScore: { amount: string; unit: string };
      timedOut: boolean;
    }[];
  };
}
