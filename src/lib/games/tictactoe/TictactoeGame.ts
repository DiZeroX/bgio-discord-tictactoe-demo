import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { PlayerID } from 'boardgame.io';
import { TTTBgioGame, CustomSetupData, TicTacToeState } from './TTTBgioGame';
import type { ClientState, _ClientImpl } from 'boardgame.io/dist/types/src/client/client';
import { GuildMember, Message, MessageActionRow, MessageSelectMenu, MessageSelectOptionData, TextChannel } from 'discord.js';

export class TictactoeGame {
	public playerIDs: { [key: string]: PlayerID }; // Map of Discord user IDs to Bg.io player IDs
	public playerClients: { [key: PlayerID]: _ClientImpl };
	public bgioGameClient: _ClientImpl; // Client instance to retrieve gameState from
	public board: Message | null; // Reference to Discord message containing board content

	private dmMessages: { [key: PlayerID]: Message }; // Map of references to DMs that bot has sent to Discord users, so that they can be edited in the future
	private channel: TextChannel; // Reference to Discord server channel that game is running in, so that new messages can be sent
	private members: { [key: PlayerID]: GuildMember }; // Map of references to Discord users by Bg.io player IDs

	public constructor(memberList: GuildMember[], gmID: string, channel: TextChannel) {
		this.channel = channel;
		this.board = null;
		this.dmMessages = {};

		this.playerIDs = {};
		this.members = {};
		memberList.forEach((member, index) => {
			const indexString = index.toString();
			this.playerIDs[member.id] = indexString;
			this.members[indexString] = member;
		});

		const customData: CustomSetupData = {
			channel,
			gmID,
			members: this.members
		};
		const game = TTTBgioGame(customData);
		const numPlayers = memberList.length;
		const clients = memberList.map((member) =>
			Client({
				game,
				numPlayers,
				multiplayer: Local(),
				playerID: this.playerIDs[member.id],
				matchID: channel.id
			})
		);

		this.playerClients = {};
		memberList.forEach((member, index) => (this.playerClients[this.playerIDs[member.id]] = clients[index]));
		const [client] = clients;
		this.bgioGameClient = client;
	}

	public async init() {
		this.start();
		await this.setupGameUI();
	}

	public stop() {
		Object.values(this.playerClients).forEach((client) => client.stop());
	}

	public constructBoardMessage(clientState: ClientState<TicTacToeState>) {
		const cells = clientState?.G.cells ?? [];
		const currentPlayer = clientState?.ctx.currentPlayer;
		return `${this.constructBoardFromCells(cells)}Current Player: ${currentPlayer}`;
	}

	public editMovesMessages(G: TicTacToeState) {
		const { cells } = G;
		const actionRow = this.constructMovesFromCells(cells);
		Object.values(this.dmMessages).forEach((dmMessage) => {
			void dmMessage.edit({ components: [actionRow] });
		});
	}

	private start() {
		Object.values(this.playerClients).forEach((client) => client.start());
	}

	private async setupGameUI() {
		const clientState: ClientState<TicTacToeState> = this.bgioGameClient.getState();
		const cells = clientState?.G.cells;
		if (!cells) return;
		const actionRow = this.constructMovesFromCells(cells);

		await Object.values(this.members).forEach(async (member) => {
			const message = await member.send({ content: 'Select move', components: [actionRow] });
			this.dmMessages[this.playerIDs[member.id]] = message;
		});

		const boardContent = `${this.constructBoardFromCells(cells)}Current Player: ${clientState.ctx.currentPlayer}`;

		this.board = await this.channel.send({ content: boardContent });
	}

	/* [
		{ value: '1', label: '1', description: '(1,1)' },
		{ value: '2', label: '2', description: '(1,2)' },
		{ value: '3', label: '3', description: '(1,3)' },
		{ value: '4', label: '4', description: '(2,1)' },
		{ value: '5', label: '5', description: '(2,2)' },
		{ value: '6', label: '6', description: '(2,3)' },
		{ value: '7', label: '7', description: '(3,1)' },
		{ value: '8', label: '8', description: '(3,2)' },
		{ value: '9', label: '9', description: '(3,3)' }
	] */
	private constructMovesFromCells(cells: (string | null)[]) {
		const options: MessageSelectOptionData[] = [];
		cells.forEach((cell, index) => {
			if (cell === null) {
				const optionValue = (index + 1).toString();
				const coordinateX = Math.floor(index / 3) + 1;
				const coordinateY = (index % 3) + 1;
				options.push({
					value: optionValue,
					label: optionValue,
					description: `(${coordinateX}, ${coordinateY})`
				});
			}
		});
		const movesComponent = new MessageSelectMenu().setCustomId(`ttt_move_${this.channel.id}`).setOptions(options);
		return new MessageActionRow().addComponents(movesComponent);
	}

	private constructBoardFromCells(cells: (string | null)[]) {
		return `${cells[0]} | ${cells[1]} | ${cells[2]}\n${cells[3]} | ${cells[4]} | ${cells[5]}\n${cells[6]} | ${cells[7]} | ${cells[8]}\n`;
	}
}
