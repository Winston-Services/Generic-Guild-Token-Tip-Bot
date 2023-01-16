module.exports = {
  type: undefined, // 1 | 2 | 3
  name: "admin-accounts",
  description: "List of accounts.",
  options: undefined,
  commands: undefined,
  dm_permission: false,
  default_permission: 8,
  async execute() {
    const [interaction, ...rest] = arguments;
    // console.log(interaction, rest);
    const accounts = await this.accounts; //This should display our generated accounts in the console.
    return interaction.reply(
      "This bot uses a ganache blockchain to manage user accounts and tokens.\n" +
        "No tokens on this system are real, or worth actual money.\n" +
        "The following are the admin accounts setup with this bot." +
        "To access the private keys you will need access to the server the program is hosted on.\n> " + 
        accounts.join("\n> ")
    );
  }
};
