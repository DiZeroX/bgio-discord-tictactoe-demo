import { ApplyOptions } from '@sapphire/decorators';
import { SubCommandPluginCommand, SubCommandPluginCommandOptions } from '@sapphire/plugin-subcommands';
import { send } from '@sapphire/plugin-editable-commands';
import type { Args } from '@sapphire/framework';
import { Message, TextChannel } from 'discord.js';
import { TictactoeGame } from '../../lib/games/tictactoe/TictactoeGame';

@ApplyOptions<SubCommandPluginCommandOptions>({
	aliases: ['ttt'],
	description: 'Play TicTacToe',
	subCommands: [{ input: 'play', default: true }, 'end']
})
export class UserCommand extends SubCommandPluginCommand {
	public async play(message: Message, args: Args) {
		const { channelId } = message;
		if (!(message.channel instanceof TextChannel)) {
			return send(message, 'Use this command in a text channel.');
		}
		if (Object.keys(this.container.games).includes(channelId)) {
			return send(message, 'Game already in progress.');
		}

		const memberList = await args.repeat('member', { times: 2 });

		this.container.games[channelId] = new TictactoeGame(memberList, message.author.id, message.channel as TextChannel);
		await this.container.games[channelId].init();
	}

	public async end(message: Message) {
		const { channelId } = message;
		this.container.games[channelId].stop();
		delete this.container.games[channelId];
		return send(message, 'Game ended.');
	}
}
