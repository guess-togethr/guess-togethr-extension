import type { Patch } from "immer";

export interface User {
  /**
   * @minLength 1
   */
  publicKey: string;

  /**
   * @minLength 1
   */
  ggId: string;
}

interface Challenge {
  id: string;

  /**
   * @minimum 1
   * @maximum 5
   */
  round: number;

  timeLimit?: number;

  roundStartTime?: number;

  participants: { id: string; gameId: string }[];
}

/**
 * @validate
 */
export interface ServerState {
  name: string;

  currentChallenge?: Challenge;

  ownerPublicKey: string;

  /**
   * @uniqueItems true
   */
  users: User[];
}

/**
 * @validate
 */
export interface ClientState {
  id: string;
  ggId: string;
  ready?: {
    challengeId: string;
    gameId: string;
    /**
     * @minimum 1
     * @maximum 5
     */
    challengeRound: number;
  };
}

// type JSONPatch =
//   | {
//       path: string[];
//       op: "add" | "replace" | "test";
//       value: any;
//     }
//   | {
//       path: string[];
//       op: "remove";
//     }
//   | {
//       path: string[];
//       op: "move" | "copy";
//       from: string[];
//     };

/**
 * @validate
 */
export type ServerMessage =
  | {
      type: "set-server-state";
      payload: ServerState;
    }
  | {
      type: "server-state-patch";

      /**
       * @minItems 1
       */
      payload: Patch[];
    };

/**
 * @validate
 */
export type ClientMessage =
  | { type: "join"; payload: User }
  | { type: "set-client-state"; payload: ClientState }
  | {
      type: "client-state-patch";
      /**
       * @minItems 1
       */
      payload: Patch[];
    };
