const { 
  Client, 
  GatewayIntentBits, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  ChannelType, 
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1478436958119268462";
const GUILD_ID = "1458889992628867196";

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName('opgave')
    .setDescription('Opret en opgave')
    .addStringOption(option =>
      option.setName('tekst')
        .setDescription('Beskriv opgaven')
        .setRequired(true))
].map(cmd => cmd.toJSON());

// Register command
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Slash command registreret');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logget ind som ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {

  // SLASH COMMAND
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'opgave') {

      // 🔒 ADMIN CHECK
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: '❌ Kun admins kan oprette opgaver',
          ephemeral: true
        });
      }

      const tekst = interaction.options.getString('tekst');

      const button = new ButtonBuilder()
        .setCustomId(`take_task_${tekst}`)
        .setLabel('Tag opgave')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        content: `📌 Opgave:\n${tekst}`,
        components: [row]
      });
    }
  }

  // BUTTONS
  if (interaction.isButton()) {

    // TAG OPGAVE
    if (interaction.customId.startsWith('take_task_')) {

      const user = interaction.user;
      const tekst = interaction.customId.replace('take_task_', '');

      // Opret kanal
      const channel = await interaction.guild.channels.create({
        name: `opgave-${user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          },
          {
            id: interaction.guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.Administrator))?.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          }
        ],
      });

      // 🔘 Luk knap (kun admins)
      const closeButton = new ButtonBuilder()
        .setCustomId('close_task')
        .setLabel('Opgave fuldført')
        .setStyle(ButtonStyle.Danger);

      const closeRow = new ActionRowBuilder().addComponents(closeButton);

      await channel.send({
        content: `📌 **Opgave:**\n${tekst}\n\nVelkommen ${user} 👋`,
        components: [closeRow]
      });

      // 🧹 Slet opgave besked
      await interaction.message.delete();
    }

    // LUK OPGAVE
    if (interaction.customId === 'close_task') {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: '❌ Kun admins kan lukke opgaven',
          ephemeral: true
        });
      }

      await interaction.reply({ content: '🔒 Lukker opgave...', ephemeral: true });

      setTimeout(() => {
        interaction.channel.delete();
      }, 1000);
    }
  }
});


client.login(TOKEN);
