module.exports = {
  type: undefined, // 1 | 2 | 3
  name: "help",
  description: "General Bot Help",
  options: undefined,
  commands: undefined,
  dm_permission: false,
  default_permission: null,
  async execute() {
    const [interaction, ...rest] = arguments;
    // console.log(interaction, rest);
    return interaction.reply("This bot uses a ganache blockchain to manage user accounts and tokens. No tokens on this system are real, or worth actual money.");
  }
};
