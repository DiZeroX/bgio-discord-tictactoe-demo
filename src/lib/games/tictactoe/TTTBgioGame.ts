import { container } from '@sapphire/framework';
import type { GuildMember, TextChannel } from 'discord.js';
import type { Game, PlayerID } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';

export interface TicTacToeState {
	cells: (null | string)[];
	gmID: string;
	forceGameEnd: boolean;
}

export interface CustomSetupData {
	channel: TextChannel;
	gmID: string;
	members: { [key: PlayerID]: GuildMember };
}

const initialTTTState = (customData: CustomSetupData): TicTacToeState => ({
	cells: Array(9).fill(null),
	gmID: customData.gmID,
	forceGameEnd: false
});

export const TTTBgioGame = (customData: CustomSetupData): Game<TicTacToeState> => {
	return {
		setup: () => initialTTTState(customData),

		turn: {
			moveLimit: 1
		},

		moves: {
			clickCell: (G, ctx, id: number) => {
				if (G.cells[id] !== null) {
					return INVALID_MOVE;
				}
				G.cells[id] = ctx.currentPlayer;
				container.games[customData.channel.id].editMovesMessages(G);
			},
			endGame: (G, ctx) => {
				if (ctx.playerID === G.gmID) {
					console.log('Game was force ended.');
					return { ...G, forceGameEnd: true };
				}
				console.log('Force game end failed.');
				return { ...G };
			}
		},

		endIf: (G, ctx) => {
			if (G.forceGameEnd) {
				return { draw: true };
			}
			if (IsVictory(G.cells)) {
				return { winner: ctx.currentPlayer };
			}
			if (IsDraw(G.cells)) {
				return { draw: true };
			}
			return undefined;
		},

		onEnd: (G) => {
			const { channel } = customData;
			container.games[channel.id].stop();
			delete container.games[channel.id];
			void channel.send('Thank you for playing!');
			return { ...G };
		},

		ai: {
			enumerate: (G) => {
				const moves = [];
				for (let i = 0; i < 9; i++) {
					if (G.cells[i] === null) {
						moves.push({ move: 'clickCell', args: [i] });
					}
				}
				return moves;
			}
		}
	};
};

/** Return true if `cells` is in a winning configuration. */
function IsVictory(cells: (string | null)[]): boolean {
	const positions = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6]
	];

	const isRowComplete = (row: number[]): boolean => {
		const symbols = row.map((i) => cells[i]);
		return symbols.every((i) => i !== null && i === symbols[0]);
	};

	return positions.map(isRowComplete).some((i) => i);
}

/** Return true if all `cells` are occupied. */
function IsDraw(cells: (null | string)[]): boolean {
	return cells.filter((c) => c === null).length === 0;
}
