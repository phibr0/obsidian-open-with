import { normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import open from "open";

interface AppPair {
	name: string;
	code: string;
	arguments: string;
}
interface OpenWithSettings {
	apps: AppPair[];
}

const DEFAULT_SETTINGS: OpenWithSettings = {
	apps: [],
}

export default class OpenWithPlugin extends Plugin {
	settings: OpenWithSettings;

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		this.addSettingTab(new OpenWithSettingTab(this));

		this.addCommand({
			id: "copy-absolute-file-path",
			name: "Copy absolute Path of File to clipboard",
			checkCallback: (checking: boolean) => {
				let file = this.app.workspace.getActiveFile()
				if (file) {
					if (!checking) {
						navigator.clipboard.writeText(this.getAbsolutePathOfFile(file));
					}
					return true;
				}
				return false;
			}
		});

		this.settings.apps.forEach(app => {
			this.addCommand({
				id: "open-file-with-" + app.name.toLowerCase(),
				name: "Open File with " + app.name,
				checkCallback: (checking: boolean) => {
					let file = this.app.workspace.getActiveFile();
					if (file) {
						if (!checking) {
							open(this.getAbsolutePathOfFile(file), {
								app: {
									name: app.code,
									arguments: app.arguments.split(","),
								}
							});
						}
						return true;
					}
					return false;
				}
			});
		})
	}

	getAbsolutePathOfFile(file: TFile) {
		//@ts-ignore
		return normalizePath(`${this.app.vault.adapter.basePath}/${file.path}`);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
class OpenWithSettingTab extends PluginSettingTab {
	plugin: OpenWithPlugin;

	constructor(plugin: OpenWithPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Open with Plugin' });

		new Setting(containerEl)
			.setName("Add new application")
			.setClass("OW-setting-item")
			.setDesc("Add a new application to open files with. You need to use the application path or command (for example \"code\" for VSCode) and arguments need to be comma seperated.")
			.addText(cb => {
				cb.inputEl.addClass("OW-name");
				cb.setPlaceholder("Display Name");
			})
			.addText(cb => {
				cb.inputEl.addClass("OW-code");
				cb.setPlaceholder("Path/Command");
			})
			.addText(cb => {
				cb.inputEl.addClass("OW-args");
				cb.setPlaceholder("Arguments (optional)");
			})
			.addButton(btn => {
				btn.setButtonText("+")
					.onClick(async () => {
						//@ts-ignore
						const name = document.querySelector(".OW-name").value;
						//@ts-ignore
						const code = document.querySelector(".OW-code").value;
						//@ts-ignore
						const args = document.querySelector(".OW-args").value;
						if (name && code) {
							this.plugin.addCommand({
								id: "open-file-with-" + name.toLowerCase(),
								name: "Open File with " + name,
								checkCallback: (checking: boolean) => {
									let file = this.app.workspace.getActiveFile();
									if (file) {
										if (!checking) {
											open(this.plugin.getAbsolutePathOfFile(file), {
												app: {
													name: code,
													arguments: args.split(","),
												}
											});
										}
										return true;
									}
									return false;
								}
							});
							this.plugin.settings.apps.push({ name, code, arguments: args });
							await this.plugin.saveSettings();
							this.display();
						} else {
							new Notice("Display Name & Path/Command are always neccessary.");
						}
					});
			});

		this.plugin.settings.apps.forEach(app => {
			new Setting(containerEl)
				.setName(app.name)
				.setDesc(`Command: ${app.code}${app.arguments ? ` | Arguments: ${app.arguments}` : ""}`)
				.addButton(btn => {
					btn.setIcon("trash")
						.setTooltip("Remove")
						.onClick(async () => {
							new Notice("You need to restart Obsidian for these changes to take effect.");
							this.plugin.settings.apps.remove(app);
							await this.plugin.saveSettings();
							this.display();
						});
				});
		});
	}
}
