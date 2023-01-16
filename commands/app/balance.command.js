const ethers = require("ethers");

module.exports = {
  type: undefined, // 1 | 2 | 3
  name: "balance",
  description: "Check your balance.",
  options: undefined, // we can add an option here that is optional for the currency of choice(if you enable more than one.)
  commands: undefined,
  dm_permission: false,
  default_permission: null,
  async execute() {
    const [interaction, ...rest] = arguments;
    // console.log(interaction, rest);
    // Our standard reply to the balance command.
    const isOwner = () => {
      return interaction.user.id === process.env.OWNER_ID; // '392835171206037504'//  //Add OWNER_ID(Discord User ID) in the .env file.
    };
    if (this.userAccounts.has(interaction.user.id) || isOwner()) {
      const userAccount = this.userAccounts.get(interaction.user.id);
      if (isOwner()) {
        // console.log(this.accounts);
        const serverAccounts = await this.accounts;
        // serverAccounts[0]
        const balance = await this._provider.getBalance(serverAccounts[0]); //'0x7bb2b2201fd7d973addb9d2aa05eef558b07e17b'
        // console.log("Admin Call to Balance", balance);
        return interaction.reply("Balance : " + `${balance / 1e18}`);
      }

      const accountType = "main";
      switch (accountType) {
        case "token":
          /**
          *  Here we can write code to handle any tokens we allow created on our chain.
          */

          break;
        default:
          /**
          * Here we handle the logic for the primary network token we created.
          */
          const userBalance = await this._provider.getBalance(userAccount.address);

          return interaction.reply(
            "Balance : " + `${userBalance > 0 ? userBalance / 1e18 : 0}`
          );
      }
    } else {
      await this.addAccount(interaction.user.id);
      return interaction.reply("You have no balance.");
    }
  }
};
