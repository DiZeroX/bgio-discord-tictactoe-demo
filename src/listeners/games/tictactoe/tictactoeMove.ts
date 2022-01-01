import { Listener } from '@sapphire/framework';
import type { Interaction } from 'discord.js';

export class UserEvent extends Listener {
	public constructor(context: Listener.Context, options: Listener.Options) {
		super(context, {
			...options,
			event: 'interactionCreate'
		});
	}

	public async run(interaction: Interaction) {
		if (interaction.isSelectMenu() && interaction.customId.includes('ttt_move')) {
			await interaction.deferUpdate();
			const matchID = interaction.customId.substring(9);
			const game = this.container.games[matchID];
			const playerID = game.playerIDs[interaction.user.id];
			const selectedMove = parseInt(interaction.values[0], 10) - 1;
			game.playerClients[playerID].moves.clickCell(selectedMove);
			await game.board?.edit(game.constructBoardMessage(game.bgioGameClient.getState()));
		}
	}
}
