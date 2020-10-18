import type { Patch } from "immer";

export interface User {
  /**
   * @minLength 1
   * @maxLength 100
   */
  id: string;

  /**
   * @minLength 1
   * @maxLength 100
   */
  ggId: string;
}

interface Challenge {
  /**
   * @minLength 1
   * @maxLength 100
   */
  id: string;

  /**
   * @minimum 1
   * @maximum 5
   */
  round: number;

  timeLimit?: number;

  roundStartTime?: number;

  participants: {
    /**
     * @minLength 1
     * @maxLength 100
     */
    id: string;
    /**
     * @minLength 1
     * @maxLength 100
     */
    gameId: string;
  }[];
}

/**
 * @validate
 */
export interface ServerState {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;

  currentChallenge?: Challenge;

  /**
   * @minLength 1
   * @maxLength 100
   */
  ownerId: string;

  /**
   * @uniqueItems true
   */
  users: User[];
}

/**
 * @validate
 */
export interface ClientState {
  /**
   * @minLength 1
   * @maxLength 100
   */
  id: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  ggId: string;
  ready?: {
    /**
     * @minLength 1
     * @maxLength 100
     */
    challengeId: string;
    /**
     * @minLength 1
     * @maxLength 100
     */
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
  | { type: "set-client-state"; payload: ClientState }
  | {
      type: "client-state-patch";
      /**
       * @minItems 1
       */
      payload: Patch[];
    };
